import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { pasanganEstimatorTerlihat, type Akses, type MasterAkses } from '@/lib/access';
import { penawaran, projectEstimator } from '@/lib/db/schema';

// Kondisi WHERE cakupan data per role — padanan SQL dari bolehLihatPenawaran /
// bolehLihatEstimator di lib/access.ts (yang dipakai test & pengecekan satu baris).
// Perbandingan tidak peka huruf besar karena collation utf8mb4_unicode_ci.

const TIDAK_ADA = sql`1 = 0`;

/** undefined = tanpa batas (super admin). */
export function filterPenawaran(akses: Akses): SQL | undefined {
  if (akses.semua) return undefined;
  if (akses.role === 'sales') {
    if (!akses.penugasan.length) return TIDAK_ADA;
    return or(...akses.penugasan.map((p) =>
      and(eq(penawaran.organisasi, p.organisasi), eq(penawaran.namaSales, p.namaSales))));
  }
  if (akses.role === 'admin' || akses.role === 'manager' || akses.role === 'manager admin') {
    if (!akses.area.length || !akses.organisasi.length) return TIDAK_ADA;
    return and(inArray(penawaran.area, akses.area), inArray(penawaran.organisasi, akses.organisasi));
  }
  return TIDAK_ADA;
}

export function filterEstimator(akses: Akses, master: MasterAkses): SQL | undefined {
  if (akses.semua) return undefined;
  if (!akses.organisasi.length) return TIDAK_ADA;
  const pasangan = akses.role === 'sales'
    ? akses.penugasan
    : (akses.role === 'admin' || akses.role === 'manager' || akses.role === 'manager admin')
      ? pasanganEstimatorTerlihat(akses, master)
      : null;
  if (!pasangan) return TIDAK_ADA;

  const cocokPasangan = pasangan.map((p) =>
    and(eq(projectEstimator.organisasi, p.organisasi), eq(projectEstimator.namaSales, p.namaSales)));
  const milikSendiri = akses.role === 'sales'
    ? and(inArray(projectEstimator.organisasi, akses.organisasi), eq(projectEstimator.dibuatOlehEmail, akses.email))
    : undefined;
  const syarat = [...cocokPasangan, milikSendiri].filter((s): s is SQL => !!s);
  return syarat.length ? or(...syarat) : TIDAK_ADA;
}
