import { sql } from 'drizzle-orm';
import { datetime, index, int, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { organisasi } from './organisasi';

export const sales = mysqlTable('sales', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nama: varchar('nama', { length: 150 }).notNull(),
  email: varchar('email', { length: 255 }),
  // Teks, bukan FK: data lama memuat nama area yang tidak selalu ada di master.
  area: varchar('area', { length: 100 }),
  sapCode: varchar('sap_code', { length: 50 }),
  manager: varchar('manager', { length: 200 }),
  noUrut: int('no_urut'),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  uniqueIndex('sales_nama_unique').on(t.nama),
  index('sales_email_idx').on(t.email),
]);

/** Satu sales bisa bertugas di lebih dari satu organisasi. */
export const salesOrganisasi = mysqlTable('sales_organisasi', {
  salesId: varchar('sales_id', { length: 36 }).notNull().references(() => sales.id, { onDelete: 'cascade' }),
  organisasiId: varchar('organisasi_id', { length: 36 }).notNull().references(() => organisasi.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.salesId, t.organisasiId] })]);
