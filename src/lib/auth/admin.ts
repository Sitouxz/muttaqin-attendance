import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export interface ActingAdmin {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

/**
 * The admin behind the current request, or null when there is no session or
 * the account has been deactivated.
 *
 * A Supabase session outlives a deactivation — clearing is_active does not
 * invalidate the JWT — so that check has to happen here, on every request,
 * not just at login.
 *
 * Returns the admins row (not the auth user) because attendance.checked_in_by
 * references admins.id.
 */
export async function getActingAdmin(): Promise<ActingAdmin | null> {
  const supabase = await createClient();
  // getUser() revalidates the JWT with the auth server. getSession() returns
  // whatever the request cookie says — auth-js itself warns those values "may
  // not be authentic" when storage is request cookies, which is exactly this.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await serviceClient
    .from("admins")
    .select("id, full_name, email, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  return data ?? null;
}

/**
 * Wraps a value for use inside a PostgREST filter (`or`, `ilike`, …).
 *
 * Unquoted filter values treat `,` `.` `(` `)` as syntax, so a search term
 * carrying them can append conditions to the filter it lands in. Quoting and
 * escaping keeps a search term a search term.
 */
export function escapeFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
