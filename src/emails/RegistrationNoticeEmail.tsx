import {
  Body, Container, Head, Heading, Hr, Html, Img,
  Link, Preview, Row, Column, Section, Text,
} from "@react-email/components";

export type RegistrationNoticeEvent = "registered" | "resent";

export interface RegistrationNoticeProps {
  event: RegistrationNoticeEvent;
  participant: {
    full_name: string;
    serial_code: string;
    phone: string;
    email: string | null;
    reg_channel: "email" | "whatsapp";
    qr_card_url: string | null;
  };
  /** What happened to the QR delivery, in SE-readable words. */
  delivery: string;
  registered_at: string;
}

const LABEL = { color: "#777", fontSize: 12, margin: 0, textTransform: "uppercase" as const, letterSpacing: 0.5 };
const VALUE = { color: "#173d35", fontSize: 15, fontWeight: "bold" as const, margin: "2px 0 0" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Section style={{ margin: "0 0 12px" }}>
      <Text style={LABEL}>{label}</Text>
      <Text style={VALUE}>{value}</Text>
    </Section>
  );
}

/**
 * Internal copy for Santunan Emas — one email per registration (and per admin
 * resend), on both channels. WhatsApp-route registrants have no email of their
 * own to BCC, so this is SE's only written record of them.
 */
export function RegistrationNoticeEmail({
  event,
  participant,
  delivery,
  registered_at,
}: RegistrationNoticeProps) {
  const heading = event === "resent" ? "QR dihantar semula" : "Pendaftaran baharu";
  const channel = participant.reg_channel === "whatsapp" ? "WhatsApp" : "E-mel / Email";

  return (
    <Html lang="ms">
      <Head />
      <Preview>{`${heading}: ${participant.serial_code} — ${participant.full_name}`}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f5f5f5", margin: 0, padding: 24 }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", padding: 32, borderRadius: 12 }}>
          <Text style={{ color: "#777", fontSize: 12, margin: 0, letterSpacing: 1 }}>
            SANTUNAN EMAS — REKOD DALAMAN
          </Text>
          <Heading style={{ color: "#173d35", fontSize: 22, margin: "4px 0 24px" }}>
            {heading}
          </Heading>

          <Row>
            <Column style={{ verticalAlign: "top", paddingRight: 16 }}>
              <Field label="Kod / Code" value={participant.serial_code} />
              <Field label="Nama / Name" value={participant.full_name} />
              <Field label="Telefon / Phone" value={`+65 ${participant.phone}`} />
              <Field label="E-mel / Email" value={participant.email ?? "—"} />
              <Field label="Saluran / Channel" value={channel} />
              <Field label="Penghantaran / Delivery" value={delivery} />
              <Field label="Masa / Time" value={registered_at} />
            </Column>

            {participant.qr_card_url && (
              <Column style={{ verticalAlign: "top", width: 200 }}>
                <Img
                  src={participant.qr_card_url}
                  alt={`Kad QR ${participant.serial_code}`}
                  width={200}
                  style={{ display: "block", borderRadius: 8, maxWidth: "100%" }}
                />
                <Text style={{ margin: "8px 0 0", textAlign: "center" }}>
                  <Link href={participant.qr_card_url} style={{ color: "#173d35", fontSize: 13 }}>
                    Muat turun kad / Download card
                  </Link>
                </Text>
              </Column>
            )}
          </Row>

          <Hr style={{ borderColor: "#eee", margin: "24px 0 16px" }} />
          <Text style={{ color: "#999", fontSize: 12, margin: 0 }}>
            E-mel automatik daripada sistem kehadiran Santunan Emas. Tiada tindakan diperlukan
            melainkan penghantaran di atas menunjukkan masalah.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RegistrationNoticeEmail;
