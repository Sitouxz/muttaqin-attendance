import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockAuthUser } from "../../helpers/admin-auth";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "in", "is", "or", "not", "order", "limit", "range", "single", "insert", "update"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: vi.fn().mockImplementation(() => makeChain({ data: [], error: null })),
  },
}));


const ADMIN_ROW = {
  id: "admin-1",
  full_name: "Ustaz Rahman",
  email: "admin@santunanemas.sg",
  role: "operator",
};

function postCheckIn(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/check-in", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID_BODY = {
  participant_id: "11111111-1111-4111-8111-111111111111",
  session_id: "22222222-2222-4222-8222-222222222222",
  programme_ids: ["33333333-3333-4333-8333-333333333333"],
  check_in_method: "qr_scan",
};

describe("POST /api/check-in", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated check-in", async () => {
    await mockAuthUser(null);
    const { POST } = await import("@/app/api/check-in/route");
    const res = await POST(postCheckIn(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("rejects a session whose admin row is inactive or missing", async () => {
    await mockAuthUser({ id: "user-1" });
    const { serviceClient } = await import("@/lib/supabase/service");
    // The admins lookup filters on is_active, so a deactivated admin resolves null.
    vi.mocked(serviceClient.from).mockImplementation((() =>
      makeChain({ data: null, error: null })) as unknown as typeof serviceClient.from);

    const { POST } = await import("@/app/api/check-in/route");
    const res = await POST(postCheckIn(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("records the acting admin on every attendance row", async () => {
    await mockAuthUser({ id: "user-1" });
    const inserts: Record<string, unknown>[] = [];

    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation(((table: string) => {
      if (table === "admins") return makeChain({ data: ADMIN_ROW, error: null });
      if (table === "participants") {
        return makeChain({ data: { id: "p1", full_name: "Siti Aminah" }, error: null });
      }
      const chain = makeChain({ data: null, error: null }) as unknown as {
        insert: ReturnType<typeof vi.fn>;
      };
      chain.insert = vi.fn().mockImplementation((row: Record<string, unknown>) => {
        inserts.push(row);
        return makeChain({ data: null, error: null });
      });
      return chain;
    }) as unknown as typeof serviceClient.from);

    const { POST } = await import("@/app/api/check-in/route");
    const res = await POST(postCheckIn(VALID_BODY));

    expect(res.status).toBe(200);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].checked_in_by).toBe("admin-1");
  });
});

describe("GET /api/check-in/lookup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated lookup", async () => {
    await mockAuthUser(null);
    const { GET } = await import("@/app/api/check-in/lookup/route");
    const res = await GET(new NextRequest("http://localhost/api/check-in/lookup?q=siti"));
    expect(res.status).toBe(401);
  });

  it("never returns qr_token, the check-in credential", async () => {
    await mockAuthUser({ id: "user-1" });
    let selected = "";

    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation(((table: string) => {
      if (table === "admins") return makeChain({ data: ADMIN_ROW, error: null });
      const chain = makeChain({ data: [], error: null }) as unknown as {
        select: ReturnType<typeof vi.fn>;
      };
      chain.select = vi.fn().mockImplementation((cols: string) => {
        selected = cols;
        return makeChain({ data: [], error: null });
      });
      return chain;
    }) as unknown as typeof serviceClient.from);

    const { GET } = await import("@/app/api/check-in/lookup/route");
    const res = await GET(new NextRequest("http://localhost/api/check-in/lookup?q=siti"));

    expect(res.status).toBe(200);
    expect(selected).not.toContain("qr_token");
  });

  it("quotes a search term so it cannot extend the filter", async () => {
    await mockAuthUser({ id: "user-1" });
    let filter = "";

    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation(((table: string) => {
      if (table === "admins") return makeChain({ data: ADMIN_ROW, error: null });
      const chain = makeChain({ data: [], error: null }) as unknown as {
        or: ReturnType<typeof vi.fn>;
      };
      chain.or = vi.fn().mockImplementation((f: string) => {
        filter = f;
        return makeChain({ data: [], error: null });
      });
      return chain;
    }) as unknown as typeof serviceClient.from);

    const { GET } = await import("@/app/api/check-in/lookup/route");
    // A term that would otherwise append an is_active condition.
    await GET(
      new NextRequest(
        "http://localhost/api/check-in/lookup?q=" + encodeURIComponent("a,is_active.eq.false")
      )
    );

    // The whole term lands inside quotes rather than as extra filter clauses.
    expect(filter).toContain('"%a,is_active.eq.false%"');
  });
});
