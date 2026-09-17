import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

interface Row {
  id: string;
  full_name: string;
  phone: string;
  serial_code: string;
  qr_token: string;
  qr_card_url: string | null;
  reg_channel: "email" | "whatsapp";
}

const state = vi.hoisted(() => ({
  rows: [] as Row[],
  /** Every `.update()` payload the route wrote, in order. */
  updates: [] as unknown[],
  configured: true,
  delivered: true,
  sends: [] as { participant_id?: string; serial_code: string }[],
}));

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit", "in"]) chain[m] = () => chain;
      chain.update = (arg: unknown) => {
        state.updates.push(arg);
        return chain;
      };
      // The route awaits the built query directly for the row list.
      chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: state.rows });
      return chain;
    },
  },
}));

vi.mock("@/lib/whatsapp/client", () => ({
  isWhatsAppConfigured: () => state.configured,
}));

vi.mock("@/lib/whatsapp/send-qr", () => ({
  MAX_QR_CARDS_PER_PHONE: 5,
  sendQrWhatsApp: (p: { participant_id?: string; serial_code: string }) => {
    state.sends.push(p);
    return Promise.resolve({ delivered: state.delivered });
  },
}));

vi.mock("@/lib/qr/assets", () => ({
  uploadQrAssets: () =>
    Promise.resolve({
      qr_image_url: "https://example.test/plain.png",
      qr_card_url: "https://example.test/cards/token.png",
    }),
}));

function req(body: unknown) {
  return new Request("http://localhost/api/retrieve-qr/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    full_name: "Nur Aisyah",
    phone: "91234567",
    serial_code: "SE0001",
    qr_token: "22222222-2222-4222-8222-222222222222",
    qr_card_url: "https://example.test/cards/token.png",
    reg_channel: "whatsapp",
    ...overrides,
  };
}

/** Each test needs a phone the module-level cooldown has not seen yet. */
let nextPhone = 90000000;
function freshPhone(): string {
  nextPhone += 1;
  return String(nextPhone);
}

describe("POST /api/retrieve-qr/whatsapp", () => {
  beforeEach(() => {
    state.rows = [];
    state.updates = [];
    state.configured = true;
    state.delivered = true;
    state.sends = [];
  });

  it("rejects a number that is not a Singapore mobile", async () => {
    const { POST } = await import("@/app/api/retrieve-qr/whatsapp/route");
    const res = await POST(req({ phone: "12345" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "INVALID_PHONE" });
  });

  it("404s when no participant holds that number", async () => {
    const { POST } = await import("@/app/api/retrieve-qr/whatsapp/route");
    const res = await POST(req({ phone: freshPhone() }));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "PHONE_NOT_FOUND" });
  });

  it("sends the card and never returns it in the response", async () => {
    const phone = freshPhone();
    state.rows = [row({ phone })];
    const { POST } = await import("@/app/api/retrieve-qr/whatsapp/route");
    const res = await POST(req({ phone: `+65 ${phone}` }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "sent", count: 1 });
    expect(JSON.stringify(json)).not.toContain("cards/token.png");
    expect(state.sends).toHaveLength(1);
  });

  it("sends every registration on a shared household number", async () => {
    const phone = freshPhone();
    state.rows = [
      row({ phone, id: "a", serial_code: "SE0001" }),
      row({ phone, id: "b", serial_code: "SE0002" }),
    ];
    const { POST } = await import("@/app/api/retrieve-qr/whatsapp/route");
    const res = await POST(req({ phone }));

    await expect(res.json()).resolves.toEqual({ status: "sent", count: 2 });
    expect(state.sends.map((s) => s.serial_code)).toEqual(["SE0001", "SE0002"]);
  });

  it("re-arms the inbound-first path when WhatsApp cannot send", async () => {
    const phone = freshPhone();
    state.configured = false;
    state.rows = [row({ phone })];
    const { POST } = await import("@/app/api/retrieve-qr/whatsapp/route");
    const res = await POST(req({ phone }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "awaiting_whatsapp" });
    expect(state.sends).toHaveLength(0);
    expect(state.updates).toContainEqual({ wa_qr_pending: true });
  });

  it("does not flag an email-route registrant as awaiting WhatsApp", async () => {
    const phone = freshPhone();
    state.configured = false;
    state.rows = [row({ phone, reg_channel: "email" })];
    const { POST } = await import("@/app/api/retrieve-qr/whatsapp/route");
    const res = await POST(req({ phone }));

    await expect(res.json()).resolves.toEqual({ status: "awaiting_whatsapp" });
    expect(state.updates).not.toContainEqual({ wa_qr_pending: true });
  });

  it("holds off a repeat request for the same number", async () => {
    const phone = freshPhone();
    state.rows = [row({ phone })];
    const { POST } = await import("@/app/api/retrieve-qr/whatsapp/route");

    await POST(req({ phone }));
    const res = await POST(req({ phone }));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ error: "TOO_SOON" });
    expect(state.sends).toHaveLength(1);
  });

  it("lets someone retry immediately when nothing was delivered", async () => {
    const phone = freshPhone();
    state.configured = false;
    state.rows = [row({ phone })];
    const { POST } = await import("@/app/api/retrieve-qr/whatsapp/route");

    await POST(req({ phone }));
    const res = await POST(req({ phone }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "awaiting_whatsapp" });
  });
});
