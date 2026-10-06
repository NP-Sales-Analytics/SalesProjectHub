import { eq } from 'drizzle-orm';
import { bukaSegel } from '@/lib/crypto-box';
import { bacaConfig, KUNCI_CONFIG } from '@/lib/config';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { kirimEmail, type Lampiran } from '@/lib/email/graph';
import { emailAkunBaru } from '@/lib/email/templat';
import { unduhFileDrive } from '@/lib/google';
import { daftarkanHandler } from '@/lib/jobs/service';

// Semua handler job didaftarkan di sini. Modul ini diimpor oleh lib/jobs/index.ts,
// supaya siapa pun yang mengantre/menjalankan job otomatis punya handler-nya.

export const urlAplikasi = () => process.env.APP_URL || 'http://localhost:3000';

/** Logo tanda tangan email dari Drive. Gagal diambil → email tetap terkirim tanpa logo. */
export async function logoTandaTangan(): Promise<Lampiran | null> {
  const fileId = await bacaConfig(KUNCI_CONFIG.logoTandaTangan);
  if (!fileId) return null;
  try {
    const f = await unduhFileDrive(fileId);
    return { nama: f.nama, tipe: f.tipe, base64: f.base64, cid: 'logo_ttd' };
  } catch (err) {
    console.error('[email] logo tanda tangan tidak terambil:', err instanceof Error ? err.message : err);
    return null;
  }
}

daftarkanHandler('email_akun_baru', async (payload) => {
  const [u] = await db.select({ namaLengkap: users.namaLengkap, email: users.email })
    .from(users).where(eq(users.id, String(payload.userId))).limit(1);
  if (!u) return; // user sudah dihapus: tidak ada yang perlu dikirim
  const logo = await logoTandaTangan();
  const isi = emailAkunBaru({
    namaLengkap: u.namaLengkap,
    email: u.email,
    password: bukaSegel(String(payload.rahasia)),
    urlAplikasi: urlAplikasi(),
    tandaTanganHtml: await bacaConfig(KUNCI_CONFIG.tandaTanganHtml),
    adaLogo: !!logo,
  });
  await kirimEmail({ to: [u.email], subject: isi.subject, html: isi.html, lampiran: logo ? [logo] : [] });
});
