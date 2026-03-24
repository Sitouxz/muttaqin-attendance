import { z } from "zod";

export const CreateProgrammeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex colour"),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export const UpdateProgrammeSchema = CreateProgrammeSchema.partial();

export type CreateProgrammeInput = z.infer<typeof CreateProgrammeSchema>;
export type UpdateProgrammeInput = z.infer<typeof UpdateProgrammeSchema>;
