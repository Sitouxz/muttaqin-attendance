import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { todaySGT } from "@/lib/utils/format";

export const revalidate = 0;

export async function GET() {
  const supabase = await createClient();
  const today = todaySGT();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "*, session_programmes(programme_id, programmes(id, name, colour, is_default))"
    )
    .eq("status", "active")
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Spec: returns single session object (only one active session at a time)
  return NextResponse.json({ session: data?.[0] ?? null });
}
