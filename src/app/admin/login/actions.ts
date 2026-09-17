"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActingAdmin } from "@/lib/auth/admin";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password" };
  }

  /**
   * Signing in is not the same as being an admin: access needs an active row
   * in public.admins. Without this check the credentials would be accepted and
   * the admin layout would bounce straight back here, which reads as "login is
   * broken" rather than "this account has no access".
   */
  const admin = await getActingAdmin();
  if (!admin) {
    await supabase.auth.signOut();
    return {
      error:
        "This account has no admin access. Ask a super admin to invite you, or to reactivate your account.",
    };
  }

  redirect("/admin");
}
