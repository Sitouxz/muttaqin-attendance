import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  uploads: [] as { path: string }[],
  generateQrPng: vi.fn().mockResolvedValue(Buffer.from("plain")),
  generateQrCardPng: vi.fn().mockResolvedValue(Buffer.from("card")),
}));

vi.mock("@/lib/utils/qr", () => ({ generateQrPng: mocks.generateQrPng }));
vi.mock("@/lib/utils/qr-card", () => ({ generateQrCardPng: mocks.generateQrCardPng }));
vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    storage: {
      from: () => ({
        upload: (path: string) => {
          mocks.uploads.push({ path });
          return Promise.resolve({ error: null });
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://sb.test/storage/v1/object/public/qr-codes/${path}` },
        }),
      }),
    },
  },
}));

const PARTICIPANT = {
  qr_token: "11111111-1111-4111-8111-111111111111",
  serial_code: "SE0007",
  full_name: "Nur Registrant",
};

describe("uploadQrAssets", () => {
  beforeEach(() => {
    mocks.uploads.length = 0;
  });

  it("keys both images by the unguessable token, never the serial", async () => {
    const { uploadQrAssets } = await import("@/lib/qr/assets");
    const urls = await uploadQrAssets(PARTICIPANT);

    const paths = mocks.uploads.map((u) => u.path).sort();
    expect(paths).toEqual([
      `${PARTICIPANT.qr_token}.png`,
      `cards/${PARTICIPANT.qr_token}.png`,
    ]);

    // The bucket is public, so a guessable path is a way into someone else's QR.
    for (const url of [urls.qr_image_url, urls.qr_card_url]) {
      expect(url).not.toContain(PARTICIPANT.serial_code);
      expect(url).toContain(PARTICIPANT.qr_token);
    }
  });

  it("still renders the serial onto the card itself", async () => {
    const { uploadQrAssets } = await import("@/lib/qr/assets");
    await uploadQrAssets(PARTICIPANT);
    expect(mocks.generateQrCardPng).toHaveBeenCalledWith(
      expect.objectContaining({ serial_code: "SE0007" }),
    );
  });
});
