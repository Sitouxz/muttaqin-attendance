import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockAuthUser, ADMIN_ROW } from "../../helpers/admin-auth";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

const UPCOMING = {
  id: "s1",
  session_date: "2026-09-20",
  title: "Kuliah",
  start_time: null,
  end_time: null,
};

const PARTICIPANTS = [
  { full_name: "Siti", email: "siti@example.com", qr_image_url: null },
  { full_name: "Ahmad", email: "ahmad@example.com", qr_image_url: null },
];

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "lte", "in", "is", "not", "or", "order", "limit", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "sessions") return makeChain({ data: UPCOMING, error: null });
      // The auth guard resolves the acting admin here; the test recipient is
      // this row's email, not the auth cookie's.
      if (table === "admins") return makeChain({ data: ADMIN_ROW, error: null });
      return makeChain({ data: PARTICIPANTS, error: null });
    }),
  },
}));

const sendReminderEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/send-reminder", () => ({ sendReminderEmail }));


function request(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/notifications/reminder", {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }),
    ...(body === undefined && Object.keys(headers).length ? { headers } : {}),
  });
}

describe("/api/admin/notifications/reminder", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sendReminderEmail.mockResolvedValue(undefined);
    process.env.CRON_SECRET = "cron-secret";
  });

  it("answers GET, the method Vercel Cron actually sends", async () => {
    await mockAuthUser(null);
    const mod = await import("@/app/api/admin/notifications/reminder/route");
    expect(typeof mod.GET).toBe("function");

    const res = await mod.GET(
      request("GET", undefined, { authorization: "Bearer cron-secret" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(PARTICIPANTS.length);
  });

  it("rejects a cron call with the wrong secret and no session", async () => {
    await mockAuthUser(null);
    const { GET } = await import("@/app/api/admin/notifications/reminder/route");
    const res = await GET(request("GET", undefined, { authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(sendReminderEmail).not.toHaveBeenCalled();
  });

  it("sends a test to the requesting admin only, not the whole list", async () => {
    await mockAuthUser({ id: "user-1", email: "admin@santunanemas.sg" });
    const { POST } = await import("@/app/api/admin/notifications/reminder/route");
    const res = await POST(request("POST", { test: true }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.test).toBe(true);
    expect(body.sent).toBe(1);
    expect(sendReminderEmail).toHaveBeenCalledTimes(1);
    expect(sendReminderEmail.mock.calls[0][0].participant.email).toBe(ADMIN_ROW.email);
  });

  it("still sends the real run to every opted-in participant", async () => {
    await mockAuthUser({ id: "user-1", email: "admin@santunanemas.sg" });
    const { POST } = await import("@/app/api/admin/notifications/reminder/route");
    const res = await POST(request("POST", {}));

    const body = await res.json();
    expect(body.test).toBe(false);
    expect(body.sent).toBe(PARTICIPANTS.length);
  });
});

describe("GET /api/admin/notifications/reminder — CSRF surface", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sendReminderEmail.mockResolvedValue(undefined);
    process.env.CRON_SECRET = "cron-secret";
  });

  it("refuses a GET carrying only an admin session cookie", async () => {
    // An <img src="…/reminder"> on any page an admin visits would otherwise
    // mail every participant.
    await mockAuthUser({ id: "user-1", email: "admin@santunanemas.sg" });
    const { GET } = await import("@/app/api/admin/notifications/reminder/route");
    const res = await GET(request("GET"));

    expect(res.status).toBe(401);
    expect(sendReminderEmail).not.toHaveBeenCalled();
  });

  it("refuses GET when no CRON_SECRET is configured", async () => {
    delete process.env.CRON_SECRET;
    await mockAuthUser(null);
    const { GET } = await import("@/app/api/admin/notifications/reminder/route");
    const res = await GET(request("GET", undefined, { authorization: "Bearer " }));

    expect(res.status).toBe(401);
    expect(sendReminderEmail).not.toHaveBeenCalled();
  });
});
