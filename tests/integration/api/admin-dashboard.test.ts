import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client — unauthenticated by default
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

// Helper: build a chainable Supabase query mock that resolves to `result`
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "gte", "lte", "in", "order", "limit", "range"];
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
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const { GET } = await import("@/app/api/admin/dashboard/stats/route");
    // GET() takes no arguments — it reads cookies() internally via Next.js
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns stats object with expected keys when authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "user-1", email: "admin@test.com" } } },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation(() =>
      makeChain({ count: 5, data: [], error: null }) as ReturnType<
        typeof serviceClient.from
      >
    );

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
