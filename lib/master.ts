import { asc, eq, sql } from 'drizzle-orm';
import type { MasterAkses } from '@/lib/access';
import { db } from '@/lib/db';
import { area, organisasi, sales, salesOrganisasi } from '@/lib/db/schema';
import { ttlCache } from '@/lib/ttl-cache';

/**
 * Master data kecil yang dibaca di hampir setiap request (cakupan akses, dropdown).
 * Pengganti cache master Apps Script: dibuang otomatis lewat lupakanMaster() setiap
 * kali aplikasi menulis master; edit manual di DB terbaca paling lambat 60 detik.
 */
const cacheMasterAkses = ttlCache<MasterAkses>(async () => {
  const [daftarArea, daftarOrg, daftarSalesOrg] = await Promise.all([
    db.select({
      nama: area.nama,
      emailApproval: area.emailApproval,
      emailApprovalSpec: area.emailApprovalSpec,
      emailApprovalSafl: area.emailApprovalSafl,
    }).from(area).orderBy(sql`${area.urutan} is null`, asc(area.urutan), asc(area.nama)),
    db.select({ nama: organisasi.nama, managerEmail: organisasi.managerEmail })
      .from(organisasi).orderBy(asc(organisasi.nama)),
    db.select({ namaSales: sales.nama, email: sales.email, organisasi: organisasi.nama, area: sales.area })
      .from(salesOrganisasi)
      .innerJoin(sales, eq(sales.id, salesOrganisasi.salesId))
      .innerJoin(organisasi, eq(organisasi.id, salesOrganisasi.organisasiId)),
  ]);
  return { area: daftarArea, organisasi: daftarOrg, salesOrganisasi: daftarSalesOrg };
}, 60_000);

export const masterAkses = () => cacheMasterAkses.get();

/** Panggil setelah menulis area / organisasi / sales / sales_organisasi. */
export function lupakanMaster() {
  cacheMasterAkses.clear();
}
