import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ user: { id: "admin-1" } as { id: string } | null }));

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: async () => ({
    response: new Response(null, { status: 200 }),
    user: state.user,
  }),
}));

/**
 * The limiter keeps its counters in a module-level Map, so each test re-imports
 * the module to start from an empty one.
 */
async function freshProxy() {
  vi.resetModules();
  return (await import("@/proxy")).proxy;
}

function post(pathname: string, ip: string): NextRequest {
  return {
    nextUrl: { pathname },
    method: "POST",
    url: `https://example.com${pathname}`,
    headers: new Headers({ "x-forwarded-for": ip }),
  } as unknown as NextRequest;
}

describe("proxy rate limiting", () => {
  beforeEach(() => {
    state.user = { id: "admin-1" };
  });

  it("throttles repeated POSTs to the WhatsApp QR retrieval from one IP", async () => {
    const proxy = await freshProxy();
    const statuses: number[] = [];

    for (let i = 0; i < 12; i++) {
      const res = await proxy(post("/api/retrieve-qr/whatsapp", "1.2.3.4"));
      statuses.push(res.status);
    }

    // The 11th hit and beyond exceed the budget of 10.
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses.slice(10)).toEqual([429, 429]);
    const body = await (
      await proxy(post("/api/retrieve-qr/whatsapp", "1.2.3.4"))
    ).json();
    expect(body).toEqual({ error: "RATE_LIMIT_EXCEEDED" });
  });

  it("counts each caller separately, so one prober cannot lock others out", async () => {
    const proxy = await freshProxy();

    for (let i = 0; i < 11; i++) await proxy(post("/api/retrieve-qr/whatsapp", "1.1.1.1"));

    expect((await proxy(post("/api/retrieve-qr/whatsapp", "1.1.1.1"))).status).toBe(429);
    expect((await proxy(post("/api/retrieve-qr/whatsapp", "2.2.2.2"))).status).toBe(200);
  });

  it("budgets each route separately, so QR retries do not block registering", async () => {
    const proxy = await freshProxy();

    for (let i = 0; i < 11; i++) await proxy(post("/api/retrieve-qr/whatsapp", "3.3.3.3"));

    expect((await proxy(post("/api/retrieve-qr/whatsapp", "3.3.3.3"))).status).toBe(429);
    expect((await proxy(post("/api/register", "3.3.3.3"))).status).toBe(200);
  });

  it("still throttles /api/register, as it did before", async () => {
    const proxy = await freshProxy();

    for (let i = 0; i < 10; i++) {
      expect((await proxy(post("/api/register", "4.4.4.4"))).status).toBe(200);
    }
    expect((await proxy(post("/api/register", "4.4.4.4"))).status).toBe(429);
  });

  it("leaves GETs on a throttled path alone", async () => {
    const proxy = await freshProxy();

    for (let i = 0; i < 20; i++) {
      const req = post("/api/retrieve-qr/whatsapp", "5.5.5.5");
      (req as { method: string }).method = "GET";
      expect((await proxy(req)).status).toBe(200);
    }
  });

  it("does not throttle the admin pages it also matches", async () => {
    const proxy = await freshProxy();

    for (let i = 0; i < 20; i++) {
      expect((await proxy(post("/admin/participants", "6.6.6.6"))).status).toBe(200);
    }
  });

  it("still redirects a signed-out visitor away from /admin", async () => {
    const proxy = await freshProxy();
    state.user = null;

    const res = await proxy(post("/admin/participants", "7.7.7.7"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login");
  });
});
