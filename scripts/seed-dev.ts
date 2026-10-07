import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import {
  area, kam, materialEstimator, organisasi, produk, sales, salesOrganisasi, userAreaAccess,
  userOrganizationAccess, userPageAccess, users, type Role,
} from '@/lib/db/schema';
import { halamanDefault } from '@/lib/access';
import { hashPassword, PASSWORD_MIN } from '@/lib/password';

// Data contoh untuk pengembangan & uji tahap 3–4. HANYA untuk database dev/test:
// semua email memakai @example.com sehingga tidak ada email sungguhan terkirim.
// Jalankan: SEED_PASSWORD=... npm run seed:dev   (password semua user contoh)

const db_ = () => new URL(process.env.DATABASE_URL ?? 'mysql://x/x').pathname.slice(1);

async function upsertNama<T extends { nama: string }>(
  tabel: typeof organisasi | typeof area | typeof kam | typeof sales, baris: T[],
): Promise<Map<string, string>> {
  for (const b of baris) {
    await db.insert(tabel).values({ id: randomUUID(), ...b } as never)
      .onDuplicateKeyUpdate({ set: b as never });
  }
  const rows = await db.select({ id: tabel.id, nama: tabel.nama }).from(tabel);
  return new Map(rows.map((r) => [r.nama, r.id]));
}

