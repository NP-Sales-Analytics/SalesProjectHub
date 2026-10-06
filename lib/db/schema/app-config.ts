import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';

/** Konfigurasi non-rahasia yang dulu hardcode di Kode.js (ID template, folder output, dst). */
export const appConfig = mysqlTable('app_config', {
  kunci: varchar('kunci', { length: 80 }).primaryKey(),
  nilai: text('nilai').notNull(),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
});
