import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const SECRET = "test-secret-123456";

const state = vi.hoisted(() => ({
  candidate: null as { id: string } | null,
  claimed: null as
    | { full_name: string; serial_code: string; qr_card_url: string }
    | null,
  updateArg: undefined as unknown,
  maybeSingleCalls: 0,
}));

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: () => {
      // 1st maybeSingle() resolves the candidate lookup, 2nd the conditional update
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "not", "order", "limit"]) chain[m] = () => chain;
      chain.update = (arg: unknown) => {
        state.updateArg = arg;
        return chain;
      };
      chain.maybeSingle = () => {
        state.maybeSingleCalls++;
        return Promise.resolve({
          data: state.maybeSingleCalls === 1 ? state.candidate : state.claimed,
        });
      };
      return chain;
    },
  },
}));

function req(body: unknown, auth = `Bearer ${SECRET}`) {
  return new Request("http://localhost/api/whatsapp/claim-qr", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: auth },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/whatsapp/claim-qr", () => {
  beforeEach(() => {
    process.env.WA_CLAIM_SECRET = SECRET;
    state.candidate = null;
    state.claimed = null;
    state.updateArg = undefined;
    state.maybeSingleCalls = 0;
  });

  it("401 on a wrong secret", async () => {
    const { POST } = await import("@/app/api/whatsapp/claim-qr/route");
    const res = await POST(req({ phone: "whatsapp:+6591234567" }, "Bearer nope"));
    expect(res.status).toBe(401);
  });

  it("found:false when nobody is pending for that phone", async () => {
    const { POST } = await import("@/app/api/whatsapp/claim-qr/route");
    const res = await POST(req({ phone: "whatsapp:+6591234567" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ found: false });
  });

  it("claims the pending card and returns it", async () => {
    state.candidate = { id: "p1" };
    state.claimed = { full_name: "Nur", serial_code: "SE0024", qr_card_url: "https://x/c.png" };
    const { POST } = await import("@/app/api/whatsapp/claim-qr/route");
    const res = await POST(req({ phone: "whatsapp:+6591234567" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      found: true,
      name: "Nur",
      serial_code: "SE0024",
      qr_card_url: "https://x/c.png",
    });
    expect(state.updateArg).toEqual({ wa_qr_pending: false });
  });

  it("400 on an unusable phone", async () => {
    const { POST } = await import("@/app/api/whatsapp/claim-qr/route");
    const res = await POST(req({ phone: "123" }));
    expect(res.status).toBe(400);
  });
});
