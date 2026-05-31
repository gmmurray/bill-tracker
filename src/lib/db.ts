import { getDb } from '#/db/client';
import { paySchedules } from '#/db/schema';

export async function getSchedules() {
  return getDb().select().from(paySchedules);
}
