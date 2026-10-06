import { sql } from 'drizzle-orm';
import { boolean, datetime, mysqlEnum, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { area } from './area';
import { organisasi } from './organisasi';

export const roles = ['super admin', 'admin', 'manager', 'manager admin', 'sales'] as const;
export type Role = (typeof roles)[number];

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  // Lowercase; login menerima username ATAU email.
  username: varchar('username', { length: 150 }).notNull(),
  namaLengkap: varchar('nama_lengkap', { length: 200 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: mysqlEnum('role', roles).notNull().default('sales'),
  // NULL = belum punya password sah (mis. legacy plaintext) -> wajib reset.
  passwordHash: varchar('password_hash', { length: 255 }),
  wajibGantiPassword: boolean('wajib_ganti_password').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  // false = akses mengikuti default role (dinamis); true = persis isi tabel user_*_access.
  aksesKustom: boolean('akses_kustom').notNull().default(false),
  lastLoginAt: datetime('last_login_at', { mode: 'date', fsp: 3 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  uniqueIndex('users_username_unique').on(t.username),
  uniqueIndex('users_email_unique').on(t.email),
]);

export const userPageAccess = mysqlTable('user_page_access', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  halaman: varchar('halaman', { length: 80 }).notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.halaman] })]);

export const userAreaAccess = mysqlTable('user_area_access', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  areaId: varchar('area_id', { length: 36 }).notNull().references(() => area.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.userId, t.areaId] })]);

export const userOrganizationAccess = mysqlTable('user_organization_access', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  organisasiId: varchar('organisasi_id', { length: 36 }).notNull().references(() => organisasi.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.userId, t.organisasiId] })]);
