import { z } from "zod";

export const CheckInSchema = z
  .object({
    qr_token: z.string().uuid().optional(),
    participant_id: z.string().uuid().optional(),
    session_id: z.string().uuid(),
    programme_ids: z.array(z.string().uuid()).min(1, "At least one programme required"),
    check_in_method: z.enum(["qr_scan", "manual", "walk_in"]),
    notes: z.string().optional(),
  })
  .refine((d) => d.qr_token || d.participant_id, {
    message: "Either qr_token or participant_id is required",
  });

export type CheckInInput = z.infer<typeof CheckInSchema>;
