import { serviceClient } from "@/lib/supabase/service";
import { generateQrPng } from "@/lib/utils/qr";
import { generateQrCardPng } from "@/lib/utils/qr-card";

const BUCKET = "qr-codes";

export interface QrAssetUrls {
  /** Plain QR, read by the scanner. */
  qr_image_url: string;
  /** Branded card for humans (email, WhatsApp, print). */
  qr_card_url: string;
}

/**
 * Generates and uploads both QR images for a participant and returns their
 * public URLs. Plain QR is keyed by `qr_token`; the branded card by
 * `serial_code` so it stays stable and human-addressable.
 */
export async function uploadQrAssets(participant: {
  qr_token: string;
  serial_code: string;
  full_name: string;
}): Promise<QrAssetUrls> {
  const [plain, card] = await Promise.all([
    generateQrPng(participant.qr_token),
    generateQrCardPng({
      qr_token: participant.qr_token,
      serial_code: participant.serial_code,
      full_name: participant.full_name,
    }),
  ]);

  const plainPath = `${participant.qr_token}.png`;
  const cardPath = `cards/${participant.serial_code}.png`;

  const results = await Promise.all([
    serviceClient.storage
      .from(BUCKET)
      .upload(plainPath, plain, { contentType: "image/png", upsert: true }),
    serviceClient.storage
      .from(BUCKET)
      .upload(cardPath, card, { contentType: "image/png", upsert: true }),
  ]);

  const failed = results.find((r) => r.error)?.error;
  if (failed) throw new Error(`QR upload failed: ${failed.message}`);

  return {
    qr_image_url: serviceClient.storage.from(BUCKET).getPublicUrl(plainPath).data.publicUrl,
    qr_card_url: serviceClient.storage.from(BUCKET).getPublicUrl(cardPath).data.publicUrl,
  };
}
