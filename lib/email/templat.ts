import {
  barisProdukApproval, htmlEmailApproval, htmlEmailKonfirmasi, type DataEmailPenawaran, type ProdukEmail,
} from '@/lib/email/templat-penawaran';
// Isi HTML email, disalin dari Kode.js. Fungsi murni (mudah dites);
// pengiriman ada di lib/email/graph.ts dan handler job.

export const escHtml = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Port _kirimEmailAkunBaru. `tandaTanganHtml` dari app_config (bukan di repo). */
export function emailAkunBaru(p: {
  namaLengkap: string;
  email: string;
  password: string;
  urlAplikasi: string;
  tandaTanganHtml: string | null;
  adaLogo: boolean;
}): { subject: string; html: string } {
  const e = escHtml;
  const nama = e(p.namaLengkap);
  const html =
    '<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000;">' +
    `<p>Dear ${nama}</p>` +
    '<p>Below are your login credentials to access the SalesHub:</p>' +
    '<ul>' +
    `<li><b>Email</b> : <a href="mailto:${e(p.email)}">${e(p.email)}</a></li>` +
    `<li><b>Username</b> : ${nama}</li>` +
    `<li><b>Password</b> : ${e(p.password)}</li>` +
    `<li><b>Link SalesHub :</b> <a href="${e(p.urlAplikasi)}">${e(p.urlAplikasi)}</a></li>` +
    '</ul><br>' +
    '<p style="margin:0;"><b>Thanks,<br>Best Regards.</b></p><br>' +
    (p.tandaTanganHtml ?? '') +
    (p.adaLogo ? '<img src="cid:logo_ttd" alt="Nippon Paint" style="display:block;margin-top:8px;border:0;">' : '') +
    '</div>';
  return { subject: `Akun SalesHub - ${p.namaLengkap}`, html };
}

// ─── Email penawaran (port kirimEmailApproval & _kirimEmailKonfirmasiApproval) ───

export type IsiPenawaranEmail = {
  nomor: string;
  tanggalTampil: string; // format dokumen "06 Oct 2026"
  tanggalIso: string; // yyyy-mm-dd
  organisasi: string | null; kam: string | null; namaSales: string | null; area: string | null; franco: string | null;
  perusahaan: string | null; pic: string | null; namaProyek: string | null; alamat: string | null;
  produk: { namaProduk: string | null; jenisRm: string | null; kemasan: string | null; tier: string | null; harga: number }[];
};

function dataTerescape(p: IsiPenawaranEmail): DataEmailPenawaran {
  const e = escHtml;
  return {
    organisasi: e(p.organisasi), kam: e(p.kam), nama_sales: e(p.namaSales), sales: e(p.namaSales), area: e(p.area),
    franco: e(p.franco), perusahaan: e(p.perusahaan), pic: e(p.pic), project: e(p.namaProyek), alamat: e(p.alamat),
    tanggal: p.tanggalIso,
  };
}

/** Subjek & isi email permintaan approval. `dearName` dari Area sesuai kategori organisasi. */
export function emailApproval(p: IsiPenawaranEmail, dearName: string | null) {
  const produk: ProdukEmail[] = p.produk.map((x) => ({
    nama_produk: escHtml(x.namaProduk), jenis_rm: escHtml(x.jenisRm), kemasan: escHtml(x.kemasan), tier: escHtml(x.tier), harga: x.harga,
  }));
  const noDoc = p.nomor.split('/')[0].trim();
  return {
    subject: `[APPROVAL PENAWARAN] - ${noDoc} | ${p.perusahaan || '-'} | ${p.namaSales || '-'}`,
    html: htmlEmailApproval(escHtml(p.nomor), escHtml(p.tanggalTampil), escHtml(dearName ?? ''), dataTerescape(p), barisProdukApproval(produk)),
  };
}

export type AksiApproval = 'approve' | 'approve_revisi' | 'decline';

/** Subjek & isi email konfirmasi hasil approval ke pengaju. */
export function emailKonfirmasi(p: IsiPenawaranEmail, aksi: AksiApproval, alasan: string, approver: string) {
  const isApproved = aksi === 'approve';
  const isRevisi = aksi === 'approve_revisi';
  const statusLabel = isApproved ? 'DISETUJUI' : (isRevisi ? 'DISETUJUI (REVISI)' : 'DITOLAK');
  const theme = {
    accent: isApproved ? '#059669' : (isRevisi ? '#d97706' : '#dc2626'),
    headerBg: isApproved ? '#10b981' : (isRevisi ? '#fbbf24' : '#ef4444'),
    badgeBg: isApproved ? '#ecfdf5' : (isRevisi ? '#fffbeb' : '#fef2f2'),
    badgeBorder: isApproved ? '#a7f3d0' : (isRevisi ? '#fde68a' : '#fecaca'),
    statusColor: isApproved ? '#166534' : (isRevisi ? '#92400e' : '#9a3412'),
    attachmentNote: isApproved
      ? '*Dokumen PDF penawaran telah terlampir pada email ini.'
      : '*Dokumen PDF penawaran tidak terlampir pada email ini.',
    headerText: isRevisi ? '#78350f' : '#ffffff',
    icon: isApproved ? '&#10003;' : (isRevisi ? '&#9998;' : '&#10007;'),
    pesanSingkat: isApproved
      ? 'Selamat! Penawaran Anda telah <strong>disetujui</strong>. Silakan lanjutkan proses pengiriman penawaran kepada klien.'
      : (isRevisi
        ? 'Penawaran Anda <strong>disetujui namun memerlukan revisi</strong>. Silakan hubungi Admin untuk detail revisi yang diperlukan.'
        : 'Penawaran Anda <strong>tidak disetujui</strong>. Silakan tinjau catatan di atas dan lakukan revisi yang diperlukan.'),
  };
  const noDoc = p.nomor.split('/')[0].trim();
  return {
    subject: `[${statusLabel}] - ${noDoc} | ${p.perusahaan || '-'} | ${p.namaSales || '-'}`,
    html: htmlEmailKonfirmasi(escHtml(p.nomor), dataTerescape(p), statusLabel, theme, escHtml(alasan), escHtml(approver)),
    lampirkanPdf: isApproved,
  };
}
