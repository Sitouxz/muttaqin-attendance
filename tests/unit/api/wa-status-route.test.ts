// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const PID = "11111111-1111-4111-8111-111111111111";

const tw = vi.hoisted(() => ({ validateRequest: vi.fn(() => true) }));
vi.mock("twilio", () => ({ default: { validateRequest: tw.validateRequest } }));

const db = vi.hoisted(() => ({ updateArg: undefined as unknown, eqs: [] as [string, unknown][] }));
vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.update = (arg: unknown) => {
        db.updateArg = arg;
        return chain;
      };
      chain.eq = (col: string, val: unknown) => {
        db.eqs.push([col, val]);
        return chain;
      };
      chain.select = () => chain;
      chain.maybeSingle = () => Promise.resolve({ data: { serial_code: "SE0034" } });
      return chain;
    },
  },
}));

function callback(body: Record<string, string>, pid: string = PID) {
  return new NextRequest(`https://attendance.test/api/whatsapp/status?pid=${pid}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": "sig",
    },
    body: new URLSearchParams(body).toString(),
  });
}

describe("POST /api/whatsapp/status", () => {
  const OLD = { ...process.env };

  beforeEach(() => {
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.NEXT_PUBLIC_APP_URL = "https://attendance.test";
    tw.validateRequest.mockReset().mockReturnValue(true);
    db.updateArg = undefined;
    db.eqs = [];
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...OLD };
    vi.restoreAllMocks();
  });

  it("503 when the Twilio auth token isn't configured", async () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const { POST } = await import("@/app/api/whatsapp/status/route");
    const res = await POST(callback({ MessageStatus: "undelivered" }));
    expect(res.status).toBe(503);
  });

  it("403 when the Twilio signature doesn't validate, and writes nothing", async () => {
    tw.validateRequest.mockReturnValue(false);
    const { POST } = await import("@/app/api/whatsapp/status/route");
    const res = await POST(callback({ MessageStatus: "undelivered" }));
    expect(res.status).toBe(403);
    expect(db.updateArg).toBeUndefined();
  });

  it("validates against the exact callback URL built from NEXT_PUBLIC_APP_URL", async () => {
    const { POST } = await import("@/app/api/whatsapp/status/route");
    await POST(callback({ MessageStatus: "delivered", MessageSid: "MM1" }));
    expect(tw.validateRequest).toHaveBeenCalledWith(
      "token",
      "sig",
      `https://attendance.test/api/whatsapp/status?pid=${PID}`,
      { MessageStatus: "delivered", MessageSid: "MM1" },
    );
  });

  it("400 on a participant id that isn't a UUID", async () => {
    const { POST } = await import("@/app/api/whatsapp/status/route");
    const res = await POST(callback({ MessageStatus: "undelivered" }, "not-a-uuid"));
    expect(res.status).toBe(400);
    expect(db.updateArg).toBeUndefined();
  });

  it.each(["queued", "sent", "delivered", "read"])("%s is a no-op", async (status) => {
    const { POST } = await import("@/app/api/whatsapp/status/route");
    const res = await POST(callback({ MessageStatus: status }));
    expect(res.status).toBe(204);
    expect(db.updateArg).toBeUndefined();
  });

  it.each(["undelivered", "failed"])("%s re-flags that WhatsApp registrant as pending", async (status) => {
    const { POST } = await import("@/app/api/whatsapp/status/route");
    const res = await POST(callback({ MessageStatus: status, ErrorCode: "63024" }));
    expect(res.status).toBe(204);
    expect(db.updateArg).toEqual({ wa_qr_pending: true });
    expect(db.eqs).toEqual([
      ["id", PID],
      ["reg_channel", "whatsapp"],
    ]);
  });
});
