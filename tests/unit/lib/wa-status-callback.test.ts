// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const tw = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/lib/whatsapp/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/whatsapp/client")>();
  return {
    ...actual,
    isWhatsAppConfigured: () => true,
    getTwilioClient: () => ({ messages: { create: tw.create } }),
  };
});

const PID = "11111111-1111-4111-8111-111111111111";

describe("statusCallbackUrl", () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  it("points Twilio at the status route for this participant", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://attendance.test/";
    const { statusCallbackUrl } = await import("@/lib/whatsapp/send-qr");
    expect(statusCallbackUrl(PID)).toBe(`https://attendance.test/api/whatsapp/status?pid=${PID}`);
  });

  it.each([
    ["unset", undefined],
    ["http", "http://attendance.test"],
    ["localhost", "https://localhost:3000"],
  ])("is omitted when the origin is %s — Twilio couldn't call it back", async (_label, url) => {
    if (url === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = url;
    const { statusCallbackUrl } = await import("@/lib/whatsapp/send-qr");
    expect(statusCallbackUrl(PID)).toBeUndefined();
  });

  it("is omitted without a participant to re-flag", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://attendance.test";
    const { statusCallbackUrl } = await import("@/lib/whatsapp/send-qr");
    expect(statusCallbackUrl(undefined)).toBeUndefined();
  });
});

describe("sendQrWhatsApp status callback", () => {
  const OLD = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://attendance.test";
    process.env.TWILIO_WHATSAPP_NUMBER = "whatsapp:+6589913776";
    process.env.TWILIO_QR_TEMPLATE_SID = "HXtest";
    delete process.env.SE_WHATSAPP_NOTIFY_NUMBER;
    tw.create.mockReset().mockResolvedValue({ sid: "MM1" });
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  async function send(participant_id?: string) {
    const mod = await import("@/lib/whatsapp/send-qr");
    return mod.sendQrWhatsApp({
      participant_id,
      full_name: "Nur",
      phone: "91234567",
      serial_code: "SE0007",
      qr_card_url: `${mod.WHATSAPP_CARD_MEDIA_BASE}${PID}.png`,
    });
  }

  it("asks Twilio to report delivery status for the registrant's card", async () => {
    const result = await send(PID);
    expect(result.delivered).toBe(true);
    expect(tw.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCallback: `https://attendance.test/api/whatsapp/status?pid=${PID}`,
      }),
    );
  });

  it("sends without a callback when no participant id is given", async () => {
    await send(undefined);
    expect(tw.create.mock.calls[0][0].statusCallback).toBeUndefined();
  });

  it("never attaches the callback to SE's copy", async () => {
    process.env.SE_WHATSAPP_NOTIFY_NUMBER = "+6580000000";
    await send(PID);
    expect(tw.create).toHaveBeenCalledTimes(2);
    expect(tw.create.mock.calls[1][0].statusCallback).toBeUndefined();
  });
});
