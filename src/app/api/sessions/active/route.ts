import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "*, session_programmes(programme_id, programmes(id, name, colour, is_default))"
    )
    .eq("status", "active")
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions = data ?? [];
  return NextResponse.json({ sessions, session: sessions[0] ?? null });
}
