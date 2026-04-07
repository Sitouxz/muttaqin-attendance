import { resend } from "./resend";
import { QrEmail } from "@/emails/QrEmail";

export async function sendQrEmail(participant: {
  full_name: string;
  email: string;
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
