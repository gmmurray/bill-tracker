import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { paySchedules } from '#/db/schema';

export type PaySchedule = typeof paySchedules.$inferSelect;

export const createPayScheduleSchema = createInsertSchema(paySchedules)
  .pick({
    name: true,
    anchorDay: true,
  })
  .extend({
    name: z.string().min(1).max(100),
    anchorDay: z.number().int().min(1).max(31),
  });

export const updatePayScheduleSchema = createPayScheduleSchema
  .partial()
  .extend({ id: z.string() });

export type CreatePayScheduleInput = z.infer<typeof createPayScheduleSchema>;
export type UpdatePayScheduleInput = z.infer<typeof updatePayScheduleSchema>;
