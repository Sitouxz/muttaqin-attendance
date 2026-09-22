import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Captures what the route actually sends to .update(), which is the whole point
// here: the old allowlist accepted the request and dropped gender on the floor.
const updateSpy = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: vi.fn(() => ({
      update: (payload: Record<string, unknown>) => {
        updateSpy(payload);
        return {
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: "p-1", ...payload }, error: null }),
            }),
          }),
        };
      },
    })),
  },
}));

async function authenticate() {
  const { createClient } = await import("@/lib/supabase/server");
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "admin-1" } } },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

function patch(body: unknown) {
  return new NextRequest("http://localhost/api/admin/participants/p-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "p-1" });

describe("PATCH /api/admin/participants/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const { PATCH } = await import("@/app/api/admin/participants/[id]/route");
    const res = await PATCH(patch({ gender: "female" }), { params });
    expect(res.status).toBe(401);
  });

  it("persists gender — it used to be dropped by the field allowlist", async () => {
    await authenticate();
    const { PATCH } = await import("@/app/api/admin/participants/[id]/route");

    const res = await PATCH(patch({ gender: "female" }), { params });

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ gender: "female" });
  });

  it("persists participant_category", async () => {
    await authenticate();
    const { PATCH } = await import("@/app/api/admin/participants/[id]/route");

    const res = await PATCH(patch({ participant_category: "penjaga" }), { params });

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ participant_category: "penjaga" });
  });

  it("keeps an empty email as NULL so WhatsApp registrants stay editable", async () => {
    await authenticate();
    const { PATCH } = await import("@/app/api/admin/participants/[id]/route");

    const res = await PATCH(patch({ full_name: "Siti Aminah", email: "" }), { params });

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ full_name: "Siti Aminah", email: null });
  });

  it("ignores fields that are not editable", async () => {
    await authenticate();
    const { PATCH } = await import("@/app/api/admin/participants/[id]/route");

    const res = await PATCH(
      patch({ gender: "male", serial_code: "SE9999", qr_token: "hijacked" }),
      { params },
    );

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ gender: "male" });
  });

  it("rejects a gender outside the allowed set instead of hitting the DB", async () => {
    await authenticate();
    const { PATCH } = await import("@/app/api/admin/participants/[id]/route");

    const res = await PATCH(patch({ gender: "other" }), { params });

    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("rejects an update with no editable fields", async () => {
    await authenticate();
    const { PATCH } = await import("@/app/api/admin/participants/[id]/route");

    const res = await PATCH(patch({ serial_code: "SE9999" }), { params });

    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
