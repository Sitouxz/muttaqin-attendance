import { vi } from "vitest";

/**
 * Auth stubs for routes guarded by getActingAdmin().
 *
 * That guard does two reads: supabase.auth.getUser() for the verified auth
 * user, then a public.admins lookup for the acting admin row. A test has to
 * satisfy both — an auth user with no active admins row is a 401.
 *
 * Requires the calling suite to have vi.mock()'d "@/lib/supabase/server".
 */
export async function mockAuthUser(user: { id: string; email?: string } | null) {
  const { createClient } = await import("@/lib/supabase/server");
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

export const ADMIN_ROW = {
  id: "admin-1",
  full_name: "Ustaz Rahman",
  email: "admin@santunanemas.sg",
  role: "operator",
};

export const SUPER_ADMIN_ROW = { ...ADMIN_ROW, role: "super_admin" };
