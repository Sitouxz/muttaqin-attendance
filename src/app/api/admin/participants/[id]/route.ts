import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: participant, error } = await serviceClient
    .from("participants")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Full attendance history
  const { data: attendanceHistory } = await serviceClient
    .from("attendance")
    .select(
      `
      id,
      checked_in_at,
      check_in_method,
      notes,
      sessions(id, session_date, title, status),
      programmes(id, name, colour)
      `
    )
    .eq("participant_id", id)
    .order("checked_in_at", { ascending: false });

  return NextResponse.json({ participant, attendance: attendanceHistory ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowedFields = ["full_name", "email", "phone", "age", "postal_code", "email_consent", "is_active"];
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updateData[key] = body[key];
  }

  const { data, error } = await serviceClient
    .from("participants")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ participant: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Delete associated records first to avoid FK constraint violations
  // Clear attendance
  await serviceClient.from("attendance").delete().eq("participant_id", id);

  // 2. Hard delete participant from database
  const { error } = await serviceClient
    .from("participants")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      code: error.code
    }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
