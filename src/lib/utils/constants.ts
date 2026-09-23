import type { Gender, ParticipantCategory } from "@/lib/validations/participant";

export const APP_NAME = "Santunan Emas";
export const APP_NAME_FULL = "Santunan Emas — Muttaqin Attendance";

export const SESSION_STATUSES = ["draft", "active", "completed", "cancelled"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const CHECK_IN_METHODS = ["qr_scan", "manual", "walk_in"] as const;
export type CheckInMethod = (typeof CHECK_IN_METHODS)[number];

export const SESSION_STATUS_LABELS: Record<SessionStatus, { my: string; en: string; colour: string }> = {
  draft:     { my: "Draf",      en: "Draft",     colour: "#6B7280" },
  active:    { my: "Aktif",     en: "Active",    colour: "#10B981" },
  completed: { my: "Selesai",   en: "Completed", colour: "#F59E0B" },
  cancelled: { my: "Dibatal",   en: "Cancelled", colour: "#EF4444" },
};

export const CHECK_IN_METHOD_LABELS: Record<CheckInMethod, { my: string; en: string }> = {
  qr_scan: { my: "Imbas QR",    en: "QR Scan"      },
  manual:  { my: "Manual",      en: "Manual"        },
  walk_in: { my: "Masuk Tanpa Daftar", en: "Walk-in" },
};

// Same wording as the public registration form, so what an admin reads back
// matches what the registrant was asked.
export const GENDER_LABELS: Record<Gender, { my: string; en: string }> = {
  male:        { my: "Lelaki",           en: "Male"        },
  female:      { my: "Perempuan",        en: "Female"      },
  unspecified: { my: "Tidak Dinyatakan", en: "Unspecified" },
};

export const PARTICIPANT_CATEGORY_LABELS: Record<ParticipantCategory, { my: string; en: string }> = {
  warga_emas: { my: "Warga Emas",                       en: "Senior Citizen" },
  penjaga:    { my: "Penjaga",                          en: "Caregiver"      },
  kedua_dua:  { my: "Kedua-dua (Warga Emas & Penjaga)", en: "Both (Senior Citizen & Caregiver)" },
  selain:     { my: "Selain yang di atas",              en: "Others"         },
};

export const SGT_TIMEZONE = "Asia/Singapore";
