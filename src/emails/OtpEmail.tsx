import {
  Body, Container, Head, Heading, Html,
  Preview, Section, Text,
} from "@react-email/components";

interface OtpEmailProps {
  email: string;
  otp: string;
  expiresInMinutes: number;
}

export function OtpEmail({ otp, expiresInMinutes }: OtpEmailProps) {
  return (
    <Html lang="ms">
      <Head />
      <Preview>Kod Pengesahan Anda / Your Verification Code — Santunan Emas</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f5f5f5", margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", padding: 32, borderRadius: 12 }}>
          <Heading style={{ color: "#173d35", fontSize: 24 }}>Santunan Emas</Heading>
          <Text style={{ color: "#173d35", fontWeight: "bold", fontSize: 18 }}>
            Kod Pengesahan / Verification Code
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Text
              style={{
                fontFamily: "monospace",
                fontSize: 48,
                fontWeight: "bold",
                color: "#173d35",
                letterSpacing: 8,
                backgroundColor: "#f0f4f3",
                padding: "16px 32px",
                borderRadius: 8,
                display: "inline-block",
              }}
            >
              {otp}
            </Text>
          </Section>
          <Text style={{ color: "#555", fontSize: 14 }}>
            Kod ini sah selama {expiresInMinutes} minit. / This code is valid for {expiresInMinutes} minutes.
          </Text>
          <Text style={{ color: "#999", fontSize: 12 }}>
            Jika anda tidak meminta ini, abaikan e-mel ini. / If you did not request this, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OtpEmail;
