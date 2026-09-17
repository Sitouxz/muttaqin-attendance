import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";
import { getActingAdmin } from "@/lib/auth/admin";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { addDays } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { SGT_TIMEZONE } from "@/lib/utils/constants";

/** Constant-time bearer check, matching the pattern in whatsapp/claim-qr. */
function isCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !provided) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  // Auth: an active admin, or Authorization: Bearer CRON_SECRET
  let authorized = isCronRequest(request);
  let actingEmail: string | null = null;

  if (!authorized) {
    const admin = await getActingAdmin();
    if (admin) {
      authorized = true;
      actingEmail = admin.email;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /**
   * The settings page posts {test: true} behind a "Send Test Email" button.
   * That flag was never read, so the button sent the real reminder to every
   * opted-in participant. A test now goes to the signed-in admin only.
   */
  const body = await request.json().catch(() => ({}));
  const testOnly = body?.test === true;

  if (testOnly && !actingEmail) {
    return NextResponse.json({ error: "NO_TEST_RECIPIENT" }, { status: 400 });
  }

  // Find next session within 7 days
  const nowSGT = toZonedTime(new Date(), SGT_TIMEZONE);
  const todayStr = formatInTimeZone(nowSGT, SGT_TIMEZONE, "yyyy-MM-dd");
  const sevenDaysLaterStr = formatInTimeZone(
    addDays(nowSGT, 7),
    SGT_TIMEZONE,
    "yyyy-MM-dd"
  );

  const { data: upcomingSession } = await serviceClient
    .from("sessions")
    .select("id, session_date, title, start_time, end_time")
    .in("status", ["active", "draft"])
    .gte("session_date", todayStr)
    .lte("session_date", sevenDaysLaterStr)
    .order("session_date", { ascending: true })
    .limit(1)
    .single();

  if (!upcomingSession) {
    return NextResponse.json({ sent: 0, errors: [], message: "No upcoming session found" });
  }

  // Fetch opted-in active participants — or, for a test, just the admin asking.
  const { data: allParticipants } = await serviceClient
    .from("participants")
    .select("full_name, email, qr_image_url")
    .eq("is_active", true)
    .eq("email_consent", true)
    .not("email", "is", null);

  const participants = testOnly
    ? [{ full_name: "Test Reminder", email: actingEmail, qr_image_url: null }]
    : allParticipants;

  const errors: string[] = [];
  let sent = 0;

  for (const participant of participants ?? []) {
    if (!participant.email) continue;
    try {
      await sendReminderEmail({
        participant: {
          full_name: participant.full_name,
          email: participant.email,
          qr_image_url: participant.qr_image_url,
        },
        session: upcomingSession,
      });
      sent++;
    } catch (err) {
      errors.push(
        `${participant.email}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return NextResponse.json({ sent, errors, test: testOnly });
}

/**
 * Vercel Cron invokes the scheduled path with GET, so the weekly reminder in
 * vercel.json has been hitting a route that only answered POST — a 405 every
 * Thursday, and no reminder ever sent.
 *
 * This door takes the CRON_SECRET bearer token and nothing else. It
 * deliberately does NOT fall back to an admin session the way POST does: a
 * GET that sends bulk email and trusts a session cookie is cross-site
 * triggerable (an <img src> on any page an admin visits would mail every
 * participant). A browser cannot set this header cross-origin.
 */
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return POST(request);
}
