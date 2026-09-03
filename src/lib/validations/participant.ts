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
