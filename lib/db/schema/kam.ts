import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const kam = mysqlTable('kam', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nama: varchar('nama', { length: 150 }).notNull(),
  manager: varchar('manager', { length: 200 }),
  email: varchar('email', { length: 500 }),
  emailSpec: varchar('email_spec', { length: 500 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [uniqueIndex('kam_nama_unique').on(t.nama)]);
