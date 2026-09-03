import { resend } from "./resend";
import { QrEmail } from "@/emails/QrEmail";

/** Santunan Emas keeps a copy of every QR sent (client request). */
export const SE_NOTIFY_EMAIL = process.env.SE_NOTIFY_EMAIL ?? "info@santunanemas.sg";

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
    bcc: SE_NOTIFY_EMAIL,
    subject: "QR Code Pendaftaran Anda / Your Registration QR Code",
    react: QrEmail({ participant }),
  });
}
