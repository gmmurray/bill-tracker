import { createServerFn } from '@tanstack/react-start';
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  isNull,
  like,
  sql,
} from 'drizzle-orm';
import { type Database, getDb } from '#/db/client';
import { billInstances, bills, paySchedules } from '#/db/schema';
import { getAuthUserId, requireAuth } from '#/features/auth/auth-service';
import { ConflictError, NotFoundError } from '#/lib/errors';
import { computeNearestUnpaidDueDate } from './bills-helpers';
import {
  type Bill,
  type BillInstance,
  createBillSchema,
  logHistoricalPaymentSchema,
  updateBillSchema,
} from './bills-model';

async function getBillById(
  db: Database,
  userId: string,
  billId: string,
): Promise<Bill | undefined> {
  const [bill] = await db
    .select()
    .from(bills)
    .where(
      and(
        eq(bills.id, billId),
        eq(bills.userId, userId),
        eq(bills.isActive, true),
      ),
    );
  return bill;
}

async function getBillInstancesByBillId(
  db: Database,
  billId: string,
  page: number,
  pageSize: number,
): Promise<{ instances: BillInstance[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const [instances, countResult] = await Promise.all([
    db
      .select()
      .from(billInstances)
      .where(eq(billInstances.billId, billId))
      .orderBy(desc(billInstances.dueDate))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(billInstances)
      .where(eq(billInstances.billId, billId)),
  ]);
  return { instances, total: countResult[0]?.total ?? 0 };
}

export const listBills = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      scheduleId?: string | 'unassigned' | 'all';
      manualOnly?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth({ data: {} });

    const db = getDb();

    const conditions = [eq(bills.userId, userId), eq(bills.isActive, true)];

    if (data.scheduleId && data.scheduleId !== 'all') {
      if (data.scheduleId === 'unassigned') {
        conditions.push(isNull(bills.payScheduleId));
      } else {
        conditions.push(eq(bills.payScheduleId, data.scheduleId));
      }
    }

    if (data.manualOnly) {
      conditions.push(eq(bills.isAutoPay, false));
    }

    const rows = await db
      .select({
        ...getTableColumns(bills),
        scheduleName: paySchedules.name,
        scheduleIsActive: paySchedules.isActive,
      })
      .from(bills)
      .leftJoin(paySchedules, eq(bills.payScheduleId, paySchedules.id))
      .where(and(...conditions))
      .orderBy(asc(bills.dueDayOfMonth));

    return rows.map(row => ({
      ...row,
      isOrphaned: row.payScheduleId !== null && row.scheduleIsActive === false,
    }));
  });

export const getBillDetail = createServerFn({ method: 'GET' })
  .inputValidator((data: { billId: string; page?: number }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth({ data: {} });

    const db = getDb();

    const bill = await getBillById(db, userId, data.billId);
    if (!bill) throw new NotFoundError('Bill not found');

    const page = data.page ?? 1;
    const [{ instances, total }, scheduleRows] = await Promise.all([
      getBillInstancesByBillId(db, data.billId, page, 20),
      bill.payScheduleId
        ? db
            .select()
            .from(paySchedules)
            .where(eq(paySchedules.id, bill.payScheduleId))
        : Promise.resolve([]),
    ]);

    const schedule = scheduleRows[0] ?? null;

    return {
      ...bill,
      scheduleName: schedule?.name ?? null,
      scheduleIsActive: schedule?.isActive ?? null,
      isOrphaned: bill.payScheduleId !== null && schedule?.isActive === false,
      instances,
      instancesTotal: total,
    };
  });

export const getArchivedBills = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { userId } = await requireAuth({ data: {} });

    const db = getDb();
    return db
      .select()
      .from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.isActive, false)))
      .orderBy(asc(bills.name));
  },
);

export const getArchivedBillsCount = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { userId } = await requireAuth({ data: {} });

    const db = getDb();
    const [result] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.isActive, false)));

    return { count: result?.count ?? 0 };
  },
);

export const createBill = createServerFn({ method: 'POST' })
  .inputValidator((data: Parameters<typeof createBillSchema.parse>[0]) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    const parsed = createBillSchema.parse(data);
    const db = getDb();

    const [created] = await db
      .insert(bills)
      .values({
        id: crypto.randomUUID(),
        userId,
        name: parsed.name,
        amountExpected: parsed.amountExpected,
        dueDayOfMonth: parsed.dueDayOfMonth,
        payScheduleId: parsed.payScheduleId ?? null,
        paymentUrl: parsed.paymentUrl ?? null,
        isAutoPay: parsed.isAutoPay ?? false,
        notes: parsed.notes ?? null,
      })
      .returning();

    if (!created) throw new Error('Failed to insert bill');
    return created;
  });

