import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAuthUser, ADMIN_ROW } from "../../helpers/admin-auth";

// Mock Supabase server client — unauthenticated by default
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

// Helper: build a chainable Supabase query mock that resolves to `result`
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "gte", "lte", "in", "is", "or", "not", "order", "limit", "range", "single"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: vi.fn().mockImplementation(() =>
      makeChain({ count: 0, data: [], error: null })
    ),
  },
}));

vi.mock("@/lib/utils/format", () => ({
  todaySGT: vi.fn().mockReturnValue("2026-03-25"),
}));

vi.mock("@/lib/utils/constants", () => ({
  SGT_TIMEZONE: "Asia/Singapore",
}));

describe("GET /api/admin/dashboard/stats", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    await mockAuthUser(null);

    const { GET } = await import("@/app/api/admin/dashboard/stats/route");
    // GET() takes no arguments — it reads cookies() internally via Next.js
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 for a signed-in user who is not an admin", async () => {
    // An auth.users account is not an admin: access needs an active admins row.
    await mockAuthUser({ id: "outsider" });
    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation((() =>
      makeChain({ data: null, error: null })) as unknown as typeof serviceClient.from);

    const { GET } = await import("@/app/api/admin/dashboard/stats/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns stats object with expected keys when authenticated", async () => {
    await mockAuthUser({ id: "user-1", email: "admin@test.com" });

    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation(((table: string) =>
      table === "admins"
        ? makeChain({ data: ADMIN_ROW, error: null })
        : makeChain({ count: 5, data: [], error: null })) as unknown as typeof serviceClient.from);

    const { GET } = await import("@/app/api/admin/dashboard/stats/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("total_participants");
    expect(body).toHaveProperty("sessions_this_month");
    expect(body).toHaveProperty("attendance_today");
    expect(body).toHaveProperty("top_programmes");
  });
});
