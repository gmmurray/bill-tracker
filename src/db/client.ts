import { env } from 'cloudflare:workers';

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(database: CloudflareBindings['DB'] = env.DB) {
  return drizzle(database, { schema });
}

export type Database = ReturnType<typeof getDb>;
