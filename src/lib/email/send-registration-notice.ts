import { resend } from "./resend";
import { SE_NOTIFY_EMAIL } from "./recipients";
import { formatDateTimeSGT } from "@/lib/utils/format";
import {
  RegistrationNoticeEmail,
  type RegistrationNoticeEvent,
} from "@/emails/RegistrationNoticeEmail";

/** How the QR actually reached (or failed to reach) the registrant. */
export type DeliveryOutcome = "sent" | "awaiting_whatsapp" | "failed";

const DELIVERY_COPY: Record<DeliveryOutcome, string> = {
  sent: "Dihantar / Sent",
  awaiting_whatsapp: "Menunggu mesej WhatsApp pendaftar / Awaiting registrant's WhatsApp message",
  failed: "GAGAL — perlu hantar semula / FAILED — needs a resend",
};

/** `created_at` comes back from Postgres, but never let a bad value throw here. */
function safeDate(value: Date | string | undefined): Date {
  if (!value) return new Date();
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export interface RegistrationNoticeInput {
  event: RegistrationNoticeEvent;
  participant: {
    full_name: string;
    serial_code: string;
    phone: string;
    email: string | null;
    reg_channel: "email" | "whatsapp";
    qr_card_url: string | null;
  };
  delivery: DeliveryOutcome;
  at?: Date | string;
}

/**
 * Sends Santunan Emas their own record of a registration. The client wants one
 * for *every* registration, and a WhatsApp-route registrant has no email address
 * to BCC, so this is a separate internal email rather than a copy of theirs.
 *
 * Never throws — a notification failure must not fail a registration.
 */
export async function sendRegistrationNotice(input: RegistrationNoticeInput): Promise<void> {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "info@santunanemas.sg",
      to: SE_NOTIFY_EMAIL,
      subject:
        input.event === "resent"
          ? `QR dihantar semula: ${input.participant.serial_code} — ${input.participant.full_name}`
          : `Pendaftaran baharu: ${input.participant.serial_code} — ${input.participant.full_name}`,
      react: RegistrationNoticeEmail({
        event: input.event,
        participant: input.participant,
        delivery: DELIVERY_COPY[input.delivery],
        registered_at: formatDateTimeSGT(safeDate(input.at)),
      }),
    });
  } catch (err) {
    console.error("[se-notice] send failed:", err);
  }
}
