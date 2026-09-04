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
 *   Header:  Media (image)  -> {{1}}   (the QR card URL)
 *   Body:    "Pendaftaran anda telah berjaya. Nombor rujukan anda ialah {{2}}.
 *             Sila simpan kod QR ini dan tunjukkannya semasa pendaftaran."
 *
 * Set TWILIO_QR_TEMPLATE_SID to its Content SID (HX...) to activate sending.
 * If SE's approved template uses different variable slots, adjust
 * `contentVariables` below to match.
 */

export interface WhatsAppQrResult {
  delivered: boolean;
  reason?: "not_configured" | "send_failed";
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

  const client = getTwilioClient();
  const from = requireEnv("TWILIO_WHATSAPP_NUMBER"); // whatsapp:+65...
  const templateSid = requireEnv("TWILIO_QR_TEMPLATE_SID");
  const contentVariables = JSON.stringify({
    1: participant.qr_card_url, // media header
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
