import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const programmeId = searchParams.get("programme_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const method = searchParams.get("method");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("page_size") ?? "20", 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = serviceClient
    .from("attendance")
    .select(
      `
      id,
      checked_in_at,
      check_in_method,
      notes,
      participant_id,
      programme_id,
      session_id,
      participants(full_name, email),
      programmes(name, colour),
      sessions(session_date)
      `,
      { count: "exact" }
    )
    .order("checked_in_at", { ascending: false })
    .range(from, to);

  if (sessionId) query = query.eq("session_id", sessionId);
  if (programmeId) query = query.eq("programme_id", programmeId);
  if (method) query = query.eq("check_in_method", method);
  if (dateFrom) query = query.gte("checked_in_at", `${dateFrom}T00:00:00+08:00`);
  if (dateTo) query = query.lte("checked_in_at", `${dateTo}T23:59:59+08:00`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ attendance: data ?? [], total: count ?? 0 });
}
