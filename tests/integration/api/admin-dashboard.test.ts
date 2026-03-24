import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase server client — unauthenticated by default
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
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
  // Make the chain itself a thenable so `await chain.select(...)` works
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

// Mock service client with chainable mock
vi.mock("@/lib/supabase/service", () => {
  const makeChainFactory = (result: unknown) => {
    const chain = makeChain(result);
    return chain;
  };

  return {
    serviceClient: {
      from: vi.fn().mockImplementation(() =>
        makeChain({ count: 0, data: [], error: null })
      ),
    },
  };
});

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
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as Awaited<ReturnType<typeof createClient>>);

    const { GET } = await import("@/app/api/admin/dashboard/stats/route");
    const req = new NextRequest("http://localhost:3000/api/admin/dashboard/stats");
    const res = await GET(req as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });

  it("returns stats object with expected keys when authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "admin@test.com" } },
        }),
      },
    } as Awaited<ReturnType<typeof createClient>>);

    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation(() =>
      makeChain({ count: 5, data: [], error: null }) as ReturnType<
        typeof serviceClient.from
      >
    );

    const { GET } = await import("@/app/api/admin/dashboard/stats/route");
    const req = new NextRequest("http://localhost:3000/api/admin/dashboard/stats");
    const res = await GET(req as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("total_participants");
    expect(body).toHaveProperty("sessions_this_month");
    expect(body).toHaveProperty("attendance_today");
    expect(body).toHaveProperty("top_programmes");
  });
});
