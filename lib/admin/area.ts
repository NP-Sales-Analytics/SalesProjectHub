import { randomUUID } from 'node:crypto';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { lupakanUser, type SessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { area, auditLog } from '@/lib/db/schema';
import { lupakanMaster } from '@/lib/master';

export type BarisArea = typeof area.$inferSelect;

export async function daftarArea(): Promise<BarisArea[]> {
  return db.select().from(area).orderBy(sql`${area.urutan} is null`, asc(area.urutan), asc(area.nama));
}

const teks = (maks: number) => z.string().trim().max(maks).default('').transform((v) => v || null);

export const areaInputSchema = z.object({
  nama: z.string().trim().max(100).default(''),
  singkatan: z.string().trim().toUpperCase()
    .regex(/^[A-Z]{2,5}$/, 'Singkatan wajib 2–5 huruf (dipakai di nomor dokumen, mis. JKT).'),
  urutan: z.union([z.literal(''), z.coerce.number().int('Urutan harus angka bulat.').min(0)]).default(''),
  emailApproval: teks(500), emailApprovalSpec: teks(500), emailApprovalSafl: teks(500),
  emailCc: teks(1000),
  ccPdf: teks(500), ccPdfSpec: teks(500), ccPdfSafl: teks(500),
  dearEmail: teks(200), dearEmailSpec: teks(200), dearEmailSafl: teks(200),
});
export type AreaInput = z.input<typeof areaInputSchema>;

/** Port saveArea: `idLama` kosong = tambah area baru. Nama area tidak bisa diganti. */
export async function simpanArea(aktor: SessionUser, idLama: string | null, raw: unknown) {
  const d = areaInputSchema.parse(raw);
  const semua = await db.select({ id: area.id, nama: area.nama, singkatan: area.singkatan, urutan: area.urutan }).from(area);
  const kunci = (v: string | null) => String(v ?? '').trim().toLowerCase();

  let id: string;
  let nama: string;
  if (!idLama) {
    if (!d.nama) throw new Error('Nama Area wajib diisi.');
    if (semua.some((a) => kunci(a.nama) === kunci(d.nama))) throw new Error(`Area "${d.nama}" sudah ada.`);
    id = randomUUID();
    nama = d.nama;
  } else {
    const lama = semua.find((a) => a.id === idLama);
    if (!lama) throw new Error('Area tidak ditemukan.');
    // Nama dirujuk Sales, Penawaran, dan akses user → dikunci.
    id = lama.id;
    nama = lama.nama;
  }
  const bentrok = semua.find((a) => a.id !== id && kunci(a.singkatan) === kunci(d.singkatan));
  if (bentrok) throw new Error(`Singkatan "${d.singkatan}" sudah dipakai area ${bentrok.nama}.`);

  const urutan = d.urutan === '' ? (idLama ? null : Math.max(0, ...semua.map((a) => a.urutan ?? 0)) + 1) : d.urutan;
  const nilai = {
    singkatan: d.singkatan, urutan,
    emailApproval: d.emailApproval, emailApprovalSpec: d.emailApprovalSpec, emailApprovalSafl: d.emailApprovalSafl,
    emailCc: d.emailCc, ccPdf: d.ccPdf, ccPdfSpec: d.ccPdfSpec, ccPdfSafl: d.ccPdfSafl,
    dearEmail: d.dearEmail, dearEmailSpec: d.dearEmailSpec, dearEmailSafl: d.dearEmailSafl,
  };

  await db.transaction(async (tx) => {
    if (idLama) await tx.update(area).set(nilai).where(eq(area.id, id));
    else await tx.insert(area).values({ id, nama, ...nilai });
    await tx.insert(auditLog).values({
      userId: aktor.id, aksi: idLama ? 'ubah_area' : 'buat_area', entitas: 'area', entitasId: id, detail: { nama, ...nilai },
    });
  });
  // Cakupan default manager & admin dihitung dari master area → segarkan semua sesi.
  lupakanMaster();
  lupakanUser();
  return { baru: !idLama };
}
