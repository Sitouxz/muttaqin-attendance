import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { getActingAdmin } from "@/lib/auth/admin";

/**
 * Deactivate an admin. The settings page used to write this straight from the
 * browser with the anon key, which only worked because the table had no RLS.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getActingAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json({ error: "CANNOT_DEACTIVATE_SELF" }, { status: 400 });
  }

  const { error } = await serviceClient
    .from("admins")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deactivated: id });
}
