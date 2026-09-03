import {
  Body, Container, Head, Heading, Html, Img, Link,
  Preview, Section, Text,
} from "@react-email/components";

interface QrEmailProps {
  participant: {
    full_name: string;
    serial_code: string;
    qr_card_url: string;
    qr_image_url: string;
    qr_token: string;
  };
}

export function QrEmail({ participant }: QrEmailProps) {
  return (
    <Html lang="ms">
      <Head />
      <Preview>QR Code Pendaftaran Anda / Your Registration QR Code — Santunan Emas</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f5f5f5", margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", padding: 32, borderRadius: 12 }}>
          <Heading style={{ color: "#173d35", fontSize: 24, marginBottom: 8 }}>
            Santunan Emas
          </Heading>
          <Text style={{ color: "#173d35", fontSize: 18, fontWeight: "bold" }}>
            Selamat Datang, {participant.full_name}!
          </Text>
          <Text style={{ color: "#555", fontSize: 16 }}>
            Welcome, {participant.full_name}! Your registration for Santunan Emas is complete.
          </Text>

          <Section style={{ textAlign: "center", margin: "16px 0 8px" }}>
            <Text style={{ color: "#173d35", fontWeight: "bold", marginBottom: 4 }}>
              Kod Pendaftaran / Registration Code
            </Text>
            <Text style={{ color: "#173d35", fontSize: 28, fontWeight: "bold", letterSpacing: 3, margin: 0 }}>
              {participant.serial_code}
            </Text>
          </Section>

          <Section style={{ textAlign: "center", margin: "16px 0" }}>
            <Img
              src={participant.qr_card_url}
              alt="Kod QR Santunan Emas"
              width={320}
              style={{ display: "block", margin: "0 auto", borderRadius: 8, maxWidth: "100%" }}
            />
          </Section>

          <Section style={{ textAlign: "center" }}>
            <Link
              href={participant.qr_card_url}
              style={{
                backgroundColor: "#173d35",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Muat Turun Kod QR / Download QR Card
            </Link>
          </Section>

          <Text style={{ color: "#555", fontSize: 14, marginTop: 24 }}>
            Tunjukkan kod QR ini semasa pendaftaran setiap minggu. Show this QR code at registration each week.
          </Text>
          <Text style={{ color: "#999", fontSize: 12, marginTop: 16 }}>
            Untuk bantuan, hubungi kami di info@santunanemas.sg
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default QrEmail;
