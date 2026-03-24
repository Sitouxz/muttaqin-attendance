import {
  Body, Container, Head, Heading, Html, Img, Link,
  Preview, Section, Text,
} from "@react-email/components";
import { formatDateSGT } from "@/lib/utils/format";

interface ReminderEmailProps {
  participant: { full_name: string; email: string; qr_image_url: string | null };
  session: {
    session_date: string;
    title: string | null;
    start_time: string | null;
    end_time: string | null;
  };
}

export function ReminderEmail({ participant, session }: ReminderEmailProps) {
  const dateLabel = formatDateSGT(session.session_date);
  const timeLabel =
    session.start_time
      ? `${session.start_time}${session.end_time ? ` – ${session.end_time}` : ""}`
      : "Masa akan ditetapkan";

  return (
    <Html lang="ms">
      <Head />
      <Preview>Peringatan Sesi Minggu Ini / This Week&apos;s Session — {dateLabel}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f5f5f5", margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", padding: 32, borderRadius: 12 }}>
          <Heading style={{ color: "#173d35", fontSize: 24 }}>Santunan Emas</Heading>
          <Text style={{ color: "#173d35", fontSize: 18, fontWeight: "bold" }}>
            Salam {participant.full_name},
          </Text>
          <Text style={{ color: "#555" }}>
            Ini adalah peringatan untuk sesi minggu ini. / Here is your reminder for this week&apos;s session.
          </Text>
          <Section style={{ backgroundColor: "#f0f4f3", borderRadius: 8, padding: 16, margin: "16px 0" }}>
            <Text style={{ margin: 0, fontWeight: "bold", color: "#173d35" }}>
              {session.title ?? "Sesi Santunan Emas"}
            </Text>
            <Text style={{ margin: "4px 0 0", color: "#555" }}>
              {dateLabel} · {timeLabel}
            </Text>
          </Section>
          {participant.qr_image_url && (
            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Text style={{ color: "#173d35", fontWeight: "bold" }}>Kod QR Anda / Your QR Code</Text>
              <Img src={participant.qr_image_url} alt="QR Code" width={160} height={160} style={{ borderRadius: 8, display: "block", margin: "0 auto" }} />
            </Section>
          )}
          <Text style={{ color: "#999", fontSize: 12 }}>
            Untuk berhenti menerima e-mel ini, hubungi kami di info@santunanemas.sg
            {" "}· To unsubscribe, contact us at info@santunanemas.sg
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReminderEmail;
