import { describe, expect, it } from 'vitest';

// Uji integrasi penomoran ke DB dev/test (TEST_DATABASE_URL). Counter dikembalikan
// ke nilai awal setelah selesai. Tanpa env ini test dilewati.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('terbitkanNomor (MySQL)', () => {
  it('20 transaksi paralel menghasilkan 20 nomor unik berurutan', async () => {
    const nama = new URL(url!).pathname.slice(1);
    if (!/(_dev|_test)$/.test(nama)) throw new Error(`Menolak menjalankan uji di database "${nama}"`);
    process.env.DATABASE_URL = url;
    const { db } = await import('@/lib/db');
    const { counterLog, nomorUrut } = await import('@/lib/db/schema');
    const { terbitkanNomor } = await import('@/lib/penawaran/service');
    const { and, eq, gt } = await import('drizzle-orm');

    const [awal] = await db.select({ nilai: nomorUrut.nilai }).from(nomorUrut).where(eq(nomorUrut.jenis, 'estimator'));
    try {
      const hasil = await Promise.all(Array.from({ length: 20 }, () =>
        db.transaction((tx) => terbitkanNomor(tx, 'estimator', (n) => `UJI-${n}`))));
      const angka = hasil.map((h) => Number(h.slice(4))).sort((a, b) => a - b);
      expect(new Set(hasil).size).toBe(20);
      expect(angka).toEqual(Array.from({ length: 20 }, (_, i) => awal.nilai + 1 + i));
    } finally {
      await db.delete(counterLog).where(and(eq(counterLog.jenis, 'estimator'), gt(counterLog.nomor, awal.nilai)));
      await db.update(nomorUrut).set({ nilai: awal.nilai }).where(eq(nomorUrut.jenis, 'estimator'));
    }
  }, 60_000);
});
