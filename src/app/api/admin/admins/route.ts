import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/service";
import { getActingAdmin } from "@/lib/auth/admin";

export async function GET() {
  const admin = await getActingAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await serviceClient
    .from("admins")
    .select("id, full_name, email, role, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data ?? [] });
}

const InviteSchema = z.object({
  email: z.email(),
  full_name: z.string().min(1).optional(),
  role: z.enum(["super_admin", "operator"]).optional(),
});

/**
 * Invite an admin.
 *
 * Two things were wrong before. It ran in the browser against
 * `supabase.auth.admin.inviteUserByEmail` with the anon key — an endpoint that
 * only accepts the service role — so every invite failed. And an invite only
 * ever created an auth.users row: nothing created the matching public.admins
 * row, which is the row that actually grants access. Both happen here now, so
 * an invite provisions a real, least-privilege admin.
 */
export async function POST(request: NextRequest) {
  const admin = await getActingAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = InviteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }

  const { email, full_name, role = "operator" } = parsed.data;

  const { data: invited, error } = await serviceClient.auth.admin.inviteUserByEmail(email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invited?.user) {
    return NextResponse.json({ error: "INVITE_RETURNED_NO_USER" }, { status: 500 });
  }

  const { error: rowError } = await serviceClient.from("admins").insert({
    auth_user_id: invited.user.id,
    email,
    full_name: full_name ?? email.split("@")[0],
    role,
  });

  if (rowError) {
    // The auth user now exists without an admins row, so they can sign in but
    // reach nothing. Say so rather than reporting a clean invite.
    return NextResponse.json(
      { error: `Invited, but the admin record failed: ${rowError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ invited: email, role });
}
