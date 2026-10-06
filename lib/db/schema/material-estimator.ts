import { sql } from 'drizzle-orm';
import { bigint, datetime, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const materialEstimator = mysqlTable('material_estimator', {
  id: varchar('id', { length: 36 }).primaryKey(),
  matlGroup: varchar('matl_group', { length: 50 }),
  matlGroupNama: varchar('matl_group_nama', { length: 200 }),
  material: varchar('material', { length: 50 }).notNull(),
  deskripsi: varchar('deskripsi', { length: 300 }),
  // Kolom biaya: TIDAK boleh dikirim ke role sales.
  mvAvgPrice: bigint('mv_avg_price', { mode: 'number' }),
  plndPrice1: bigint('plnd_price1', { mode: 'number' }),
  plndPrice2: bigint('plnd_price2', { mode: 'number' }),
  asp2025: bigint('asp_2025', { mode: 'number' }),
  asp2026: bigint('asp_2026', { mode: 'number' }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (t) => [uniqueIndex('material_estimator_material_unique').on(t.material)]);
