import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await serviceClient
    .from("admins")
    .select("id, full_name, email, role, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data ?? [] });
}
