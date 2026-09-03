import { getTwilioClient, isWhatsAppConfigured, requireEnv, toWhatsAppAddress } from "./client";

/**
 * Sends the branded QR card to a participant over WhatsApp, and (best-effort) a
 * copy to Santunan Emas so staff have the same record — Twilio has no BCC, so
 * the copy is a second message.
 *
 * A registration QR is a business-initiated message with media, which WhatsApp
 * only allows through an approved template. The template must be built in the
 * Twilio Content Template Builder as an image-header template whose header media
 * and body text are variables:
 *
 *   Header:  Media (image)  -> {{1}}   (the QR card URL)
 *   Body:    "Salam {{2}}, pendaftaran Santunan Emas anda berjaya. Kod anda: {{3}}.
 *             Simpan kod QR ini dan tunjukkan semasa pendaftaran setiap minggu."
 *
 * Set TWILIO_QR_TEMPLATE_SID to its Content SID (HX...) to activate sending.
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
    1: participant.qr_card_url,
    2: participant.full_name,
    3: participant.serial_code,
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
