import { describe, it, expect, vi, beforeEach } from "vitest";
import { ADMIN_ROW } from "../../helpers/admin-auth";

const signInWithPassword = vi.fn();
const signOut = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "single"]) chain[m] = vi.fn().mockReturnValue(chain);
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: { from: vi.fn().mockImplementation(() => makeChain({ data: null, error: null })) },
}));

const redirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});
vi.mock("next/navigation", () => ({ redirect }));

/** Wires createClient so both the sign-in call and getActingAdmin see it. */
async function wireClient(user: { id: string } | null) {
  const { createClient } = await import("@/lib/supabase/server");
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      signInWithPassword,
      signOut,
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

function form(email = "admin@santunanemas.sg", password = "pw") {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

describe("loginAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
  });

  it("rejects bad credentials", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "bad" } });
    await wireClient(null);

    const { loginAction } = await import("@/app/admin/login/actions");
    expect(await loginAction(form())).toEqual({ error: "Invalid email or password" });
  });

  it("refuses a valid Supabase user with no admins row, and signs them back out", async () => {
    // Otherwise the admin layout bounces them back to the login page with no
    // explanation, which looks like a broken login.
    signInWithPassword.mockResolvedValue({ error: null });
    await wireClient({ id: "outsider" });

    const { loginAction } = await import("@/app/admin/login/actions");
    const result = await loginAction(form());

    expect(result?.error).toContain("no admin access");
    expect(signOut).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects a provisioned admin to the dashboard", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await wireClient({ id: "user-1" });
    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation((() =>
      makeChain({ data: ADMIN_ROW, error: null })) as unknown as typeof serviceClient.from);

    const { loginAction } = await import("@/app/admin/login/actions");
    await expect(loginAction(form())).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(signOut).not.toHaveBeenCalled();
  });
});
