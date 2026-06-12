import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq, sql } from 'drizzle-orm';
import { getDb } from '#/db/client';
import { paySchedules } from '#/db/schema';
import { getAuthUserId, requireAuth } from '#/features/auth/auth-service';
import { NotFoundError } from '#/lib/errors';
import {
  createPayScheduleSchema,
  scheduleIdSchema,
  updatePayScheduleSchema,
} from './pay-schedules-model';

export const listPaySchedules = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { userId } = await requireAuth({ data: {} });
    if (!userId) throw new Error('Unauthorized');

    const db = getDb();
    return db
      .select()
      .from(paySchedules)
      .where(
        and(eq(paySchedules.userId, userId), eq(paySchedules.isActive, true)),
      )
      .orderBy(asc(paySchedules.anchorDay));
  },
);

export const getPayScheduleDetail = createServerFn({ method: 'GET' })
  .validator(scheduleIdSchema)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth({ data: {} });
    const db = getDb();

    const [schedule] = await db
      .select()
      .from(paySchedules)
      .where(
        and(
          eq(paySchedules.id, data.scheduleId),
          eq(paySchedules.userId, userId),
          eq(paySchedules.isActive, true),
        ),
      );

    if (!schedule) throw new NotFoundError('Pay schedule not found');
    return schedule;
  });

export const createPaySchedule = createServerFn({ method: 'POST' })
  .validator(createPayScheduleSchema)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const db = getDb();

    const [created] = await db
      .insert(paySchedules)
      .values({
        id: crypto.randomUUID(),
        userId,
        name: data.name,
        anchorDay: data.anchorDay,
      })
      .returning();

    if (!created) throw new Error('Failed to insert pay schedule');
    return created;
  });

export const updatePaySchedule = createServerFn({ method: 'POST' })
  .validator(updatePayScheduleSchema)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const { id, ...updateFields } = data;

    const setValues = Object.fromEntries(
      Object.entries(updateFields).filter(([, v]) => v !== undefined),
    ) as Partial<typeof paySchedules.$inferInsert>;

    const db = getDb();

    const [updated] = await db
      .update(paySchedules)
      .set(setValues)
      .where(and(eq(paySchedules.id, id), eq(paySchedules.userId, userId)))
      .returning();

    if (!updated) throw new NotFoundError('Pay schedule not found');
    return updated;
  });

export const archivePaySchedule = createServerFn({ method: 'POST' })
  .validator(scheduleIdSchema)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const db = getDb();
    await db
      .update(paySchedules)
      .set({ isActive: false })
      .where(
        and(
          eq(paySchedules.id, data.scheduleId),
          eq(paySchedules.userId, userId),
        ),
      );
  });

export const getArchivedPaySchedules = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { userId } = await requireAuth({ data: {} });
  const db = getDb();
  return db
    .select()
    .from(paySchedules)
    .where(
      and(eq(paySchedules.userId, userId), eq(paySchedules.isActive, false)),
    )
    .orderBy(asc(paySchedules.name));
});

export const getArchivedPaySchedulesCount = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { userId } = await requireAuth({ data: {} });
  const db = getDb();
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(paySchedules)
    .where(
      and(eq(paySchedules.userId, userId), eq(paySchedules.isActive, false)),
    );
  return { count: result?.count ?? 0 };
});

export const restorePaySchedule = createServerFn({ method: 'POST' })
  .validator(scheduleIdSchema)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const db = getDb();
    await db
      .update(paySchedules)
      .set({ isActive: true })
      .where(
        and(
          eq(paySchedules.id, data.scheduleId),
          eq(paySchedules.userId, userId),
        ),
      );
  });

export const deletePaySchedule = createServerFn({ method: 'POST' })
  .validator(scheduleIdSchema)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const db = getDb();
    await db
      .delete(paySchedules)
      .where(
        and(
          eq(paySchedules.id, data.scheduleId),
          eq(paySchedules.userId, userId),
        ),
      );
  });
