import { serviceClient } from "@/lib/supabase/service";
import { CheckInSchema } from "@/lib/validations/attendance";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { qr_token, participant_id, session_id, programme_ids, check_in_method, notes } = parsed.data;

  // Resolve participant
  let pid = participant_id;
  if (!pid && qr_token) {
    const { data: p } = await serviceClient
      .from("participants")
      .select("id, full_name")
      .eq("qr_token", qr_token)
      .eq("is_active", true)
      .single();
    if (!p) return NextResponse.json({ error: "PARTICIPANT_NOT_FOUND" }, { status: 404 });
    pid = p.id;
  }

  if (!pid) return NextResponse.json({ error: "PARTICIPANT_NOT_FOUND" }, { status: 404 });

  // Get participant name
  const { data: participant } = await serviceClient
    .from("participants")
    .select("full_name")
    .eq("id", pid)
    .single();

  // Insert attendance for each programme (ON CONFLICT DO NOTHING)
  let already_checked_in = true;
  for (const programme_id of programme_ids) {
    const { error } = await serviceClient
      .from("attendance")
      .insert({
        participant_id: pid,
        session_id,
        programme_id,
        check_in_method,
        notes: notes ?? null,
        is_synced: true,
      });
    if (!error) already_checked_in = false; // at least one new row
  }

  return NextResponse.json({
    success: true,
    participant: { full_name: participant?.full_name ?? "Unknown" },
    already_checked_in,
  });
}
