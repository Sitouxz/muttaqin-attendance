import { resend } from "./resend";
import { ReminderEmail } from "@/emails/ReminderEmail";

export async function sendReminderEmail(params: {
  participant: { full_name: string; email: string; qr_image_url: string | null };
  session: {
    session_date: string;
    title: string | null;
    start_time: string | null;
    end_time: string | null;
  };
}) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "info@santunanemas.sg",
    to: params.participant.email,
    subject: "Peringatan Sesi Minggu Ini / This Week's Session Reminder",
    react: ReminderEmail(params),
  });
}
