import { NextRequest, NextResponse } from "next/server";
import { RetrieveQrWhatsAppSchema } from "@/lib/validations/participant";
import { serviceClient } from "@/lib/supabase/service";
import { uploadQrAssets } from "@/lib/qr/assets";
import { isWhatsAppConfigured } from "@/lib/whatsapp/client";
import { MAX_QR_CARDS_PER_PHONE, sendQrWhatsApp } from "@/lib/whatsapp/send-qr";

/**
 * "Dapatkan QR Saya" for people who registered over WhatsApp — they have no
 * email, so the OTP route in `../route.ts` can never reach them.
 *
 * The email route needs an OTP because it renders the card on screen for
 * whoever asked. This one never does: the card is only ever delivered to the
 * WhatsApp account on the number that was typed in, so holding the phone *is*
 * the check. The response deliberately carries no card URL, name or serial —
 * a wrong number learns nothing beyond "that number is registered".
 *
 * When business-initiated WhatsApp isn't available (no approved template
 * configured, or Twilio rejects the send), the registrant is re-armed as
 * `wa_qr_pending` and the page falls back to the inbound-first path: they
 * message the SE number and the chatbot hands the card over through
 * `/api/whatsapp/claim-qr`.
 */

/**
 * Best-effort per-phone cooldown. Serverless instances don't share this map, so
 * it is a speed bump against an accidental double-tap or casual spamming of a
 * stranger's phone, not a security control.
 */
const COOLDOWN_MS = 60_000;
const lastSentAt = new Map<string, number>();

function onCooldown(phone: string): boolean {
  const previous = lastSentAt.get(phone);
  const now = Date.now();
  // Drop expired entries opportunistically so the map can't grow unbounded.
  for (const [key, at] of lastSentAt) {
    if (now - at > COOLDOWN_MS) lastSentAt.delete(key);
  }
  if (previous && now - previous < COOLDOWN_MS) return true;
  lastSentAt.set(phone, now);
  return false;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RetrieveQrWhatsAppSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const { phone } = parsed.data;

  const { data: participants } = await serviceClient
    .from("participants")
    .select("id, full_name, phone, serial_code, qr_token, qr_card_url, reg_channel")
    .eq("phone", phone)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(MAX_QR_CARDS_PER_PHONE);

  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: "PHONE_NOT_FOUND" }, { status: 404 });
  }

  if (onCooldown(phone)) {
    return NextResponse.json({ error: "TOO_SOON" }, { status: 429 });
  }

  let sent = 0;
  /**
   * Rows to put back on the inbound-first path. Only WhatsApp-route
   * registrants belong there: `wa_qr_pending` also drives the admin "QR
   * pending" badge, and flagging an email-route registrant would read as a
   * WhatsApp delivery still owed to someone who never asked for one. Their
   * fallback is the same wa.me prompt — the chatbot lookup returns any card on
   * the number regardless of channel or flag.
   */
  const rearm: string[] = [];

  for (const participant of participants) {
    // A registration whose card upload failed at the time still has a token, so
    // regenerate rather than leaving the person with nothing to retrieve.
    let cardUrl = participant.qr_card_url;
    if (!cardUrl) {
      try {
        const urls = await uploadQrAssets(participant);
        cardUrl = urls.qr_card_url;
        await serviceClient
          .from("participants")
          .update({ qr_image_url: urls.qr_image_url, qr_card_url: urls.qr_card_url })
          .eq("id", participant.id);
      } catch (err) {
        console.error("[retrieve-qr/whatsapp] card generation failed:", err);
        if (participant.reg_channel === "whatsapp") rearm.push(participant.id);
        continue;
      }
    }

    const result = isWhatsAppConfigured()
      ? await sendQrWhatsApp({
          participant_id: participant.id,
          full_name: participant.full_name,
          phone: participant.phone,
          serial_code: participant.serial_code,
          qr_card_url: cardUrl,
        })
      : { delivered: false as const };

    if (result.delivered) {
      sent += 1;
    } else if (participant.reg_channel === "whatsapp") {
      rearm.push(participant.id);
    }
  }

  if (rearm.length > 0) {
    await serviceClient
      .from("participants")
      .update({ wa_qr_pending: true })
      .in("id", rearm);
  }

  if (sent === 0) {
    // Nothing went out, so the cooldown would only block the person's retry.
    lastSentAt.delete(phone);
    return NextResponse.json({ status: "awaiting_whatsapp" });
  }

  return NextResponse.json({ status: "sent", count: sent });
}
