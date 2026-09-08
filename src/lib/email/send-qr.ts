import { resend } from "./resend";
import { QrEmail } from "@/emails/QrEmail";

export { SE_NOTIFY_EMAIL } from "./recipients";

/**
 * The registrant's own copy. SE's record is a separate internal email
 * (`sendRegistrationNotice`) rather than a BCC here, because WhatsApp-route
 * registrants never get this email at all.
 */
export async function sendQrEmail(participant: {
  full_name: string;
  email: string;
  serial_code: string;
  qr_card_url: string;
  qr_image_url: string;
  qr_token: string;
}) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "info@santunanemas.sg",
    to: participant.email,
    subject: "QR Code Pendaftaran Anda / Your Registration QR Code",
    react: QrEmail({ participant }),
  });
}
