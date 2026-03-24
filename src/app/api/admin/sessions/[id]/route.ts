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
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session, error } = await serviceClient
    .from("sessions")
    .select(
      `
      *,
      session_programmes(programme_id, programmes(id, name, colour))
      `
    )
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { count: attendanceCount } = await serviceClient
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id);

  return NextResponse.json({ session, attendance_count: attendanceCount ?? 0 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { programme_ids, ...fields } = body;

  // Update session fields
  const updateData: Record<string, unknown> = {};
  const allowedFields = ["session_date", "title", "start_time", "end_time", "notes", "status"];
  for (const key of allowedFields) {
    if (key in fields) {
      updateData[key] = fields[key] === "" ? null : fields[key];
    }
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await serviceClient
      .from("sessions")
      .update(updateData)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync session_programmes if provided
  if (Array.isArray(programme_ids)) {
    await serviceClient.from("session_programmes").delete().eq("session_id", id);
    if (programme_ids.length > 0) {
      const spRows = programme_ids.map((pid: string) => ({
        session_id: id,
        programme_id: pid,
      }));
      await serviceClient.from("session_programmes").insert(spRows);
    }
  }

  const { data: session } = await serviceClient
    .from("sessions")
    .select("*, session_programmes(programme_id, programmes(id, name, colour))")
    .eq("id", id)
    .single();

  return NextResponse.json({ session });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await serviceClient
    .from("sessions")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
