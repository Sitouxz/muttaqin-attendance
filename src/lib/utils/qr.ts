import QRCode from "qrcode";

export function generateQrToken(): string {
  // Returns UUID v4 string (36 chars) per spec FR-REG-06
  return crypto.randomUUID();
}

export async function generateQrPng(token: string): Promise<Buffer> {
  // Spec: QR payload is the raw UUID token, NOT a URL
  return QRCode.toBuffer(token, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "M",
  }) as Promise<Buffer>;
}
