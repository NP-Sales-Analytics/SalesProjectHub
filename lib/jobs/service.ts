import { randomUUID } from 'node:crypto';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { after } from 'next/server';
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';

// Antrean pekerjaan lambat (PDF, email) — pengganti docqueue_/approvalqueue_ di
// Script Properties + trigger 1 menit. Job ditulis dalam transaksi yang sama dengan
// datanya, diproses segera lewat after(), dan disapu cron bila gagal/tertunda.

export type JenisJob = 'email_akun_baru' | 'buat_dokumen' | 'email_approval' | 'email_konfirmasi';
export type Handler = (payload: Record<string, unknown>) => Promise<void>;

export const MAKS_PERCOBAAN = 3;
const JEDA_ULANG_MS = [60_000, 5 * 60_000]; // percobaan ke-2 & ke-3
const BATAS_MACET_MS = 10 * 60_000; // 'berjalan' lebih lama dari ini dianggap mati di tengah jalan

/** Kunci payload yang dihapus begitu job sukses (mis. password awal terenkripsi). */
const KUNCI_RAHASIA = 'rahasia';

const handlers = new Map<JenisJob, Handler>();
export function daftarkanHandler(jenis: JenisJob, handler: Handler) {
  handlers.set(jenis, handler);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Masukkan job. `kunci` unik = pengganti _kirimSekali: job dengan kunci yang sama
 * tidak akan dibuat dua kali. Kembalikan id job (baru), atau null bila sudah ada.
 */
export async function antreJob(
  tx: Tx | typeof db,
  p: { jenis: JenisJob; kunci: string; payload: Record<string, unknown> },
): Promise<string | null> {
  const id = randomUUID();
  try {
    await tx.insert(jobs).values({ id, jenis: p.jenis, kunciIdempoten: p.kunci, payload: p.payload });
    return id;
  } catch (err) {
    // Duplikat kunci hanya membatalkan statement ini, bukan transaksinya.
    if (isDuplikat(err)) return null;
    throw err;
  }
}

/** ER_DUP_ENTRY dari mysql2, baik langsung maupun dibungkus DrizzleQueryError. */
export function isDuplikat(err: unknown): boolean {
  for (let e = err as { code?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === 'ER_DUP_ENTRY') return true;
  }
  return false;
}

/** Jalankan job setelah respons terkirim ke user (tidak menahan klik Simpan). */
export function prosesSetelahRespons(ids: (string | null)[]) {
  const daftar = ids.filter((id): id is string => !!id);
  if (!daftar.length) return;
  after(async () => {
    for (const id of daftar) await jalankanJob(id);
  });
}

/** Klaim lalu jalankan satu job. Aman dipanggil bersamaan: klaim atomik. */
export async function jalankanJob(id: string): Promise<'selesai' | 'diulang' | 'gagal' | 'dilewati'> {
  const [klaim] = await db.update(jobs)
    .set({ status: 'berjalan', percobaan: sql`${jobs.percobaan} + 1` })
    .where(and(eq(jobs.id, id), eq(jobs.status, 'menunggu'), lte(jobs.jalanSetelah, sql`CURRENT_TIMESTAMP(3)`)));
  if (klaim.affectedRows !== 1) return 'dilewati';

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  const handler = handlers.get(job.jenis as JenisJob);
  try {
    if (!handler) throw new Error(`Handler job "${job.jenis}" belum terdaftar`);
    await handler(job.payload);
    const payloadBersih = { ...job.payload };
    delete payloadBersih[KUNCI_RAHASIA];
    await db.update(jobs).set({ status: 'selesai', errorTerakhir: null, payload: payloadBersih }).where(eq(jobs.id, id));
    return 'selesai';
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    const habis = job.percobaan >= MAKS_PERCOBAAN;
    await db.update(jobs).set({
      status: habis ? 'gagal' : 'menunggu',
      errorTerakhir: pesan.slice(0, 2000),
      jalanSetelah: new Date(Date.now() + (JEDA_ULANG_MS[job.percobaan - 1] ?? JEDA_ULANG_MS.at(-1)!)),
    }).where(eq(jobs.id, id));
    console.error(`[jobs] ${job.jenis} ${id} percobaan ${job.percobaan}: ${pesan}`);
    return habis ? 'gagal' : 'diulang';
  }
}

/** Dipanggil cron: hidupkan job macet, lalu proses job yang jatuh tempo. */
export async function prosesAntrean(batas = 20) {
  await db.update(jobs)
    .set({ status: 'menunggu' })
    .where(and(eq(jobs.status, 'berjalan'), lte(jobs.updatedAt, new Date(Date.now() - BATAS_MACET_MS))));

  const jatuhTempo = await db.select({ id: jobs.id }).from(jobs)
    .where(and(eq(jobs.status, 'menunggu'), lte(jobs.jalanSetelah, sql`CURRENT_TIMESTAMP(3)`)))
    .orderBy(asc(jobs.jalanSetelah)).limit(batas);

  const hasil: Record<string, number> = {};
  for (const { id } of jatuhTempo) {
    const r = await jalankanJob(id);
    hasil[r] = (hasil[r] ?? 0) + 1;
  }
  return hasil;
}
