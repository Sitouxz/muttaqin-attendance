export const APP_NAME = "Santunan Emas";
export const APP_NAME_FULL = "Santunan Emas — Muttaqin Attendance";

export const SESSION_STATUSES = ["draft", "active", "completed", "cancelled"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const CHECK_IN_METHODS = ["qr_scan", "manual", "walk_in"] as const;
export type CheckInMethod = (typeof CHECK_IN_METHODS)[number];

export const SESSION_STATUS_LABELS: Record<SessionStatus, { my: string; en: string; colour: string }> = {
  draft:     { my: "Draf",      en: "Draft",     colour: "#6B7280" },
  active:    { my: "Aktif",     en: "Active",    colour: "#10B981" },
  completed: { my: "Selesai",   en: "Completed", colour: "#3B82F6" },
  cancelled: { my: "Dibatal",   en: "Cancelled", colour: "#EF4444" },
};

export const CHECK_IN_METHOD_LABELS: Record<CheckInMethod, { my: string; en: string }> = {
  qr_scan: { my: "Imbas QR",    en: "QR Scan"      },
  manual:  { my: "Manual",      en: "Manual"        },
  walk_in: { my: "Masuk Tanpa Daftar", en: "Walk-in" },
};

export const SGT_TIMEZONE = "Asia/Singapore";
