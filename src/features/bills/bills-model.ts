import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { type billInstances, bills, type paySchedules } from '#/db/schema';

export type Bill = typeof bills.$inferSelect;
export type BillInstance = typeof billInstances.$inferSelect;
export type PaySchedule = typeof paySchedules.$inferSelect;

export type BillWithSchedule = Bill & {
  scheduleName: string | null;
  scheduleIsActive: boolean | null;
  isOrphaned: boolean;
};

export type BillDetail = BillWithSchedule & {
  instances: BillInstance[];
  instancesTotal: number;
};

export type BillListFilters = {
  scheduleId: string | 'unassigned' | 'all';
  manualOnly: boolean;
};

export const createBillSchema = createInsertSchema(bills)
  .pick({
    name: true,
    amountExpected: true,
    dueDayOfMonth: true,
    payScheduleId: true,
    paymentUrl: true,
    isAutoPay: true,
    notes: true,
  })
  .extend({
    name: z.string().min(1).max(100),
    amountExpected: z.number().int().min(1),
    dueDayOfMonth: z.number().int().min(1).max(31),
    payScheduleId: z.string().uuid().nullable().optional(),
    paymentUrl: z.string().url().nullable().optional(),
    isAutoPay: z.boolean().default(false),
    notes: z.string().max(500).nullable().optional(),
  });

export const updateBillSchema = createBillSchema.partial().extend({
  id: z.string(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
