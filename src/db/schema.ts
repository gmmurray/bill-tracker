import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';
import { BILL_CATEGORIES } from '#/features/bills/bills-constants';

const isoNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const paySchedules = sqliteTable(
  'pay_schedules',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    payDate: integer('pay_date').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').default(isoNow).notNull(),
    updatedAt: text('updated_at')
      .default(isoNow)
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
  },
  table => [
    index('pay_schedules_user_id_idx').on(table.userId),
    index('pay_schedules_user_active_pay_date_idx').on(
      table.userId,
      table.isActive,
      table.payDate,
    ),
  ],
);

export const bills = sqliteTable(
  'bills',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    payScheduleId: text('pay_schedule_id').references(() => paySchedules.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    amountExpected: integer('amount_expected').notNull(),
    dueDayOfMonth: integer('due_day_of_month').notNull(),
    paymentUrl: text('payment_url'),
    isAutoPay: integer('is_auto_pay', { mode: 'boolean' })
      .notNull()
      .default(false),
    notes: text('notes'),
    category: text('category', { enum: BILL_CATEGORIES }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').default(isoNow).notNull(),
    updatedAt: text('updated_at')
      .default(isoNow)
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
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
      .references(() => bills.id, { onDelete: 'cascade' }),

    dueDate: text('due_date').notNull(),
    amountActual: integer('amount_actual').notNull(),
    paidAt: text('paid_at').notNull().default(isoNow),
    createdAt: text('created_at').default(isoNow).notNull(),
    updatedAt: text('updated_at')
      .default(isoNow)
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
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
