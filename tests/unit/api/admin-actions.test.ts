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
  for (const m of ["select", "eq", "gte", "lte", "in", "is", "or", "not", "order", "limit", "single", "update", "insert"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

const inviteUserByEmail = vi
  .fn()
  .mockResolvedValue({ data: { user: { id: "auth-user-9" } }, error: null });

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: vi.fn().mockImplementation(() => makeChain({ data: [], error: null })),
    auth: { admin: { inviteUserByEmail } },
  },
}));


async function actAs(role: string, id = "admin-1") {
  const { serviceClient } = await import("@/lib/supabase/service");
  vi.mocked(serviceClient.from).mockImplementation((() =>
    makeChain({ data: { id, full_name: "Admin", email: "a@b.c", role }, error: null })) as unknown as typeof serviceClient.from);
}

describe("admin management endpoints", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    inviteUserByEmail.mockResolvedValue({
      data: { user: { id: "auth-user-9" } },
      error: null,
    });
  });

  it("refuses an unauthenticated invite", async () => {
    await mockAuthUser(null);
    const { POST } = await import("@/app/api/admin/admins/route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/admins", {
        method: "POST",
        body: JSON.stringify({ email: "new@santunanemas.sg" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(res.status).toBe(401);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("refuses an invite from a non-super_admin", async () => {
    await mockAuthUser({ id: "user-1" });
    await actAs("operator");
    const { POST } = await import("@/app/api/admin/admins/route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/admins", {
        method: "POST",
        body: JSON.stringify({ email: "new@santunanemas.sg" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(res.status).toBe(403);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("invites and provisions the admins row that actually grants access", async () => {
    await mockAuthUser({ id: "user-1" });

    // An invite alone only creates an auth.users row; without the admins row
    // the invitee can sign in and reach nothing.
    const inserted: Record<string, unknown>[] = [];
    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation((() => {
      const chain = makeChain({
        data: { id: "admin-1", full_name: "Admin", email: "a@b.c", role: "super_admin" },
        error: null,
      }) as unknown as { insert: ReturnType<typeof vi.fn> };
      chain.insert = vi.fn().mockImplementation((row: Record<string, unknown>) => {
        inserted.push(row);
        return makeChain({ data: null, error: null });
      });
      return chain;
    }) as unknown as typeof serviceClient.from);

    const { POST } = await import("@/app/api/admin/admins/route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/admins", {
        method: "POST",
        body: JSON.stringify({ email: "new@santunanemas.sg" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(res.status).toBe(200);
    expect(inviteUserByEmail).toHaveBeenCalledWith("new@santunanemas.sg");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      auth_user_id: "auth-user-9",
      email: "new@santunanemas.sg",
      role: "operator", // least privilege by default
    });
  });

  it("reports a failure when the invite lands but the admin row does not", async () => {
    await mockAuthUser({ id: "user-1" });

    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation((() => {
      const chain = makeChain({
        data: { id: "admin-1", full_name: "Admin", email: "a@b.c", role: "super_admin" },
        error: null,
      }) as unknown as { insert: ReturnType<typeof vi.fn> };
      chain.insert = vi
        .fn()
        .mockReturnValue(makeChain({ data: null, error: { message: "duplicate key" } }));
      return chain;
    }) as unknown as typeof serviceClient.from);

    const { POST } = await import("@/app/api/admin/admins/route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/admins", {
        method: "POST",
        body: JSON.stringify({ email: "new@santunanemas.sg" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("admin record failed");
  });

  it("refuses an unauthenticated deactivation", async () => {
    await mockAuthUser(null);
    const { DELETE } = await import("@/app/api/admin/admins/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/admin/admins/x"), {
      params: Promise.resolve({ id: "admin-2" }),
    });
    expect(res.status).toBe(401);
  });

  it("stops a super_admin locking themselves out", async () => {
    await mockAuthUser({ id: "user-1" });
    await actAs("super_admin", "admin-1");
    const { DELETE } = await import("@/app/api/admin/admins/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/admin/admins/admin-1"), {
      params: Promise.resolve({ id: "admin-1" }),
    });
    expect(res.status).toBe(400);
  });
});
