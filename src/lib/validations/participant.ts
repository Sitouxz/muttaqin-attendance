import { z } from "zod";

export const PARTICIPANT_CATEGORIES = ["warga_emas", "penjaga", "kedua_dua", "selain"] as const;
export type ParticipantCategory = typeof PARTICIPANT_CATEGORIES[number];

export const REGISTRATION_CHANNELS = ["email", "whatsapp"] as const;
export type RegistrationChannel = typeof REGISTRATION_CHANNELS[number];

// Registration makes people pick one; "unspecified" only exists for rows that
// predate the gender column, so admins need it as an editable value.
export const GENDERS = ["male", "female", "unspecified"] as const;
export type Gender = typeof GENDERS[number];

export const RegisterSchema = z
  .object({
    full_name: z.string().min(2).max(100),
    reg_channel: z.enum(REGISTRATION_CHANNELS),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    phone: z.string().regex(/^[89]\d{7}$/, "Phone must be a valid Singapore mobile number (8 or 9 followed by 7 digits)"),
    age: z.number().int().min(1).max(120),
    gender: z.enum(["male", "female"]),
    postal_code: z.string().regex(/^\d{6}$/, "Postal code must be 6 digits"),
    participant_category: z.enum(PARTICIPANT_CATEGORIES),
  })
  .refine((data) => data.reg_channel !== "email" || Boolean(data.email), {
    path: ["email"],
    message: "Email is required when registering by email",
  });

// Admin edits: every field optional, unknown keys stripped by zod. Values are
// checked here so a bad gender/category is a 400 instead of a raw Postgres
// CHECK-constraint error surfacing in the dialog.
export const ParticipantAdminUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  phone: z.string().regex(/^[89]\d{7}$/, "Phone must be a valid Singapore mobile number (8 or 9 followed by 7 digits)").optional(),
  age: z.number().int().min(1).max(120).optional(),
  gender: z.enum(GENDERS).optional(),
  postal_code: z.string().regex(/^\d{6}$/, "Postal code must be 6 digits").optional(),
  participant_category: z.enum(PARTICIPANT_CATEGORIES).optional(),
  email_consent: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const RetrieveQrRequestSchema = z.object({
  email: z.string().email(),
});

export const RetrieveQrVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ParticipantAdminUpdateInput = z.infer<typeof ParticipantAdminUpdateSchema>;
export type RetrieveQrRequestInput = z.infer<typeof RetrieveQrRequestSchema>;
export type RetrieveQrVerifyInput = z.infer<typeof RetrieveQrVerifySchema>;
