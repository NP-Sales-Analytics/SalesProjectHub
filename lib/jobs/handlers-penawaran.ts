import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { penawaran } from '@/lib/db/schema';
import { muatDataDokumen } from '@/lib/dokumen/penawaran';
import { buatPdfPenawaran, unduhPdf } from '@/lib/dokumen/pdf';
import { kirimEmail } from '@/lib/email/graph';
import { emailApproval, emailKonfirmasi, type AksiApproval } from '@/lib/email/templat';
import { antreJob, daftarkanHandler, jalankanJob } from '@/lib/jobs/service';
import type { ModeDokumen } from '@/lib/penawaran/aturan';

// Pengganti processDocQueue / processApprovalQueue lama.

/** buat_dokumen: PDF dulu, lalu email sesuai mode (request_approval / confirm_approved / no_email). */
daftarkanHandler('buat_dokumen', async (payload) => {
  const id = String(payload.penawaranId);
  const data = await muatDataDokumen(id);
  if (!data) return; // penawaran sudah dihapus
  const hasil = await buatPdfPenawaran(data.pdf);
  await db.update(penawaran).set({ pdfFileId: hasil.pdfId, pdfUrl: hasil.pdfUrl }).where(eq(penawaran.id, id));

  const mode = payload.mode as ModeDokumen;
  if (mode === 'no_email') return;
  const lanjut = mode === 'confirm_approved'
    ? await antreJob(db, {
      jenis: 'email_konfirmasi', kunci: `email_konfirmasi:${id}:${hasil.pdfId}`,
      payload: { penawaranId: id, aksi: payload.aksi ?? 'approve', alasan: payload.alasan ?? '', approver: payload.approver ?? 'Admin' },
    })
    : await antreJob(db, { jenis: 'email_approval', kunci: `email_approval:${id}:${hasil.pdfId}`, payload: { penawaranId: id } });
  // Langsung dijalankan; bila gagal, cron mengulang (maks. 3x).
  if (lanjut) await jalankanJob(lanjut);
});

/** email_approval: permintaan persetujuan ke email approval area (kirimEmailApproval). */
daftarkanHandler('email_approval', async (payload) => {
  const data = await muatDataDokumen(String(payload.penawaranId));
  if (!data) return;
  if (!data.routing.to.length) {
    throw new Error(`Email approval tidak ditemukan untuk area ${data.penawaran.area} (organisasi ${data.penawaran.organisasi}).`);
  }
  const isi = emailApproval(data.email, data.routing.dearName);
  await kirimEmail({ to: data.routing.to, cc: data.routing.cc, replyTo: data.routing.replyTo, subject: isi.subject, html: isi.html });
});

/** email_konfirmasi: hasil approval ke pengaju; PDF dilampirkan hanya bila disetujui. */
daftarkanHandler('email_konfirmasi', async (payload) => {
  const data = await muatDataDokumen(String(payload.penawaranId));
  if (!data) return;
  if (!data.routing.pengaju) throw new Error(`Email pengaju tidak ditemukan untuk sales "${data.penawaran.namaSales}".`);
  const isi = emailKonfirmasi(data.email, payload.aksi as AksiApproval, String(payload.alasan ?? ''), String(payload.approver ?? ''));
  const lampiran = [];
  if (isi.lampirkanPdf && data.penawaran.pdfFileId) {
    lampiran.push({ nama: `${data.pdf.namaFile}.pdf`, tipe: 'application/pdf', base64: (await unduhPdf(data.penawaran.pdfFileId)).toString('base64') });
  }
  await kirimEmail({ to: [data.routing.pengaju], subject: isi.subject, html: isi.html, lampiran });
});

