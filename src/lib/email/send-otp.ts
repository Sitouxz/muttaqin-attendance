import { resend } from "./resend";
import { OtpEmail } from "@/emails/OtpEmail";

export async function sendOtpEmail(params: { email: string; otp: string; expiresInMinutes: number }) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "info@santunanemas.sg",
    to: params.email,
    subject: "Kod Pengesahan Anda / Your Verification Code",
    react: OtpEmail(params),
  });
}
