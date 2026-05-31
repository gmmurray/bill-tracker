import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';

export const paySchedules = sqliteTable(
  'pay_schedules',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    anchorDay: integer('anchor_day').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  table => [
    index('pay_schedules_user_id_idx').on(table.userId),
    index('pay_schedules_user_active_anchor_idx').on(
      table.userId,
      table.isActive,
      table.anchorDay,
    ),
  ],
);

export const bills = sqliteTable(
  'bills',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    payScheduleId: text('pay_schedule_id').references(() => paySchedules.id),
    name: text('name').notNull(),
    amountExpected: integer('amount_expected').notNull(),
    dueDayOfMonth: integer('due_day_of_month').notNull(),
    paymentUrl: text('payment_url'),
    isAutoPay: integer('is_auto_pay', { mode: 'boolean' })
      .notNull()
      .default(false),
    notes: text('notes'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  table => [
    index('bills_user_id_idx').on(table.userId),
    index('bills_user_active_due_day_idx').on(
      table.userId,
      table.isActive,
      table.dueDayOfMonth,
    ),
    index('bills_pay_schedule_id_idx').on(table.payScheduleId),
  ],
);

export const billInstances = sqliteTable(
  'bill_instances',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    billId: text('bill_id')
      .notNull()
      .references(() => bills.id),

    dueDate: text('due_date').notNull(),
    amountActual: integer('amount_actual').notNull(),
    paidAt: integer('paid_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  table => [
    unique('bill_instances_bill_id_due_date_unique').on(
      table.billId,
      table.dueDate,
    ),
    index('bill_instances_user_due_date_idx').on(table.userId, table.dueDate),
    index('bill_instances_user_bill_due_date_idx').on(
      table.userId,
      table.billId,
      table.dueDate,
    ),
  ],
);