export const updateBill = createServerFn({ method: 'POST' })
  .inputValidator((data: Parameters<typeof updateBillSchema.parse>[0]) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    const parsed = updateBillSchema.parse(data);
    const { id, ...updateFields } = parsed;

    const setValues = Object.fromEntries(
      Object.entries(updateFields).filter(([, v]) => v !== undefined),
    ) as Partial<typeof bills.$inferInsert>;

    const db = getDb();

    const [updated] = await db
      .update(bills)
      .set(setValues)
      .where(and(eq(bills.id, id), eq(bills.userId, userId)))
      .returning();

    if (!updated) throw new NotFoundError('Bill not found');
    return updated;
  });

export const archiveBill = createServerFn({ method: 'POST' })
  .inputValidator((data: { billId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    const db = getDb();
    await db
      .update(bills)
      .set({ isActive: false })
      .where(and(eq(bills.id, data.billId), eq(bills.userId, userId)));
  });

export const listCurrentMonthInstances = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { userId } = await requireAuth({ data: {} });
  const db = getDb();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${month}-%`;

  return db
    .select(getTableColumns(billInstances))
    .from(billInstances)
    .innerJoin(bills, eq(billInstances.billId, bills.id))
    .where(
      and(eq(bills.userId, userId), like(billInstances.dueDate, monthPrefix)),
    );
});

export const recordBillPayment = createServerFn({ method: 'POST' })
  .inputValidator((data: { billId: string; amountActual: number }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth({ data: {} });
    const db = getDb();

    const bill = await getBillById(db, userId, data.billId);
    if (!bill) throw new NotFoundError('Bill not found');

    const existingInstances = await db
      .select()
      .from(billInstances)
      .where(eq(billInstances.billId, data.billId));

    const dueDate = computeNearestUnpaidDueDate(
      bill.dueDayOfMonth,
      existingInstances,
      new Date(),
    );

    try {
      const [created] = await db
        .insert(billInstances)
        .values({
          id: crypto.randomUUID(),
          userId,
          billId: data.billId,
          dueDate,
          amountActual: data.amountActual,
          paidAt: new Date().toISOString(),
        })
        .returning();

      if (!created) throw new Error('Failed to insert bill instance');
      return created;
    } catch (err) {
      if (err instanceof Error && /unique/i.test(err.message)) {
        throw new ConflictError(
          'A payment for this billing cycle already exists',
        );
      }
      throw err;
    }
  });

export const updateBillInstance = createServerFn({ method: 'POST' })
  .inputValidator((data: { instanceId: string; amountActual: number }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth({ data: {} });
    const db = getDb();

    const [updated] = await db
      .update(billInstances)
      .set({ amountActual: data.amountActual })
      .where(
        and(
          eq(billInstances.id, data.instanceId),
          eq(billInstances.userId, userId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError('Bill instance not found');
    return updated;
  });

export const deleteBillInstance = createServerFn({ method: 'POST' })
  .inputValidator((data: { instanceId: string }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth({ data: {} });
    const db = getDb();

    await db
      .delete(billInstances)
      .where(
        and(
          eq(billInstances.id, data.instanceId),
          eq(billInstances.userId, userId),
        ),
      );
  });

export const logHistoricalPayment = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: Parameters<typeof logHistoricalPaymentSchema.parse>[0]) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth({ data: {} });

    const parsed = logHistoricalPaymentSchema.parse(data);
    const db = getDb();

    const bill = await getBillById(db, userId, parsed.billId);
    if (!bill) throw new NotFoundError('Bill not found');

    try {
      const [created] = await db
        .insert(billInstances)
        .values({
          id: crypto.randomUUID(),
          userId,
          billId: parsed.billId,
          dueDate: parsed.dueDate,
          amountActual: parsed.amountActual,
          paidAt: parsed.paidAt,
        })
        .returning();

      if (!created) throw new Error('Failed to insert bill instance');
      return created;
    } catch (err) {
      if (err instanceof Error && /unique/i.test(err.message)) {
        throw new ConflictError(
          'A payment for this billing cycle already exists',
        );
      }
      throw err;
    }
  });

export const deleteBill = createServerFn({ method: 'POST' })
  .inputValidator((data: { billId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const db = getDb();

    await db
      .delete(bills)
      .where(and(eq(bills.id, data.billId), eq(bills.userId, userId)));
  });
