import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { subDays } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { SGT_TIMEZONE } from "@/lib/utils/constants";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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

  // Get all unique programmes
  const programmeMap = new Map<string, { name: string; colour: string }>();
  for (const row of rows ?? []) {
    if (row.programmes && !Array.isArray(row.programmes)) {
      programmeMap.set(row.programme_id, {
        name: row.programmes.name,
        colour: row.programmes.colour,
      });
    }
  }

  // Build date range (last 30 days)
  const dateRange: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(nowSGT, i);
    dateRange.push(formatInTimeZone(d, SGT_TIMEZONE, "yyyy-MM-dd"));
  }

  // Initialize data structure
  const dataMap = new Map<string, Record<string, number>>();
  for (const date of dateRange) {
    dataMap.set(date, {});
  }

  // Populate counts
  for (const row of rows ?? []) {
    const dateKey = formatInTimeZone(new Date(row.checked_in_at), SGT_TIMEZONE, "yyyy-MM-dd");
    if (!dataMap.has(dateKey)) continue;
    const progInfo = programmeMap.get(row.programme_id);
    if (!progInfo) continue;
    const day = dataMap.get(dateKey)!;
    day[progInfo.name] = (day[progInfo.name] ?? 0) + 1;
  }

  const data = dateRange.map((date) => ({
    date,
    ...dataMap.get(date),
  }));

  const programmes = Array.from(programmeMap.values());

  return NextResponse.json({ data, programmes });
}
