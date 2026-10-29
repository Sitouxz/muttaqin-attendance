import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sortSessionsMainFirst } from "@/lib/sessions/weekly";

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

  // The scanner defaults to the first session, so the kuliah must lead.
  const sessions = sortSessionsMainFirst(data ?? []);
  return NextResponse.json({ sessions, session: sessions[0] ?? null });
}
