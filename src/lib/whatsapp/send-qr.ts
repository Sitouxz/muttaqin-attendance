import { getTwilioClient, isWhatsAppConfigured, requireEnv, toWhatsAppAddress } from "./client";

/**
 * Sends the branded QR card to a participant over WhatsApp, and (best-effort) a
 * copy to Santunan Emas so staff have the same record — Twilio has no BCC, so
 * the copy is a second message.
 *
 * A registration QR is a business-initiated message with media, which WhatsApp
 * only allows through a Meta-approved template. Build it with
 * `scripts/whatsapp-template-setup.mjs` — an image-header UTILITY template:
 *
 *   Header:  Media (image)  -> `${WHATSAPP_CARD_MEDIA_BASE}{{1}}`
 *   Body:    "Pendaftaran anda telah berjaya. Nombor rujukan anda ialah {{2}}.
 *             Sila simpan kod QR ini dan tunjukkannya semasa pendaftaran."
 *
 * Set TWILIO_QR_TEMPLATE_SID to its Content SID (HX...) to activate sending.
 */

/**
 * Static prefix of the approved template's media header. Meta validates a media
 * variable as a path suffix under a fixed prefix, not as a whole URL, so `{{1}}`
 * carries only the card's filename.
 *
 * This is baked into the approved template — it MUST stay identical to
 * MEDIA_BASE in `scripts/whatsapp-template-setup.mjs`. Changing the bucket or
 * the `cards/` prefix means re-submitting the template for approval.
 */
export const WHATSAPP_CARD_MEDIA_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/qr-codes/cards/`;

/**
 * The `{{1}}` value: the card's filename within the template's media prefix.
 * Returns null when the stored URL doesn't sit under that prefix, so a
 * mismatched send fails loudly here rather than as a Twilio 63030 later.
 */
export function cardMediaVariable(qrCardUrl: string): string | null {
  if (!qrCardUrl.startsWith(WHATSAPP_CARD_MEDIA_BASE)) return null;
  const suffix = qrCardUrl.slice(WHATSAPP_CARD_MEDIA_BASE.length);
  return suffix && !suffix.includes("/") ? suffix : null;
}

export interface WhatsAppQrResult {
  delivered: boolean;
  reason?: "not_configured" | "send_failed" | "bad_media_url";
  error?: string;
  sid?: string;
}

export async function sendQrWhatsApp(participant: {
  full_name: string;
  phone: string;
  serial_code: string;
  qr_card_url: string;
}): Promise<WhatsAppQrResult> {
  if (!isWhatsAppConfigured()) {
    return { delivered: false, reason: "not_configured" };
  }

  const media = cardMediaVariable(participant.qr_card_url);
  if (!media) {
    const error = `card URL is not under the approved template prefix: ${participant.qr_card_url}`;
    console.error("[wa-qr]", error);
    return { delivered: false, reason: "bad_media_url", error };
  }

  const client = getTwilioClient();
  const from = requireEnv("TWILIO_WHATSAPP_NUMBER"); // whatsapp:+65...
  const templateSid = requireEnv("TWILIO_QR_TEMPLATE_SID");
  const contentVariables = JSON.stringify({
    1: media, // media header: filename under WHATSAPP_CARD_MEDIA_BASE
    2: participant.serial_code, // body: nombor rujukan
  });

  try {
    const msg = await client.messages.create({
      from,
      to: toWhatsAppAddress(participant.phone),
      contentSid: templateSid,
      contentVariables,
    });

    // Copy to SE — non-fatal.
    const notify = process.env.SE_WHATSAPP_NOTIFY_NUMBER;
    if (notify) {
      await client.messages
        .create({
          from,
          to: toWhatsAppAddress(notify),
          contentSid: templateSid,
          contentVariables,
        })
        .catch((err) => console.error("[wa-qr] SE copy failed:", err));
    }

    return { delivered: true, sid: msg.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown";
    console.error("[wa-qr] send failed:", error);
    return { delivered: false, reason: "send_failed", error };
  }
}
