import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { formatInTimeZone } from "date-fns-tz";
import { SGT_TIMEZONE } from "@/lib/utils/constants";

// Launch-day monitoring is meant to be live — never serve a cached snapshot.
export const revalidate = 0;

/** Windows the UI offers, in hours. */
const ALLOWED_WINDOWS = [24, 168, 720] as const;

/**
 * Per-source row cap for the window queries. The page is a live operations
 * view, not an export: capping keeps one hammered refresh from pulling the
 * whole table. `truncated` tells the UI when a cap was hit.
 */
const WINDOW_ROW_CAP = 2000;

/** Events handed to the client for the merged feed. */
const FEED_LIMIT = 200;

/** Cap on the all-time attendance scan used for the distinct-attendee count. */
const ATTENDEE_SCAN_CAP = 20000;

type EventType = "registration" | "check_in" | "qr_request" | "qr_verified";

interface ActivityEvent {
  id: string;
  type: EventType;
  at: string;
  name: string;
  serial: string | null;
  channel: string | null;
  summary: string;
  detail: string | null;
  colour: string | null;
  operator: string | null;
}

/** Supabase embeds come back as an object or a single-element array. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const CHECK_IN_METHOD_TEXT: Record<string, string> = {
  qr_scan: "QR scan",
  manual: "Manual entry",
  walk_in: "Walk-in",
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requested = Number(request.nextUrl.searchParams.get("hours"));
  const hours = (ALLOWED_WINDOWS as readonly number[]).includes(requested)
    ? requested
    : 24;
  const now = new Date();
  const since = new Date(now.getTime() - hours * 3_600_000).toISOString();

  const [
    registrationsRes,
    checkInsRes,
    otpRes,
    adminsRes,
    attendeeRes,
    totalRes,
    qrDeliveredRes,
    qrMissingRes,
    waPendingRes,
    emailChannelRes,
    waChannelRes,
    unsyncedRes,
    activeSessionsRes,
  ] = await Promise.all([
    serviceClient
      .from("participants")
      .select(
        "id, full_name, serial_code, reg_channel, created_at, wa_qr_pending, qr_card_url, qr_image_url"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(WINDOW_ROW_CAP),
    serviceClient
      .from("attendance")
      .select(
        "id, checked_in_at, check_in_method, is_synced, checked_in_by, participants(full_name, serial_code, reg_channel), programmes(name, colour), sessions(session_date, title)"
      )
      .gte("checked_in_at", since)
      .order("checked_in_at", { ascending: false })
      .limit(WINDOW_ROW_CAP),
    serviceClient
      .from("otp_requests")
      .select("id, email, created_at, used_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(WINDOW_ROW_CAP),
    serviceClient.from("admins").select("id, full_name"),
    serviceClient.from("attendance").select("participant_id").limit(ATTENDEE_SCAN_CAP),
    serviceClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    serviceClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .or("qr_card_url.not.is.null,qr_image_url.not.is.null"),
    serviceClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("qr_card_url", null)
      .is("qr_image_url", null),
    serviceClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("wa_qr_pending", true),
    serviceClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("reg_channel", "email"),
    serviceClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("reg_channel", "whatsapp"),
    serviceClient
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("is_synced", false),
    serviceClient
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const registrations = registrationsRes.data ?? [];
  const checkIns = checkInsRes.data ?? [];
  const otpRequests = otpRes.data ?? [];

  /**
   * A failed query would otherwise read as a genuine zero — the one thing a
   * monitoring page must never do. Collect the failures and let the UI say so.
   */
  const failures: string[] = [];
  const labelled: [string, { error: { message: string } | null }][] = [
    ["registrations", registrationsRes],
    ["check-ins", checkInsRes],
    ["QR retrieval requests", otpRes],
    ["operators", adminsRes],
    ["attendee totals", attendeeRes],
    ["participant total", totalRes],
    ["QR delivery total", qrDeliveredRes],
    ["missing-QR count", qrMissingRes],
    ["WhatsApp pending count", waPendingRes],
    ["email channel total", emailChannelRes],
    ["WhatsApp channel total", waChannelRes],
    ["unsynced check-ins", unsyncedRes],
    ["active sessions", activeSessionsRes],
  ];
  for (const [label, res] of labelled) {
    if (res.error) failures.push(`${label}: ${res.error.message}`);
  }

  // otp_requests only stores an email, so resolve the names in one extra query.
  const otpEmails = Array.from(
    new Set(otpRequests.map((r) => r.email).filter(Boolean))
  );
  const otpNames = new Map<string, { full_name: string; serial_code: string }>();
  if (otpEmails.length > 0) {
    const { data: otpParticipants } = await serviceClient
      .from("participants")
      .select("email, full_name, serial_code")
      .in("email", otpEmails);
    for (const p of otpParticipants ?? []) {
      if (p.email) otpNames.set(p.email, { full_name: p.full_name, serial_code: p.serial_code });
    }
  }

  const adminNames = new Map<string, string>();
  for (const a of adminsRes.data ?? []) adminNames.set(a.id, a.full_name);

  // --- Merged activity feed -------------------------------------------------
  const events: ActivityEvent[] = [];

  for (const r of registrations) {
    const viaWhatsapp = r.reg_channel === "whatsapp";
    const delivered = Boolean(r.qr_card_url ?? r.qr_image_url);
    events.push({
      id: `registration:${r.id}`,
      type: "registration",
      at: r.created_at,
      name: r.full_name,
      serial: r.serial_code,
      channel: r.reg_channel,
      summary: viaWhatsapp ? "Registered via WhatsApp" : "Registered via email",
      detail: r.wa_qr_pending
        ? "QR card waiting for the registrant to message the SE number"
        : delivered
          ? "QR card generated"
          : "QR card not generated yet",
      colour: viaWhatsapp ? "#25D366" : "#3B82F6",
      operator: null,
    });
  }

  for (const c of checkIns) {
    const participant = one(c.participants);
    const programme = one(c.programmes);
    const sessionRow = one(c.sessions);
    const detailParts = [
      sessionRow?.title ?? (sessionRow?.session_date ? `Session ${sessionRow.session_date}` : null),
      CHECK_IN_METHOD_TEXT[c.check_in_method] ?? c.check_in_method,
      c.is_synced ? null : "awaiting offline sync",
    ].filter(Boolean);
    events.push({
      id: `check_in:${c.id}`,
      type: "check_in",
      at: c.checked_in_at,
      name: participant?.full_name ?? "Unknown participant",
      serial: participant?.serial_code ?? null,
      channel: participant?.reg_channel ?? null,
      summary: programme ? `Checked in — ${programme.name}` : "Checked in",
      detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
      colour: programme?.colour ?? "#10B981",
      operator: c.checked_in_by ? adminNames.get(c.checked_in_by) ?? "Unknown operator" : null,
    });
  }

  for (const o of otpRequests) {
    const known = otpNames.get(o.email);
    events.push({
      id: `qr_request:${o.id}`,
      type: "qr_request",
      at: o.created_at,
      name: known?.full_name ?? o.email,
      serial: known?.serial_code ?? null,
      channel: "email",
      summary: "Requested a QR retrieval code",
      detail: known ? null : "No participant matches this email",
      colour: "#735b29",
      operator: null,
    });
    if (o.used_at) {
      events.push({
        id: `qr_verified:${o.id}`,
        type: "qr_verified",
        at: o.used_at,
        name: known?.full_name ?? o.email,
        serial: known?.serial_code ?? null,
        channel: "email",
        summary: "Retrieved their QR code",
        detail: null,
        colour: "#8B5CF6",
        operator: null,
      });
    }
  }

  events.sort((a, b) => b.at.localeCompare(a.at));
  const feed = events.slice(0, FEED_LIMIT);

  // --- Time buckets ---------------------------------------------------------
  const granularity: "hour" | "day" = hours <= 24 ? "hour" : "day";
  const stepMs = granularity === "hour" ? 3_600_000 : 86_400_000;
  const bucketCount = granularity === "hour" ? hours : hours / 24;
  const keyFormat = granularity === "hour" ? "yyyy-MM-dd HH" : "yyyy-MM-dd";
  const labelFormat = granularity === "hour" ? "HH:00" : "d MMM";

  interface Bucket {
    key: string;
    label: string;
    registrations: number;
    check_ins: number;
    qr_retrievals: number;
  }
  const buckets: Bucket[] = [];
  const bucketByKey = new Map<string, Bucket>();
  for (let i = bucketCount - 1; i >= 0; i--) {
    const at = new Date(now.getTime() - i * stepMs);
    const key = formatInTimeZone(at, SGT_TIMEZONE, keyFormat);
    const bucket: Bucket = {
      key,
      label: formatInTimeZone(at, SGT_TIMEZONE, labelFormat),
      registrations: 0,
      check_ins: 0,
      qr_retrievals: 0,
    };
    buckets.push(bucket);
    bucketByKey.set(key, bucket);
  }

  function bucketFor(at: string): Bucket | undefined {
    return bucketByKey.get(formatInTimeZone(new Date(at), SGT_TIMEZONE, keyFormat));
  }

  for (const r of registrations) {
    const bucket = bucketFor(r.created_at);
    if (bucket) bucket.registrations++;
  }
  for (const c of checkIns) {
    const bucket = bucketFor(c.checked_in_at);
    if (bucket) bucket.check_ins++;
  }
  for (const o of otpRequests) {
    if (!o.used_at) continue;
    const bucket = bucketFor(o.used_at);
    if (bucket) bucket.qr_retrievals++;
  }

  // --- Behaviour breakdowns -------------------------------------------------
  const methodCounts: Record<string, number> = { qr_scan: 0, manual: 0, walk_in: 0 };
  const operatorCounts = new Map<string, { name: string; count: number; last_at: string }>();
  for (const c of checkIns) {
    methodCounts[c.check_in_method] = (methodCounts[c.check_in_method] ?? 0) + 1;
    const key = c.checked_in_by ?? "unattributed";
    const name = c.checked_in_by
      ? adminNames.get(c.checked_in_by) ?? "Unknown operator"
      : "Unattributed (scanner)";
    const existing = operatorCounts.get(key);
    if (existing) {
      existing.count++;
      if (c.checked_in_at > existing.last_at) existing.last_at = c.checked_in_at;
    } else {
      operatorCounts.set(key, { name, count: 1, last_at: c.checked_in_at });
    }
  }
  const operators = Array.from(operatorCounts.values()).sort((a, b) => b.count - a.count);

  const windowChannels = { email: 0, whatsapp: 0 };
  for (const r of registrations) {
    if (r.reg_channel === "whatsapp") windowChannels.whatsapp++;
    else windowChannels.email++;
  }

  // --- Funnel ---------------------------------------------------------------
  const attendeeIds = new Set((attendeeRes.data ?? []).map((row) => row.participant_id));
  const totalParticipants = totalRes.count ?? 0;
  const qrDelivered = qrDeliveredRes.count ?? 0;
  const attended = attendeeIds.size;

  const funnel = [
    { stage: "Registered", count: totalParticipants },
    { stage: "QR issued", count: qrDelivered },
    { stage: "Checked in at least once", count: attended },
  ].map((step) => ({
    ...step,
    pct: totalParticipants > 0 ? Math.round((step.count / totalParticipants) * 100) : 0,
  }));

  const qrRetrievalsVerified = otpRequests.filter((o) => o.used_at).length;

  return NextResponse.json({
    generated_at: now.toISOString(),
    window_hours: hours,
    granularity,
    failures,
    truncated:
      registrations.length >= WINDOW_ROW_CAP ||
      checkIns.length >= WINDOW_ROW_CAP ||
      otpRequests.length >= WINDOW_ROW_CAP,
    kpis: {
      registrations: registrations.length,
      check_ins: checkIns.length,
      qr_requests: otpRequests.length,
      qr_retrievals: qrRetrievalsVerified,
    },
    totals: {
      participants: totalParticipants,
      qr_delivered: qrDelivered,
      attended,
      never_attended: Math.max(0, totalParticipants - attended),
      channels: {
        email: emailChannelRes.count ?? 0,
        whatsapp: waChannelRes.count ?? 0,
      },
    },
    alerts: {
      wa_qr_pending: waPendingRes.count ?? 0,
      qr_missing: qrMissingRes.count ?? 0,
      unsynced_check_ins: unsyncedRes.count ?? 0,
      active_sessions: activeSessionsRes.count ?? 0,
    },
    funnel,
    buckets,
    check_in_methods: methodCounts,
    window_channels: windowChannels,
    operators,
    feed,
  });
}
