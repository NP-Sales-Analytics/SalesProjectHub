import { sql } from 'drizzle-orm';
import { bigint, datetime, decimal, int, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const produk = mysqlTable('produk', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nama: varchar('nama', { length: 200 }).notNull(),
  jenisRm: varchar('jenis_rm', { length: 50 }).notNull().default(''),
  warna: varchar('warna', { length: 100 }).notNull().default(''),
  kemasan: varchar('kemasan', { length: 50 }).notNull().default(''),
  fp1: bigint('fp1', { mode: 'number' }).notNull().default(0),
  fp2: bigint('fp2', { mode: 'number' }).notNull().default(0),
  fp3: bigint('fp3', { mode: 'number' }).notNull().default(0),
  fp4: bigint('fp4', { mode: 'number' }).notNull().default(0),
  sg: decimal('sg', { precision: 10, scale: 4 }),
  dft: int('dft'),
  coverage: varchar('coverage', { length: 50 }),
  hargaDefault: bigint('harga_default', { mode: 'number' }),
  hargaRetail: bigint('harga_retail', { mode: 'number' }),
  coverageTeoritis: decimal('coverage_teoritis', { precision: 10, scale: 4 }),
  satuan: varchar('satuan', { length: 20 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  // Kombinasi inilah yang dicek isStandardOffer.
  uniqueIndex('produk_kombinasi_unique').on(t.nama, t.jenisRm, t.warna, t.kemasan),
]);
