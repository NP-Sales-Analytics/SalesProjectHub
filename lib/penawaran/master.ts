import { asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { area, kam, organisasi, produk } from '@/lib/db/schema';
import type { ProdukMaster } from '@/lib/penawaran/aturan';
import { ttlCache } from '@/lib/ttl-cache';

export type MasterPenawaran = {
  organisasi: { nama: string; kategori: 'reguler' | 'spec' | 'safl'; managerEmail: string | null }[];
  area: (typeof area.$inferSelect)[];
  kam: { nama: string; email: string | null; emailSpec: string | null }[];
  produk: (ProdukMaster & { sg: string | null; dft: number | null; coverage: string | null })[];
};

// Master untuk form & dokumen penawaran. Edit manual di DB terbaca ≤60 detik.
const cache = ttlCache<MasterPenawaran>(async () => {
  const [org, ar, k, p] = await Promise.all([
    db.select({ nama: organisasi.nama, kategori: organisasi.kategori, managerEmail: organisasi.managerEmail })
      .from(organisasi).orderBy(asc(organisasi.nama)),
    db.select().from(area).orderBy(sql`${area.urutan} is null`, asc(area.urutan), asc(area.nama)),
    db.select({ nama: kam.nama, email: kam.email, emailSpec: kam.emailSpec }).from(kam).orderBy(asc(kam.nama)),
    db.select({
      nama: produk.nama, jenisRm: produk.jenisRm, warna: produk.warna, kemasan: produk.kemasan,
      fp1: produk.fp1, fp2: produk.fp2, fp3: produk.fp3, fp4: produk.fp4, sg: produk.sg, dft: produk.dft, coverage: produk.coverage,
    }).from(produk).orderBy(asc(produk.nama), asc(produk.jenisRm), asc(produk.warna), asc(produk.kemasan)),
  ]);
  return { organisasi: org, area: ar, kam: k, produk: p };
}, 60_000);

export const masterPenawaran = () => cache.get();
export const lupakanMasterPenawaran = () => cache.clear();

const kunci = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
/** Cari baris master dengan nama tak peka huruf besar (kunci master unik case-insensitive). */
export const cariNama = <T extends { nama: string }>(daftar: T[], nama: string | null | undefined) =>
  daftar.find((x) => kunci(x.nama) === kunci(nama));
