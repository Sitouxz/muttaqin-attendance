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
