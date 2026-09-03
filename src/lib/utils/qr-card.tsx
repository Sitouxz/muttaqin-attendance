/* eslint-disable @next/next/no-img-element -- Satori (next/og) only supports raw <img>, not next/image */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { generateQrPng } from "./qr";

/**
 * Branded QR card handed to participants (email body, WhatsApp media, print):
 * SE logo, name, serial code, the QR, and the "show this at registration"
 * caption. The plain machine-readable QR stays separate (`qr_image_url`) —
 * decorating the scanned image hurts read reliability, so this is a companion.
 *
 * Rendered with next/og (Satori + resvg): fonts are passed as explicit buffers
 * and rasterisation is WASM-based, so output is identical on every platform,
 * unlike SVG paths that depend on system fonts.
 */

const CARD_W = 820;
const CARD_H = 1060;
const GREEN = "#173d35";
const MUTED = "#6b7280";
const CAPTION_MS = "Tunjukkan kod QR ini semasa pendaftaran";
const CAPTION_EN = "Show this QR code during registration";

let cachedFont: ArrayBuffer | null = null;
function getFont(): ArrayBuffer {
  if (!cachedFont) {
    const buf = readFileSync(
      path.join(process.cwd(), "src/assets/fonts/Geist-Regular.ttf"),
    );
    cachedFont = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  return cachedFont;
}

let cachedLogo: string | null = null;
function getLogoDataUri(): string {
  if (!cachedLogo) {
    const buf = readFileSync(path.join(process.cwd(), "public/logo.png"));
    cachedLogo = `data:image/png;base64,${buf.toString("base64")}`;
  }
  return cachedLogo;
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export interface QrCardInput {
  full_name: string;
  serial_code: string;
  /** Raw QR payload (the participant's qr_token). */
  qr_token: string;
}

export async function generateQrCardPng(input: QrCardInput): Promise<Buffer> {
  const qrBuffer = await generateQrPng(input.qr_token);
  const qrUri = `data:image/png;base64,${qrBuffer.toString("base64")}`;
  const name = truncate(input.full_name, 26);

  const bar = { width: "100%", height: 12, background: GREEN, display: "flex" } as const;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Geist",
          color: GREEN,
        }}
      >
        <div style={bar} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "56px 60px 48px",
          }}
        >
          <img src={getLogoDataUri()} width={260} height={146} alt="Santunan Emas" />
          <div style={{ width: 520, height: 1, background: "#e5e7eb", marginTop: 28, marginBottom: 32 }} />
          <div style={{ fontSize: 34, fontWeight: 600, textAlign: "center" }}>{name}</div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              background: "#f0f4f3",
              borderRadius: 16,
              padding: "14px 44px",
              fontSize: 46,
              fontWeight: 700,
              letterSpacing: 6,
            }}
          >
            {input.serial_code}
          </div>
          <img src={qrUri} width={430} height={430} alt="QR" style={{ marginTop: 34 }} />
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 23, fontWeight: 600, textAlign: "center", marginTop: 40 }}>
            {CAPTION_MS}
          </div>
          <div style={{ fontSize: 16, color: MUTED, marginTop: 10 }}>{CAPTION_EN}</div>
        </div>
        <div style={bar} />
      </div>
    ),
    {
      width: CARD_W,
      height: CARD_H,
      fonts: [{ name: "Geist", data: getFont(), style: "normal", weight: 400 }],
    },
  );

  return Buffer.from(await response.arrayBuffer());
}
