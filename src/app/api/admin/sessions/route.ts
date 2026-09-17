import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "2026-12" -> "2027-01". Callers guard the format with MONTH_RE first. */
function nextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 12
    ? `${year + 1}-01`
    : `${year}-${String(m + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const month = searchParams.get("month"); // "YYYY-MM"
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("page_size") ?? "20", 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = serviceClient
    .from("sessions")
    .select(
      `
      id,
      session_date,
      title,
      status,
      start_time,
      end_time,
      notes,
      created_at,
      session_programmes(programme_id, programmes(name, colour)),
      session_agenda(id, title, sort_order).order(sort_order)
      `,
      { count: "exact" }
    )
    .order("session_date", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (date) query = query.eq("session_date", date);
  if (month && MONTH_RE.test(month)) {
    query = query
      .gte("session_date", `${month}-01`)
      .lt("session_date", `${nextMonth(month)}-01`);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Months are for the filter's own dropdown, so they span every session
  // regardless of the month currently selected (the status filter still
  // applies — otherwise the dropdown would offer empty months).
  let monthsQuery = serviceClient.from("sessions").select("session_date");
  if (status) monthsQuery = monthsQuery.eq("status", status);
  const { data: monthRows } = await monthsQuery;

  const counts = new Map<string, number>();
  for (const row of monthRows ?? []) {
    const key = String(row.session_date).slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const months = [...counts.entries()]
    .map(([value, count]) => ({ month: value, count }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return NextResponse.json({ sessions: data ?? [], total: count ?? 0, months });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { session_date, title, start_time, end_time, notes, programme_ids = [], agenda = [], status } = body;

  if (!session_date) {
    return NextResponse.json({ error: "session_date is required" }, { status: 400 });
  }

  const { data: newSession, error: sessionError } = await serviceClient
    .from("sessions")
    .insert({
      session_date,
      title: title || null,
      start_time: start_time || null,
      end_time: end_time || null,
      notes: notes || null,
      status: status === "active" ? "active" : "draft",
    })
    .select()
    .single();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Insert session_programmes
  if (programme_ids.length > 0) {
    const spRows = programme_ids.map((pid: string) => ({
      session_id: newSession.id,
      programme_id: pid,
    }));
    await serviceClient.from("session_programmes").insert(spRows);
  }

  // Insert session_agenda
  if (agenda.length > 0) {
    const agendaRows = agenda.map((item: { title: string }, i: number) => ({
      session_id: newSession.id,
      title: item.title,
      sort_order: i,
    }));
    const { error: agendaError } = await serviceClient.from("session_agenda").insert(agendaRows);
    if (agendaError) return NextResponse.json({ error: agendaError.message }, { status: 500 });
  }

  return NextResponse.json({ session: newSession }, { status: 201 });
}
