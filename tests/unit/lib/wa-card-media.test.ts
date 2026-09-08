import { describe, it, expect, beforeAll } from "vitest";

/**
 * The approved WhatsApp template bakes in a static media prefix and takes only
 * the filename as {{1}}. If these drift apart, every card send fails at Twilio.
 */
describe("cardMediaVariable", () => {
  let base: string;
  let cardMediaVariable: (url: string) => string | null;

  beforeAll(async () => {
    const mod = await import("@/lib/whatsapp/send-qr");
    base = mod.WHATSAPP_CARD_MEDIA_BASE;
    cardMediaVariable = mod.cardMediaVariable;
  });

  it("reduces a card URL to the filename the template expects", () => {
    expect(cardMediaVariable(`${base}11111111-1111-4111-8111-111111111111.png`)).toBe(
      "11111111-1111-4111-8111-111111111111.png",
    );
  });

  it("rejects a URL outside the approved prefix rather than sending a broken template", () => {
    expect(cardMediaVariable("https://evil.example.com/cards/x.png")).toBeNull();
    expect(cardMediaVariable("https://sb.test/storage/v1/object/public/qr-codes/plain.png")).toBeNull();
  });

  it("rejects a nested path, which the flat prefix cannot address", () => {
    expect(cardMediaVariable(`${base}nested/x.png`)).toBeNull();
  });

  it("rejects the bare prefix", () => {
    expect(cardMediaVariable(base)).toBeNull();
  });
});
