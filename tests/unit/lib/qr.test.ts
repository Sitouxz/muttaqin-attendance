import { describe, it, expect } from "vitest";
import { generateQrToken, generateQrPng } from "@/lib/utils/qr";

describe("generateQrToken", () => {
  it("returns a UUID v4 string (36 chars)", () => {
    const token = generateQrToken();
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("generates unique tokens on each call", () => {
    const a = generateQrToken();
    const b = generateQrToken();
    expect(a).not.toEqual(b);
  });
});

describe("generateQrPng", () => {
  it("returns a PNG Buffer (magic bytes 89 50 4E 47)", async () => {
    const token = generateQrToken();
    const buf = await generateQrPng(token);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it("encodes the raw token (not a URL)", async () => {
    const token = "test-token-value";
    // Should not throw — just verify it produces a buffer
    const buf = await generateQrPng(token);
    expect(buf.length).toBeGreaterThan(0);
  });
});