async function main() {
  const namaDb = db_();
  if (!/dev|test/i.test(namaDb)) throw new Error(`Menolak seed ke database "${namaDb}" (hanya dev/test).`);
  const password = String(process.env.SEED_PASSWORD ?? '');
  if (password.length < PASSWORD_MIN) throw new Error(`SEED_PASSWORD minimal ${PASSWORD_MIN} karakter.`);

  const org = await upsertNama(organisasi, [
    { nama: 'TU Jakarta', singkatan: 'TUJ', managerEmail: 'manager.jkt@example.com', kategori: 'reguler' as const },
    { nama: 'TU Sumatera', singkatan: 'TUS', managerEmail: 'manager.sumatera@example.com', kategori: 'reguler' as const },
    { nama: 'Spec Project-TU East', singkatan: 'SPE', managerEmail: 'manager.jkt@example.com', kategori: 'spec' as const },
    { nama: 'TU Project SAFL', singkatan: 'SFL', managerEmail: null, kategori: 'safl' as const },
  ]);
  const ar = await upsertNama(area, [
    { nama: 'Jakarta', singkatan: 'JKT', urutan: 1, emailApproval: 'manager.jkt@example.com', emailApprovalSpec: 'spec.approval@example.com', emailCc: 'cc.jkt@example.com', ccPdf: 'Bapak CC Jakarta', dearEmail: 'Bapak Manager JKT' },
    { nama: 'Bandung', singkatan: 'BDG', urutan: 2, emailApproval: 'manager.jkt@example.com', emailCc: 'cc.bdg@example.com', ccPdf: 'Ibu CC Bandung', dearEmail: 'Bapak Manager BDG' },
    { nama: 'Medan', singkatan: 'MDN', urutan: 3, emailApproval: 'manager.sumatera@example.com', emailApprovalSafl: 'safl.approval@example.com', ccPdf: 'Bapak CC Medan', dearEmail: 'Bapak Manager MDN' },
    { nama: 'Surabaya', singkatan: 'SBY', urutan: 4, emailApproval: 'manager.sby@example.com', ccPdf: 'Ibu CC Surabaya', dearEmail: 'Ibu Manager SBY' },
  ]);
  await upsertNama(kam, [
    { nama: 'High Rise & Special Building', email: 'kam.highrise@example.com', emailSpec: 'kam.highrise.spec@example.com' },
    { nama: 'Housing & Landed', email: 'kam.housing@example.com', emailSpec: null },
    { nama: 'Pemerintah & BUMN', email: 'kam.pemerintah@example.com', emailSpec: null },
    { nama: 'Building Maintenance & Repainting', email: 'kam.maintenance@example.com', emailSpec: null },
  ]);
  const sl = await upsertNama(sales, [
    { nama: 'Budi Santoso', email: 'budi.sales@example.com', area: 'Jakarta' },
    { nama: 'Sari Lestari', email: 'sari.sales@example.com', area: 'Medan' },
    { nama: 'Tono Wijaya', email: 'tono.sales@example.com', area: 'Bandung' },
  ]);
  for (const [s, o] of [['Budi Santoso', 'TU Jakarta'], ['Budi Santoso', 'Spec Project-TU East'], ['Sari Lestari', 'TU Sumatera'],
    ['Sari Lestari', 'TU Project SAFL'], ['Tono Wijaya', 'TU Jakarta']] as const) {
    await db.insert(salesOrganisasi).values({ salesId: sl.get(s)!, organisasiId: org.get(o)! })
      .onDuplicateKeyUpdate({ set: { salesId: sql`sales_id` } });
  }

  const P = (nama: string, jenisRm: string, warna: string, kemasan: string, fp: number, sg: string, dft: number, coverage: string) =>
    ({ nama, jenisRm, warna, kemasan, fp1: fp, fp2: Math.round(fp * 0.97), fp3: Math.round(fp * 0.94), fp4: Math.round(fp * 0.9), sg, dft, coverage });
  for (const p of [
    P('Vinilex Pro 1000', 'RM', 'Putih', '5 kg', 185000, '1.45', 30, '8-10 m2/L'),
    P('Vinilex Pro 1000', 'RM', 'Putih', '25 kg', 820000, '1.45', 30, '8-10 m2/L'),
    P('Vinilex Pro 1000', 'CCM', 'Base A', '20 L', 1250000, '1.40', 30, '8-10 m2/L'),
    P('Weatherbond', 'RM', 'Putih', '2.5 L', 310000, '1.30', 35, '10-12 m2/L'),
    P('Weatherbond', 'RM', 'Abu Muda', '20 L', 2150000, '1.30', 35, '10-12 m2/L'),
    P('Nippon Q-Tech Primer', 'RM', 'Putih', '20 L', 1650000, '1.38', 40, '9-11 m2/L'),
  ]) {
    await db.insert(produk).values({ id: randomUUID(), ...p }).onDuplicateKeyUpdate({ set: p });
  }
  for (const m of [
    { material: 'MAT-0001', matlGroup: 'G01', matlGroupNama: 'Decorative Paint', deskripsi: 'Vinilex Pro 1000 Putih 25 kg', mvAvgPrice: 610000, plndPrice1: 625000, plndPrice2: 640000, asp2025: 800000, asp2026: 820000 },
    { material: 'MAT-0002', matlGroup: 'G01', matlGroupNama: 'Decorative Paint', deskripsi: 'Weatherbond Putih 20 L', mvAvgPrice: 1600000, plndPrice1: 1640000, plndPrice2: 1700000, asp2025: 2100000, asp2026: 2150000 },
  ]) {
    await db.insert(materialEstimator).values({ id: randomUUID(), ...m }).onDuplicateKeyUpdate({ set: m });
  }

  const hash = await hashPassword(password);
  const contoh: { nama: string; email: string; role: Role; area?: string[]; org?: string[] }[] = [
    { nama: 'Super Admin Dev', email: 'superadmin@example.com', role: 'super admin' },
    { nama: 'Admin Dev', email: 'admin@example.com', role: 'admin' },
    // Manager tanpa setelan: cakupan default dari email approval area & manager organisasi.
    { nama: 'Manager Jakarta', email: 'manager.jkt@example.com', role: 'manager' },
    // Manager dengan setelan kustom: hanya Medan + TU Sumatera.
    { nama: 'Manager Sumatera', email: 'manager.sumatera@example.com', role: 'manager', area: ['Medan'], org: ['TU Sumatera'] },
    { nama: 'Budi Santoso', email: 'budi.sales@example.com', role: 'sales' },
    { nama: 'Sari Lestari', email: 'sari.sales@example.com', role: 'sales' },
  ];
  for (const u of contoh) {
    const nilai = { username: u.nama.toLowerCase(), namaLengkap: u.nama, role: u.role, passwordHash: hash,
      isActive: true, wajibGantiPassword: false, aksesKustom: !!u.area };
    await db.insert(users).values({ id: randomUUID(), email: u.email, ...nilai }).onDuplicateKeyUpdate({ set: nilai });
    if (u.area) {
      const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1);
      // Setelan kustom = SEMUA akses tersimpan (halaman juga), sama seperti simpan dari User Management.
      for (const halaman of halamanDefault(u.role)) await db.insert(userPageAccess).values({ userId: row.id, halaman }).onDuplicateKeyUpdate({ set: { userId: sql`user_id` } });
      for (const a of u.area) await db.insert(userAreaAccess).values({ userId: row.id, areaId: ar.get(a)! }).onDuplicateKeyUpdate({ set: { userId: sql`user_id` } });
      for (const o of u.org ?? []) await db.insert(userOrganizationAccess).values({ userId: row.id, organisasiId: org.get(o)! }).onDuplicateKeyUpdate({ set: { userId: sql`user_id` } });
    }
  }
  console.log(`Seed selesai di ${namaDb}: ${contoh.length} user contoh (password = SEED_PASSWORD).`);
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exitCode = 1; })
  .finally(() => mysqlPool.end());
