import { sql } from 'drizzle-orm';
import { bigint, datetime, index, json, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const auditLog = mysqlTable('audit_log', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }),
  aksi: varchar('aksi', { length: 60 }).notNull(),
  entitas: varchar('entitas', { length: 40 }).notNull(),
  entitasId: varchar('entitas_id', { length: 60 }),
  detail: json('detail').$type<Record<string, unknown>>(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  index('audit_log_entitas_idx').on(t.entitas, t.entitasId),
  index('audit_log_created_idx').on(t.createdAt),
]);
