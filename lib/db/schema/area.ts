import { sql } from 'drizzle-orm';
import { datetime, int, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const area = mysqlTable('area', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nama: varchar('nama', { length: 100 }).notNull(),
  // Dipakai di nomor penawaran (…/JKT). NULL = fallback 3 huruf nama area.
  singkatan: varchar('singkatan', { length: 5 }),
  urutan: int('urutan'),
  emailApproval: varchar('email_approval', { length: 500 }),
  emailApprovalSpec: varchar('email_approval_spec', { length: 500 }),
  emailApprovalSafl: varchar('email_approval_safl', { length: 500 }),
  emailCc: varchar('email_cc', { length: 1000 }),
  ccPdf: varchar('cc_pdf', { length: 500 }),
  ccPdfSpec: varchar('cc_pdf_spec', { length: 500 }),
  ccPdfSafl: varchar('cc_pdf_safl', { length: 500 }),
  dearEmail: varchar('dear_email', { length: 200 }),
  dearEmailSpec: varchar('dear_email_spec', { length: 200 }),
  dearEmailSafl: varchar('dear_email_safl', { length: 200 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  uniqueIndex('area_nama_unique').on(t.nama),
  uniqueIndex('area_singkatan_unique').on(t.singkatan),
]);
