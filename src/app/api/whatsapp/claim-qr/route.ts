import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Called by the SE WhatsApp webhook (the Muttaqin Chatbot) when someone messages
 * the SE number. Three modes, all keyed on the sender's phone:
 *
 * - `claim` (default) — first delivery. If that phone belongs to a WhatsApp-route
 *   registrant still waiting for their QR, mark it delivered and return the card
 *   so the webhook can send it inside the now-open 24h window.
 * - `lookup` — a *follow-up* ("where is my QR", "hantar semula"). Returns every
 *   card registered to that phone regardless of the pending flag, and does not
 *   change any state. One phone can carry several registrations (a household
 *   registering together), so this returns a list.
 * - `release` — puts the pending flag back; the webhook calls this if the actual
 *   WhatsApp send fails, so the card isn't lost.
 *
 * Auth: `Authorization: Bearer <WA_CLAIM_SECRET>`.
 */

/** Cards returned to the webhook. */
interface CardPayload {
  name: string;
  serial_code: string;
  qr_card_url: string;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.WA_CLAIM_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !provided) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Cards SE staff can hand out are capped so one phone can't pull an unbounded list. */
const MAX_CARDS = 5;

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let phone: string;
  let release = false;
  let mode: string | undefined;
  let serial_code: string | undefined;
  try {
    ({ phone, release = false, mode, serial_code } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const phone8 = String(phone ?? "").replace(/\D/g, "").slice(-8);
  if (phone8.length !== 8) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  // `release: true` predates `mode` — the deployed chatbot still sends it.
  const action = release ? "release" : mode === "lookup" ? "lookup" : "claim";

  // Undo a claim whose downstream WhatsApp send failed, so the card isn't lost.
  if (action === "release") {
    if (!serial_code) {
      return NextResponse.json({ error: "serial_code required to release" }, { status: 400 });
    }
    await serviceClient
      .from("participants")
      .update({ wa_qr_pending: true })
      .eq("phone", phone8)
      .eq("serial_code", serial_code);
    return NextResponse.json({ released: true });
  }

  // Follow-up: hand back whatever this number has already registered. Read-only —
  // the card can be asked for as many times as the participant needs it.
  if (action === "lookup") {
    const { data: rows } = await serviceClient
      .from("participants")
      .select("full_name, serial_code, qr_card_url")
      .eq("phone", phone8)
      .not("qr_card_url", "is", null)
      .order("created_at", { ascending: true })
      .limit(MAX_CARDS);

    const cards: CardPayload[] = (rows ?? []).map((r) => ({
      name: r.full_name,
      serial_code: r.serial_code,
      qr_card_url: r.qr_card_url as string,
    }));

    return NextResponse.json({ found: cards.length > 0, cards });
  }

  const { data: candidate } = await serviceClient
    .from("participants")
    .select("id")
    .eq("phone", phone8)
    .eq("reg_channel", "whatsapp")
    .eq("wa_qr_pending", true)
    .not("qr_card_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!candidate) {
    return NextResponse.json({ found: false });
  }

  // Conditional update = claim exactly once even under concurrent inbound messages.
  const { data: claimed } = await serviceClient
    .from("participants")
    .update({ wa_qr_pending: false })
    .eq("id", candidate.id)
    .eq("wa_qr_pending", true)
    .select("full_name, serial_code, qr_card_url")
    .maybeSingle();

  if (!claimed) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    name: claimed.full_name,
    serial_code: claimed.serial_code,
    qr_card_url: claimed.qr_card_url,
  });
}
