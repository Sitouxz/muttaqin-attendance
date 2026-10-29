import { formatInTimeZone } from "date-fns-tz";
import { SGT_TIMEZONE } from "@/lib/utils/constants";

// Programmes are matched by name, so renaming one in the dashboard must be
// mirrored here or the Monday cron will refuse to run.
export const MAIN_PROGRAMME_NAME = "Kuliah 300 Hadith Bimbingan";

// The Nth Wednesday of the month runs activity N. A 5th Wednesday has the
// kuliah only, as staff ran it on 30 Sep 2026 before this was automated.
export const ACTIVE_AGEING_ROTATION = [
  { title: "Senaman Bersama HPB", programmeName: "Active Ageing Activity" },
  { title: "Sesi kraf tangan oleh Methodist Welfare Services", programmeName: "Creativity & Craft" },
  { title: "Sesi Minda Aktif bersama Allkin", programmeName: "Brain Fitness" },
  { title: "Jom Bersukan! bersama Sunlove", programmeName: "Active Sports" },
] as const;

export interface PlannedSession {
  session_date: string;
  title: string;
  programmeName: string;
  start_time: string;
  end_time: string;
}

function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday and Wednesday (yyyy-MM-dd) of the Mon–Sun week containing `now`, in SGT. */
export function weekOfSGT(now: Date): { monday: string; wednesday: string } {
  const today = formatInTimeZone(now, SGT_TIMEZONE, "yyyy-MM-dd");
  const isoDay = Number(formatInTimeZone(now, SGT_TIMEZONE, "i")); // 1 = Mon … 7 = Sun
  const monday = addDaysToDateString(today, 1 - isoDay);
  return { monday, wednesday: addDaysToDateString(monday, 2) };
}

/** 1 for the first occurrence of that weekday in its month, 2 for the second, … */
export function weekOfMonth(date: string): number {
  return Math.ceil(Number(date.slice(8, 10)) / 7);
}

export function planWednesdaySessions(wednesday: string): PlannedSession[] {
  const sesi = weekOfMonth(wednesday);
  const activity = ACTIVE_AGEING_ROTATION[sesi - 1];

  const kuliah: PlannedSession = {
    session_date: wednesday,
    title: activity ? `Sesi ${sesi}: ${MAIN_PROGRAMME_NAME}` : MAIN_PROGRAMME_NAME,
    programmeName: MAIN_PROGRAMME_NAME,
    start_time: "09:00",
    end_time: "10:30",
  };
  if (!activity) return [kuliah];

  return [
    kuliah,
    {
      session_date: wednesday,
      title: `Sesi ${sesi}: ${activity.title}`,
      programmeName: activity.programmeName,
      start_time: "11:00",
      end_time: "12:00",
    },
  ];
}

interface SortableSession {
  session_date: string;
  start_time: string | null;
  session_programmes: Array<{ programmes: { is_default: boolean } | null }>;
}

export function isMainSession(session: Pick<SortableSession, "session_programmes">): boolean {
  return session.session_programmes.some((sp) => sp.programmes?.is_default);
}

/** Latest date first; within a date the main programme leads, then by start time. */
export function sortSessionsMainFirst<T extends SortableSession>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) => {
    if (a.session_date !== b.session_date) return a.session_date < b.session_date ? 1 : -1;
    const main = Number(isMainSession(b)) - Number(isMainSession(a));
    if (main !== 0) return main;
    return (a.start_time ?? "99").localeCompare(b.start_time ?? "99");
  });
}
