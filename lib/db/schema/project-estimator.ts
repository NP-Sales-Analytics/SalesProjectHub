import { sql } from 'drizzle-orm';
import { bigint, date, datetime, decimal, index, int, mysqlEnum, mysqlTable, primaryKey, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const statusEstimator = ['Pending Approve', 'Disetujui', 'Ditolak'] as const;
export type StatusEstimator = (typeof statusEstimator)[number];
export const costBasis = ['mvAvgPrice', 'plndPrice1', 'plndPrice2'] as const;
export type CostBasis = (typeof costBasis)[number];

export const projectEstimator = mysqlTable('project_estimator', {
  id: varchar('id', { length: 36 }).primaryKey(),
  nomor: varchar('nomor', { length: 40 }).notNull(),
  namaKontrak: varchar('nama_kontrak', { length: 300 }),
  tanggalMulai: date('tanggal_mulai', { mode: 'string' }),
  tanggalAkhir: date('tanggal_akhir', { mode: 'string' }),
  deskripsi: text('deskripsi'),
  costBasis: mysqlEnum('cost_basis', costBasis).notNull().default('mvAvgPrice'),
  targetCostPct: decimal('target_cost_pct', { precision: 12, scale: 2 }).notNull().default('0'),
  totalRevenue: bigint('total_revenue', { mode: 'number' }).notNull().default(0),
  totalCost: bigint('total_cost', { mode: 'number' }).notNull().default(0),
  grossProfit: bigint('gross_profit', { mode: 'number' }).notNull().default(0),
  gpPct: decimal('gp_pct', { precision: 12, scale: 2 }).notNull().default('0'),
  costPct: decimal('cost_pct', { precision: 12, scale: 2 }).notNull().default('0'),
  totalSku: int('total_sku').notNull().default(0),
  totalQuantity: decimal('total_quantity', { precision: 18, scale: 2 }).notNull().default('0'),
  status: mysqlEnum('status', statusEstimator).notNull().default('Pending Approve'),
  organisasi: varchar('organisasi', { length: 150 }),
  namaSales: varchar('nama_sales', { length: 150 }),
  kam: varchar('kam', { length: 150 }),
  dibuatOlehUserId: varchar('dibuat_oleh_user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  dibuatOlehEmail: varchar('dibuat_oleh_email', { length: 255 }),
  approver: varchar('approver', { length: 200 }),
  catatanApproval: text('catatan_approval'),
  approvedAt: datetime('approved_at', { mode: 'date', fsp: 3 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [
  uniqueIndex('project_estimator_nomor_unique').on(t.nomor),
  index('project_estimator_status_idx').on(t.status),
  index('project_estimator_org_sales_idx').on(t.organisasi, t.namaSales),
]);

export const projectEstimatorItem = mysqlTable('project_estimator_item', {
  estimatorId: varchar('estimator_id', { length: 36 }).notNull().references(() => projectEstimator.id, { onDelete: 'cascade' }),
  noItem: int('no_item').notNull(),
  matlGroup: varchar('matl_group', { length: 50 }),
  matlGroupNama: varchar('matl_group_nama', { length: 200 }),
  material: varchar('material', { length: 50 }),
  deskripsi: varchar('deskripsi', { length: 300 }),
  asp2025: bigint('asp_2025', { mode: 'number' }),
  asp2026: bigint('asp_2026', { mode: 'number' }),
  costReference: bigint('cost_reference', { mode: 'number' }).notNull().default(0),
  quantity: decimal('quantity', { precision: 18, scale: 2 }).notNull().default('0'),
  sellingPrice: bigint('selling_price', { mode: 'number' }).notNull().default(0),
  totalRevenue: bigint('total_revenue', { mode: 'number' }).notNull().default(0),
  totalCost: bigint('total_cost', { mode: 'number' }).notNull().default(0),
  costPct: decimal('cost_pct', { precision: 12, scale: 2 }).notNull().default('0'),
  grossProfit: bigint('gross_profit', { mode: 'number' }).notNull().default(0),
  gpPct: decimal('gp_pct', { precision: 12, scale: 2 }).notNull().default('0'),
}, (t) => [primaryKey({ columns: [t.estimatorId, t.noItem] })]);
