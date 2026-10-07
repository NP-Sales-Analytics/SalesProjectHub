import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { penawaran, penawaranItem } from '@/lib/db/schema';
import type { IsiPenawaranEmail } from '@/lib/email/templat';
import { rapikanEmail } from '@/lib/email/graph';
import { masterAkses } from '@/lib/master';
import {
  formatRupiah, grupKam, grupOrganisasi, kolomArea, tanggalDokumen, teksProdukPdf,
} from '@/lib/penawaran/aturan';
import { cariNama, masterPenawaran } from '@/lib/penawaran/master';
import type { DataPdf } from '@/lib/dokumen/pdf';

/** Semua data yang dibutuhkan PDF & email satu penawaran, dihitung dari DB + master. */
export async function muatDataDokumen(penawaranId: string) {
  const [p] = await db.select().from(penawaran).where(eq(penawaran.id, penawaranId)).limit(1);
  if (!p) return null;
  const [items, m, ma] = await Promise.all([
    db.select().from(penawaranItem).where(eq(penawaranItem.penawaranId, penawaranId)).orderBy(asc(penawaranItem.noItem)),
    masterPenawaran(), masterAkses(),
  ]);
  const org = cariNama(m.organisasi, p.organisasi);
  const kategori = org?.kategori ?? 'reguler';
  const ar = cariNama(m.area, p.area);
  const harga = (it: (typeof items)[number]) => Number(it.hargaEdit || it.hargaSatuan || 0);
  const tanggalTampil = tanggalDokumen(String(p.tanggal));

  const pdf: DataPdf = {
    nomor: p.nomor,
    tanggalTampil,
    grupKam: grupKam(p.kam),
    grupOrg: grupOrganisasi(p.organisasi, kategori),
    namaFile: `${p.nomor.split('/')[0].trim()} - ${p.perusahaan || '-'} - ${p.namaSales || '-'}`,
    placeholder: {
      '{{ID_Penawaran}}': p.nomor, '{{Area}}': p.area ?? '', '{{Tanggal}}': tanggalTampil,
      '{{PERUSAHAAN}}': p.perusahaan ?? '', '{{ADDRESS}}': p.alamat ?? '', '{{PIC}}': p.pic ?? '',
      '{{CC}}': ar ? kolomArea(ar, kategori, 'ccPdf') : '', '{{Nama Proyek}}': p.namaProyek ?? '',
      '{{FRANCO}}': p.franco ?? '', '{{KAM}}': p.kam ?? '', '{{SALES}}': p.namaSales ?? '', '{{ORGANISASI}}': p.organisasi ?? '',
    },
    baris: items.map((it, i) => {
      // SG/DFT/Coverage dicari lewat nama produk saja (getDetailProduk lama).
      const d = m.produk.find((x) => x.nama === it.namaProduk);
      return [
        String(i + 1), it.jenisProduk || '-', teksProdukPdf(it), it.kemasan || '-',
        d?.sg ? String(Number(d.sg)) : '-', d?.dft != null ? String(d.dft) : '-', d?.coverage || '-',
        harga(it) > 0 ? formatRupiah(harga(it)) : '-',
      ];
    }),
  };

  const email: IsiPenawaranEmail = {
    nomor: p.nomor, tanggalTampil, tanggalIso: String(p.tanggal),
    organisasi: p.organisasi, kam: p.kam, namaSales: p.namaSales, area: p.area, franco: p.franco,
    perusahaan: p.perusahaan, pic: p.pic, namaProyek: p.namaProyek, alamat: p.alamat,
    produk: items.map((it) => ({ namaProduk: it.namaProduk, jenisRm: it.jenisRm, kemasan: it.kemasan, tier: it.tier, harga: harga(it) })),
  };

  // Routing email (kirimEmailApproval lama).
  const emailPengaju = ma.salesOrganisasi.find((s) => s.namaSales.trim().toLowerCase() === String(p.namaSales ?? '').trim().toLowerCase())?.email ?? null;
  const k = cariNama(m.kam, p.kam);
  const emailKam = k ? (kategori === 'spec' ? k.emailSpec : k.email) : null;
  const to = rapikanEmail([ar ? kolomArea(ar, kategori, 'emailApproval') : '']);
  // CC = email_cc area + KAM + pengaju (dedup), lalu manager organisasi HANYA bila belum ada di To.
  const ccDasar = rapikanEmail([ar?.emailCc, emailKam, emailPengaju]);
  const cc = rapikanEmail([...ccDasar, ...rapikanEmail([org?.managerEmail], to)]);

  return {
    penawaran: p,
    pdf,
    email,
    routing: {
      to, cc, replyTo: emailPengaju || to[0] || undefined,
      dearName: ar ? kolomArea(ar, kategori, 'dearEmail') || null : null,
      pengaju: emailPengaju,
    },
  };
}
