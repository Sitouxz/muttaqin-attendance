import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Called by the SE WhatsApp webhook (the Muttaqin Chatbot) when someone messages
 * the SE number. If that phone belongs to a WhatsApp-route registrant still
 * waiting for their QR, this marks it delivered and returns the card so the
 * webhook can send it inside the now-open 24h window.
 *
 * Auth: `Authorization: Bearer <WA_CLAIM_SECRET>`.
 */

function authorized(req: NextRequest): boolean {
  const secret = process.env.WA_CLAIM_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !provided || secret.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(provided));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let phone: string;
  try {
    ({ phone } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const phone8 = String(phone ?? "").replace(/\D/g, "").slice(-8);
  if (phone8.length !== 8) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
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
