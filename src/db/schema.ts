import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const paySchedules = sqliteTable('pay_schedules', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(), // e.g., "1st of Month"
  anchorDay: integer('anchor_day').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  payScheduleId: text('pay_schedule_id').references(() => paySchedules.id),
  name: text('name').notNull(),
  // Stored in cents (e.g., $15.50 -> 1550)
  amountExpected: integer('amount_expected').notNull(),
  dueDayOfMonth: integer('due_day_of_month').notNull(),
  paymentUrl: text('payment_url'),
  isAutoPay: integer('is_auto_pay', { mode: 'boolean' })
    .notNull()
    .default(false),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const billInstances = sqliteTable(
  'bill_instances',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    billId: text('bill_id')
      .notNull()
      .references(() => bills.id),

    // The normalized cycle identifier (YYYY-MM-DD)
    dueDate: text('due_date').notNull(),

    // Stored in cents (e.g., $15.50 -> 1550)
    amountActual: integer('amount_actual').notNull(),
    status: text('status').notNull().default('PAID'),

    // The exact moment the user hit "Pay" (Unix timestamp)
    paidAt: integer('paid_at', { mode: 'timestamp' }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  table => ({
    // The safety net: Prevents double-paying a bill for the same cycle
    uniqueCycle: unique('unique_bill_per_cycle').on(
      table.billId,
      table.dueDate,
    ),
  }),
);
