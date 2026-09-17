import { z } from "zod";

export const PARTICIPANT_CATEGORIES = ["warga_emas", "penjaga", "kedua_dua", "selain"] as const;
export type ParticipantCategory = typeof PARTICIPANT_CATEGORIES[number];

export const REGISTRATION_CHANNELS = ["email", "whatsapp"] as const;
export type RegistrationChannel = typeof REGISTRATION_CHANNELS[number];

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

export const RetrieveQrRequestSchema = z.object({
  email: z.string().email(),
});

export const RetrieveQrVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type RetrieveQrRequestInput = z.infer<typeof RetrieveQrRequestSchema>;
export type RetrieveQrVerifyInput = z.infer<typeof RetrieveQrVerifySchema>;

export const GENDERS = ["male", "female", "unspecified"] as const;
export type Gender = typeof GENDERS[number];

/**
 * A Singapore mobile as people actually type it — "+65 9123 4567", "6591234567",
 * "9123 4567" — normalised to the bare 8 digits the `participants.phone` column
 * stores. The leading `65` strip is unambiguous: a stored number always starts
 * with 8 or 9, so a bare 8-digit value can never begin with 65.
 */
export const SgMobileSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, "").replace(/^65(?=\d{8}$)/, ""))
  .refine((value) => /^[89]\d{7}$/.test(value), {
    message: "Enter a valid Singapore mobile number",
  });

/** "Dapatkan QR Saya" over WhatsApp: the phone is the only thing asked for. */
export const RetrieveQrWhatsAppSchema = z.object({
  phone: SgMobileSchema,
});

/**
 * Admin edit of a participant. Every field is optional (the form PATCHes a
 * partial), and `email` may be cleared: a WhatsApp-route registrant never had
 * one, and the DB only requires that *some* contact remains — phone always does.
 */
export const ParticipantUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  phone: SgMobileSchema.optional(),
  age: z.number().int().min(1).max(120).optional(),
  gender: z.enum(GENDERS).optional(),
  postal_code: z.string().regex(/^\d{6}$/, "Postal code must be 6 digits").optional(),
  participant_category: z.enum(PARTICIPANT_CATEGORIES).optional(),
  is_active: z.boolean().optional(),
  email_consent: z.boolean().optional(),
});

export type RetrieveQrWhatsAppInput = z.infer<typeof RetrieveQrWhatsAppSchema>;
export type ParticipantUpdateInput = z.infer<typeof ParticipantUpdateSchema>;
