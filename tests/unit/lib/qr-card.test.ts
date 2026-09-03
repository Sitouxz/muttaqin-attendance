// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateQrCardPng } from "@/lib/utils/qr-card";

describe("generateQrCardPng", () => {
  it("renders a PNG for a participant", async () => {
    const png = await generateQrCardPng({
      full_name: "Nur Muhammad bin Abdul Rahman",
      serial_code: "SE0042",
      qr_token: "11111111-1111-4111-8111-111111111111",
    });

    expect(png).toBeInstanceOf(Buffer);
    expect(png.length).toBeGreaterThan(1000);
    // PNG magic number
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  }, 20_000);
});
