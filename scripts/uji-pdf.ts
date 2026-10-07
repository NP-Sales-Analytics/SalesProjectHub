import { writeFileSync } from 'node:fs';
import { mysqlPool } from '@/lib/db';
import { buatPdfPenawaran, unduhPdf } from '@/lib/dokumen/pdf';
import { drive } from '@/lib/google';
import { formatRupiah, grupKam, grupOrganisasi, tanggalDokumen, teksProdukPdf } from '@/lib/penawaran/aturan';

// Uji pembuatan PDF sungguhan (Google Docs + Drive) dengan data contoh, tanpa menyentuh
// tabel penawaran. Hasil PDF disimpan lokal untuk diperiksa, file di Drive dihapus lagi
// kecuali --simpan.  Pakai: npm run uji:pdf -- <file-keluaran.pdf> [--simpan]

async function main() {
  const keluaran = process.argv[2];
  if (!keluaran) throw new Error('Pakai: npm run uji:pdf -- <file-keluaran.pdf> [--simpan]');
  const kam = 'Housing & Landed';
  const org = 'TU Sumatera';
  const tanggal = tanggalDokumen('2026-10-07');
  const produk = [
    { jenis: 'Interior', nama: 'Vinilex Pro 1000', kodeWarna: '', warna: 'Putih', kemasan: '25 kg', sg: '1.45', dft: '30', cov: '8-10 m2/L', harga: 820000 },
    { jenis: 'Exterior', nama: 'Weatherbond', kodeWarna: 'NP OW 1015 P', warna: 'Abu Muda', kemasan: '20 L', sg: '1.3', dft: '35', cov: '10-12 m2/L', harga: 2150000 },
    { jenis: 'Exterior', nama: 'Produk Custom Uji <&>', kodeWarna: '', warna: '', kemasan: '5 L', sg: '-', dft: '-', cov: '-', harga: 0 },
  ];
  const hasil = await buatPdfPenawaran({
    nomor: '9999/NIP-PRJ/X/2026/MDN',
    tanggalTampil: tanggal,
    grupKam: grupKam(kam),
    grupOrg: grupOrganisasi(org, 'reguler'),
    namaFile: '9999 - PT Uji Migrasi SalesHub - Budi Santoso',
    placeholder: {
      '{{ID_Penawaran}}': '9999/NIP-PRJ/X/2026/MDN', '{{Area}}': 'Medan', '{{Tanggal}}': tanggal,
      '{{PERUSAHAAN}}': 'PT Uji Migrasi SalesHub', '{{ADDRESS}}': 'Jl. Uji Coba No. 1, Medan', '{{PIC}}': 'Bapak Penguji',
      '{{CC}}': 'Bapak CC Medan', '{{Nama Proyek}}': 'Proyek Uji PDF Next.js', '{{FRANCO}}': 'Medan',
      '{{KAM}}': kam, '{{SALES}}': 'Budi Santoso', '{{ORGANISASI}}': org,
    },
    baris: produk.map((p, i) => [String(i + 1), p.jenis, teksProdukPdf({ namaProduk: p.nama, kodeWarna: p.kodeWarna, warna: p.warna }),
      p.kemasan, p.sg, p.dft, p.cov, p.harga > 0 ? formatRupiah(p.harga) : '-']),
  });
  writeFileSync(keluaran, await unduhPdf(hasil.pdfId));
  console.log(`PDF OK → ${keluaran}`);
  if (!process.argv.includes('--simpan')) {
    await drive().files.delete({ fileId: hasil.pdfId, supportsAllDrives: true });
    await drive().files.delete({ fileId: hasil.docId, supportsAllDrives: true });
    console.log('File uji di Drive dihapus.');
  }
}

main().catch((err) => { console.error(err instanceof Error ? err.stack : err); process.exitCode = 1; })
  .finally(() => mysqlPool.end());
