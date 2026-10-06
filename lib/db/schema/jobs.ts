import { sql } from 'drizzle-orm';
import { datetime, index, int, json, mysqlEnum, mysqlTable, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const statusJob = ['menunggu', 'berjalan', 'selesai', 'gagal'] as const;
export type StatusJob = (typeof statusJob)[number];

/** Pekerjaan lambat (PDF, email). Pengganti antrean di Script Properties. */
export const jobs = mysqlTable('jobs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  jenis: varchar('jenis', { length: 40 }).notNull(),
  payload: json('payload').$type<Record<string, unknown>>().notNull(),
  status: mysqlEnum('status', statusJob).notNull().default('menunggu'),
  percobaan: int('percobaan').notNull().default(0),
  errorTerakhir: text('error_terakhir'),
  // Pengganti _kirimSekali: satu job per (dokumen, jenis aksi).
  kunciIdempoten: varchar('kunci_idempoten', { length: 150 }).notNull(),
  jalanSetelah: datetime('jalan_setelah', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  uniqueIndex('jobs_kunci_idempoten_unique').on(t.kunciIdempoten),
  index('jobs_antrean_idx').on(t.status, t.jalanSetelah),
]);
