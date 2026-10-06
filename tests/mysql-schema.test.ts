import { createPool, type RowDataPacket } from 'mysql2/promise';
import { getTableConfig, MySqlTable } from 'drizzle-orm/mysql-core';
import { describe, expect, it } from 'vitest';
import * as schema from '@/lib/db/schema';

// Jalankan dengan TEST_DATABASE_URL menunjuk database yang sudah dimigrasi
// (npm run db:migrate). Tanpa env ini test dilewati.
const url = process.env.TEST_DATABASE_URL;

const tabelDrizzle = Object.values(schema)
  .filter((v): v is MySqlTable => v instanceof MySqlTable)
  .map((t) => getTableConfig(t));

describe('schema Drizzle (statis)', () => {
  it('mencakup 20 tabel aplikasi', () => {
    expect(tabelDrizzle.map((t) => t.name).sort()).toEqual([
      'app_config', 'area', 'audit_log', 'counter_log', 'jobs', 'kam', 'material_estimator',
      'nomor_urut', 'organisasi', 'penawaran', 'penawaran_item', 'produk', 'project_estimator',
      'project_estimator_item', 'sales', 'sales_organisasi', 'user_area_access',
      'user_organization_access', 'user_page_access', 'users',
    ]);
  });
});

describe.skipIf(!url)('schema MySQL = schema Drizzle', () => {
  it('setiap tabel punya kolom yang sama persis (nama, nullability)', async () => {
    const pool = createPool(url!);
    try {
      const [rows] = await pool.query<(RowDataPacket & { t: string; c: string; nullable: string })[]>(
        `select table_name as t, column_name as c, is_nullable as nullable
         from information_schema.columns where table_schema = database()`,
      );
      const db = new Map<string, Map<string, boolean>>();
      for (const r of rows) {
        if (!db.has(r.t)) db.set(r.t, new Map());
        db.get(r.t)!.set(r.c, r.nullable === 'YES');
      }

      for (const t of tabelDrizzle) {
        const kolomDb = db.get(t.name);
        expect(kolomDb, `tabel ${t.name} tidak ada di database`).toBeDefined();
        expect([...kolomDb!.keys()].sort(), `kolom ${t.name}`).toEqual(t.columns.map((c) => c.name).sort());
        for (const c of t.columns) {
          // PK selalu NOT NULL di MySQL walau Drizzle tidak menandai notNull pada kolom PK komposit.
          const notNullDrizzle = c.notNull || c.primary || t.primaryKeys.some((pk) => pk.columns.includes(c));
          expect(kolomDb!.get(c.name), `${t.name}.${c.name} nullable`).toBe(!notNullDrizzle);
        }
      }
    } finally {
      await pool.end();
    }
  });
});
