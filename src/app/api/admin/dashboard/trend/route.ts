import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { subDays } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { SGT_TIMEZONE } from "@/lib/utils/constants";

export const revalidate = 300;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowSGT = toZonedTime(new Date(), SGT_TIMEZONE);
  const thirtyDaysAgo = subDays(nowSGT, 30);
  const fromDate = formatInTimeZone(thirtyDaysAgo, SGT_TIMEZONE, "yyyy-MM-dd");

  // Fetch attendance with programme info for last 30 days
  const { data: rows } = await serviceClient
    .from("attendance")
    .select("checked_in_at, programme_id, programmes(name, colour)")
    .gte("checked_in_at", `${fromDate}T00:00:00+08:00`);

  // Build date range (last 30 days) and initialize data structure
  const dateRange: string[] = [];
  const dataMap = new Map<string, Record<string, number>>();
  for (let i = 29; i >= 0; i--) {
    const d = subDays(nowSGT, i);
    const dateStr = formatInTimeZone(d, SGT_TIMEZONE, "yyyy-MM-dd");
    dateRange.push(dateStr);
    dataMap.set(dateStr, {});
  }

  // Single pass: collect programmes + populate counts
  const programmeMap = new Map<string, { name: string; colour: string }>();
  for (const row of rows ?? []) {
    const prog = row.programmes && !Array.isArray(row.programmes) ? row.programmes : null;
    if (!prog) continue;
    if (!programmeMap.has(row.programme_id)) {
      programmeMap.set(row.programme_id, { name: prog.name, colour: prog.colour });
    }
    const dateKey = formatInTimeZone(new Date(row.checked_in_at), SGT_TIMEZONE, "yyyy-MM-dd");
    const day = dataMap.get(dateKey);
    if (!day) continue;
    day[prog.name] = (day[prog.name] ?? 0) + 1;
  }

  const data = dateRange.map((date) => ({
    date,
    ...dataMap.get(date),
  }));

  const programmes = Array.from(programmeMap.values());

  return NextResponse.json({ data, programmes });
}
