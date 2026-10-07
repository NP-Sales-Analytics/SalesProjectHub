import { sql } from 'drizzle-orm';
import { datetime, mysqlEnum, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const kategoriOrganisasi = ['reguler', 'spec', 'safl'] as const;
export type KategoriOrganisasi = (typeof kategoriOrganisasi)[number];

export const organisasi = mysqlTable('organisasi', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nama: varchar('nama', { length: 150 }).notNull(),
  singkatan: varchar('singkatan', { length: 10 }),
  managerEmail: varchar('manager_email', { length: 500 }),
  // Pengganti konstanta SPEC_PROJECT_ORGS / SAFL_PROJECT_ORGS.
  kategori: mysqlEnum('kategori', kategoriOrganisasi).notNull().default('reguler'),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [uniqueIndex('organisasi_nama_unique').on(t.nama)]);
