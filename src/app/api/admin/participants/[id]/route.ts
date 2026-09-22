import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { ParticipantAdminUpdateSchema } from "@/lib/validations/participant";

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
  // gender and participant_category were missing from the old allowlist, so the
  // edit dialog posted them and the API silently dropped them -- which is why
  // participants stayed "unspecified" no matter how often they were corrected.
  const parsed = ParticipantAdminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  // WhatsApp registrants have no email; keep that as NULL rather than "".
  if ("email" in updateData) updateData.email = updateData.email || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
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
