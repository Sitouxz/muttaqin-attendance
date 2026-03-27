import { z } from "zod";

const AgendaItemSchema = z.object({
  title: z.string().min(1).max(200),
});

export const CreateSessionSchema = z.object({
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(200).optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).default("draft"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  notes: z.string().optional(),
  programme_ids: z.array(z.string().uuid()).min(1),
  agenda: z.array(AgendaItemSchema).optional(),
});

export const UpdateSessionSchema = CreateSessionSchema.partial().extend({
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
