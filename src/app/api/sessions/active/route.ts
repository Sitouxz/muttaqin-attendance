import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

export const revalidate = 0;

// Public by design — the landing page and scanner both need it — but served
// with the service client so the anon key needs no table access of its own.
export async function GET() {
  const { data, error } = await serviceClient
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
