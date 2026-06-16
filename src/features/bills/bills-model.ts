import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { type billInstances, bills } from '#/db/schema';

export type Bill = typeof bills.$inferSelect;
export type BillInstance = typeof billInstances.$inferSelect;

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
  scheduleId: 'all' | 'unassigned' | (string & {});
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

export type BillState = 'PAID' | 'OVERDUE' | 'MISSED_SCHEDULE' | 'UPCOMING';

export const logHistoricalPaymentSchema = z.object({
  billId: z.string().uuid(),
  dueDate: z.iso.date().refine(val => new Date(val) <= new Date(), {
    message: 'dueDate must be on or before today',
  }),
  amountActual: z.number().int().positive(),
  paidAt: z.iso.datetime(),
});

export type LogHistoricalPaymentInput = z.infer<
  typeof logHistoricalPaymentSchema
>;

export const listBillsSchema = z.object({
  scheduleId: z
    .union([z.literal('all'), z.literal('unassigned'), z.uuid()])
    .optional(),
  manualOnly: z.boolean().optional(),
});

export const getBillDetailSchema = z.object({
  billId: z.uuid(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

export const billIdSchema = z.object({
  billId: z.uuid(),
});

export const recordBillPaymentSchema = z.object({
  billId: z.uuid(),
  amountActual: z.number().int().positive(),
});

export const updateBillInstanceSchema = z.object({
  instanceId: z.uuid(),
  amountActual: z.number().int().positive(),
});

export const instanceIdSchema = z.object({
  instanceId: z.uuid(),
});

export const bulkAssignBillsSchema = z.object({
  scheduleId: z.uuid().nullable(),
  billIds: z.array(z.uuid()).min(1).max(200),
});

export type BulkAssignBillsInput = z.infer<typeof bulkAssignBillsSchema>;
