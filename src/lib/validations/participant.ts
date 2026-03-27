import { z } from "zod";

export const PARTICIPANT_CATEGORIES = ["warga_emas", "penjaga", "kedua_dua", "selain"] as const;
export type ParticipantCategory = typeof PARTICIPANT_CATEGORIES[number];

export const RegisterSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^[89]\d{7}$/, "Phone must be a valid Singapore mobile number (8 or 9 followed by 7 digits)"),
  age: z.number().int().min(1).max(120),
  postal_code: z.string().regex(/^\d{6}$/, "Postal code must be 6 digits"),
  participant_category: z.enum(PARTICIPANT_CATEGORIES),
  email_consent: z.boolean(),
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
