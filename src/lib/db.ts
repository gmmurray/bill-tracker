import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { paySchedules } from '#/db/schema';

export function getDb() {
  return drizzle(env.DB);
}

export async function getSchedules() {
  return getDb().select().from(paySchedules);
}
