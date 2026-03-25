import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { todaySGT } from "@/lib/utils/format";
import { SGT_TIMEZONE } from "@/lib/utils/constants";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfMonth } from "date-fns";

export async function GET() {
  // Auth check
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // total_participants
  const { count: totalParticipants } = await serviceClient
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  // sessions_this_month
  const nowSGT = toZonedTime(new Date(), SGT_TIMEZONE);
  const firstOfMonth = startOfMonth(nowSGT);
  const firstOfMonthStr = `${firstOfMonth.getFullYear()}-${String(firstOfMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const { count: sessionsThisMonth } = await serviceClient
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .gte("session_date", firstOfMonthStr);

  // attendance_today: checked_in_at >= today 00:00 SGT
  const todayStr = todaySGT();
  const todayStart = fromZonedTime(`${todayStr}T00:00:00`, SGT_TIMEZONE);

  const { count: attendanceToday } = await serviceClient
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .gte("checked_in_at", todayStart.toISOString());

  // top_programmes: attendance count per programme
  const { data: attendanceRows } = await serviceClient
    .from("attendance")
    .select("programme_id");

  // Count per programme_id
  const programmeCounts: Record<string, number> = {};
  for (const row of attendanceRows ?? []) {
    programmeCounts[row.programme_id] = (programmeCounts[row.programme_id] ?? 0) + 1;
  }

  // Fetch programme details
  const programmeIds = Object.keys(programmeCounts);
  let topProgrammes: { name: string; colour: string; count: number }[] = [];

  if (programmeIds.length > 0) {
    const { data: progs } = await serviceClient
      .from("programmes")
      .select("id, name, colour")
      .in("id", programmeIds);

    topProgrammes = (progs ?? [])
      .map((p) => ({
        name: p.name,
        colour: p.colour,
        count: programmeCounts[p.id] ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  return NextResponse.json({
    total_participants: totalParticipants ?? 0,
    sessions_this_month: sessionsThisMonth ?? 0,
    attendance_today: attendanceToday ?? 0,
    top_programmes: topProgrammes,
  });
}
