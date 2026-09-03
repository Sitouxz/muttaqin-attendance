import twilio, { type Twilio } from "twilio";

/**
 * Twilio WhatsApp client. Mirrors the setup already running for the Muttaqin
 * Chatbot (same Twilio account, same registered SE sender number).
 *
 * Env vars copy-pasted from the Twilio console often carry a UTF-8 BOM or stray
 * whitespace that breaks HTTP headers — strip anything outside printable ASCII.
 */
export function cleanEnv(value: string | undefined): string {
  return (value ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

export function requireEnv(name: string): string {
  const v = cleanEnv(process.env[name]);
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/** True when every var needed to send WhatsApp QR templates is present. */
export function isWhatsAppConfigured(): boolean {
  return Boolean(
    cleanEnv(process.env.TWILIO_ACCOUNT_SID) &&
      cleanEnv(process.env.TWILIO_AUTH_TOKEN) &&
      cleanEnv(process.env.TWILIO_WHATSAPP_NUMBER) &&
      cleanEnv(process.env.TWILIO_QR_TEMPLATE_SID),
  );
}

let client: Twilio | null = null;
export function getTwilioClient(): Twilio {
  if (!client) {
    client = twilio(requireEnv("TWILIO_ACCOUNT_SID"), requireEnv("TWILIO_AUTH_TOKEN"));
  }
  return client;
}

/** Normalise an SG mobile (stored as 8 digits) or raw input to `whatsapp:+E.164`. */
export function toWhatsAppAddress(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return `whatsapp:${trimmed.replace(/[^\d+]/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  const e164 = digits.startsWith("65") ? `+${digits}` : `+65${digits}`;
  return `whatsapp:${e164}`;
}
