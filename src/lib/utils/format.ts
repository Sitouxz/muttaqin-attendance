import { formatInTimeZone } from "date-fns-tz";
import { SGT_TIMEZONE } from "./constants";

export function formatSGT(date: Date | string, fmt: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, SGT_TIMEZONE, fmt);
}

export function formatDateSGT(date: Date | string): string {
  return formatSGT(date, "d MMMM yyyy");
}

export function formatDateTimeSGT(date: Date | string): string {
  return formatSGT(date, "d MMM yyyy, h:mm a");
}

export function formatTimeSGT(date: Date | string): string {
  return formatSGT(date, "h:mm a");
}

export function todaySGT(): string {
  return formatSGT(new Date(), "yyyy-MM-dd");
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "2026-09" -> "September 2026". Built from the string's own parts rather than
 * a Date, so a month label can never slip across a timezone boundary.
 */
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const name = MONTH_NAMES[Number(m) - 1];
  return name && year ? `${name} ${year}` : month;
}
