import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '#/db/client';
import { paySchedules } from '#/db/schema';
import { requireAuth } from '#/features/auth/auth-service';

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
