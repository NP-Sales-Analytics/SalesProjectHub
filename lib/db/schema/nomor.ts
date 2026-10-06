import { sql } from 'drizzle-orm';
import { datetime, int, mysqlEnum, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const jenisNomor = ['penawaran', 'estimator'] as const;
export type JenisNomor = (typeof jenisNomor)[number];

/** Satu baris per jenis; di-lock dengan SELECT … FOR UPDATE saat menerbitkan nomor. */
export const nomorUrut = mysqlTable('nomor_urut', {
  jenis: mysqlEnum('jenis', jenisNomor).primaryKey(),
  nilai: int('nilai').notNull().default(0),
});

/** Jejak setiap nomor yang pernah diterbitkan (pengganti tabel COUNTER). */
export const counterLog = mysqlTable('counter_log', {
  jenis: mysqlEnum('jenis', jenisNomor).notNull(),
  nomor: int('nomor').notNull(),
  idDokumen: varchar('id_dokumen', { length: 60 }).notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  primaryKey({ columns: [t.jenis, t.nomor] }),
  uniqueIndex('counter_log_id_dokumen_unique').on(t.idDokumen),
]);
