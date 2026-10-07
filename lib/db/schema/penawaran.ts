import { sql } from 'drizzle-orm';
import { bigint, date, datetime, index, int, mysqlEnum, mysqlTable, primaryKey, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const statusPenawaran = ['Pending Admin', 'Pending Approve', 'Approved', 'Approved (Revisi)', 'Ditolak'] as const;
export type StatusPenawaran = (typeof statusPenawaran)[number];

export const penawaran = mysqlTable('penawaran', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nomor: varchar('nomor', { length: 60 }).notNull(),
  tanggal: date('tanggal', { mode: 'string' }).notNull(),
  status: mysqlEnum('status', statusPenawaran).notNull(),
  // Snapshot teks: dokumen historis tidak ikut berubah bila master diubah.
  organisasi: varchar('organisasi', { length: 150 }),
  kam: varchar('kam', { length: 150 }),
  namaSales: varchar('nama_sales', { length: 150 }),
  area: varchar('area', { length: 100 }),
  franco: varchar('franco', { length: 255 }),
  perusahaan: varchar('perusahaan', { length: 255 }),
  pic: varchar('pic', { length: 200 }),
  telepon: varchar('telepon', { length: 100 }),
  email: varchar('email', { length: 255 }),
  namaProyek: varchar('nama_proyek', { length: 500 }),
  alamat: text('alamat'),
  catatanApproval: text('catatan_approval'),
  approver: varchar('approver', { length: 200 }),
  approvedAt: datetime('approved_at', { mode: 'date', fsp: 3 }),
  dibuatOlehUserId: varchar('dibuat_oleh_user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  dibuatOlehEmail: varchar('dibuat_oleh_email', { length: 255 }),
  pdfFileId: varchar('pdf_file_id', { length: 100 }),
  pdfUrl: varchar('pdf_url', { length: 500 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  uniqueIndex('penawaran_nomor_unique').on(t.nomor),
  index('penawaran_status_idx').on(t.status),
  index('penawaran_area_org_idx').on(t.area, t.organisasi),
  index('penawaran_sales_idx').on(t.namaSales),
  index('penawaran_tanggal_idx').on(t.tanggal),
]);

export const penawaranItem = mysqlTable('penawaran_item', {
  penawaranId: varchar('penawaran_id', { length: 36 }).notNull().references(() => penawaran.id, { onDelete: 'cascade' }),
  noItem: int('no_item').notNull(),
  jenisProduk: varchar('jenis_produk', { length: 100 }),
  tier: varchar('tier', { length: 20 }),
  namaProduk: varchar('nama_produk', { length: 255 }),
  jenisRm: varchar('jenis_rm', { length: 50 }),
  warna: varchar('warna', { length: 100 }),
  kemasan: varchar('kemasan', { length: 50 }),
  kodeWarna: varchar('kode_warna', { length: 255 }),
  catatanAdmin: text('catatan_admin'),
  hargaSatuan: bigint('harga_satuan', { mode: 'number' }).notNull().default(0),
  hargaEdit: bigint('harga_edit', { mode: 'number' }).notNull().default(0),
}, (t) => [primaryKey({ columns: [t.penawaranId, t.noItem] })]);
