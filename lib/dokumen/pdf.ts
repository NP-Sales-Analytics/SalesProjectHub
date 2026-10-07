import { Readable } from 'node:stream';
import type { docs_v1 } from 'googleapis';
import { bacaConfig, KUNCI_CONFIG } from '@/lib/config';
import { docs, drive } from '@/lib/google';

// Port buatDokumenPenawaran + _isiTabelProduk (DocumentApp/DriveApp → Docs API v1 + Drive API v3).

export type DataPdf = {
  nomor: string;
  tanggalTampil: string; // "06 Oct 2026"
  grupKam: 1 | 2 | 3 | 4;
  grupOrg: 'jawa' | 'sumatera' | 'safl';
  placeholder: Record<string, string>; // {{...}} → nilai
  baris: string[][]; // 8 kolom per produk, sudah siap tampil
  namaFile: string; // "<N> - <perusahaan> - <sales>"
};

/** Perataan per kolom tabel produk (No, Jenis, Nama, Kemasan, SG, DFT, Coverage, Harga). */
const RATA: docs_v1.Schema$ParagraphStyle['alignment'][] = ['CENTER', 'CENTER', 'START', 'CENTER', 'CENTER', 'CENTER', 'CENTER', 'END'];

type Tabel = { startIndex: number; table: docs_v1.Schema$Table };

function semuaTabel(doc: docs_v1.Schema$Document): Tabel[] {
  return (doc.body?.content ?? []).filter((c) => c.table).map((c) => ({ startIndex: c.startIndex!, table: c.table! }));
}

const teksSel = (cell: docs_v1.Schema$TableCell) =>
  (cell.content ?? []).flatMap((c) => c.paragraph?.elements ?? []).map((e) => e.textRun?.content ?? '').join('');

/** Tabel produk: sel (0,0) berawalan "NO", atau tabel pertama dengan ≥ 5 kolom (sama seperti lama). */
export function cariTabelProduk(doc: docs_v1.Schema$Document): Tabel | null {
  const tabel = semuaTabel(doc).filter((t) => (t.table.tableRows?.length ?? 0) > 0);
  return tabel.find((t) => teksSel(t.table.tableRows![0].tableCells![0]).toUpperCase().trim().startsWith('NO'))
    ?? tabel.find((t) => (t.table.tableRows![0].tableCells?.length ?? 0) >= 5)
    ?? null;
}

async function batch(documentId: string, requests: docs_v1.Schema$Request[]) {
  if (requests.length) await docs().documents.batchUpdate({ documentId, requestBody: { requests } });
}

async function isiTabelProduk(documentId: string, baris: string[][]) {
  const ambil = async () => (await docs().documents.get({ documentId })).data;
  const awal = cariTabelProduk(await ambil());
  if (!awal) return; // template tanpa tabel produk: sama seperti lama, dilewati
  const lokasi = (rowIndex: number) => ({ tableStartLocation: { index: awal.startIndex }, rowIndex, columnIndex: 0 });
  const jumlahLama = awal.table.tableRows!.length;
  const kolom = awal.table.tableRows![0].tableCells!.length;

  // 1) Hapus baris data lama (pertahankan header), lalu sisipkan baris kosong sebanyak produk.
  await batch(documentId, [
    ...Array.from({ length: jumlahLama - 1 }, (_, i) => ({ deleteTableRow: { tableCellLocation: lokasi(jumlahLama - 1 - i) } })),
    ...baris.map((_, i) => ({ insertTableRow: { tableCellLocation: lokasi(i), insertBelow: true } })),
  ]);

  // 2) Isi teks dari sel paling belakang ke depan supaya indeks sel di depannya tidak bergeser.
  const setelahSisip = cariTabelProduk(await ambil())!;
  const isi: docs_v1.Schema$Request[] = [];
  baris.forEach((nilai, r) => {
    const sel = setelahSisip.table.tableRows![r + 1].tableCells!;
    for (let c = 0; c < Math.min(kolom, nilai.length); c++) {
      const teks = String(nilai[c] ?? '').replace(/\r\n|\r|\n/g, ' ').trim();
      if (teks) isi.push({ insertText: { location: { index: sel[c].content![0].startIndex! }, text: teks } });
    }
  });
  isi.sort((a, b) => b.insertText!.location!.index! - a.insertText!.location!.index!);
  await batch(documentId, isi);

  // 3) Gaya: Calibri 8pt hitam tidak tebal, perataan per kolom, latar sel putih (sama seperti lama).
  const akhir = cariTabelProduk(await ambil())!;
  const gaya: docs_v1.Schema$Request[] = [];
  for (let r = 1; r <= baris.length; r++) {
    akhir.table.tableRows![r].tableCells!.forEach((cell, c) => {
      const mulai = cell.content![0].startIndex!;
      const selesai = cell.content![cell.content!.length - 1].endIndex! - 1;
      if (selesai > mulai) {
        gaya.push({
          updateTextStyle: {
            range: { startIndex: mulai, endIndex: selesai },
            textStyle: {
              fontSize: { magnitude: 8, unit: 'PT' }, weightedFontFamily: { fontFamily: 'Calibri' }, bold: false,
              foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } }, backgroundColor: {},
            },
            fields: 'fontSize,weightedFontFamily,bold,foregroundColor,backgroundColor',
          },
        });
      }
      gaya.push({
        updateParagraphStyle: {
          range: { startIndex: mulai, endIndex: Math.max(selesai, mulai + 1) },
          paragraphStyle: { alignment: RATA[c] ?? 'START', spaceAbove: { magnitude: 2, unit: 'PT' }, spaceBelow: { magnitude: 2, unit: 'PT' } },
          fields: 'alignment,spaceAbove,spaceBelow',
        },
      });
    });
  }
  if (baris.length) {
    gaya.push({
      updateTableCellStyle: {
        tableRange: { tableCellLocation: lokasi(1), rowSpan: baris.length, columnSpan: kolom },
        tableCellStyle: { backgroundColor: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } } },
        fields: 'backgroundColor',
      },
    });
  }
  await batch(documentId, gaya);
}

/** Buat Google Doc dari template, isi, ekspor PDF ke folder output. */
export async function buatPdfPenawaran(d: DataPdf): Promise<{ docId: string; pdfId: string; pdfUrl: string }> {
  const [templateId, folderId] = await Promise.all([
    bacaConfig(KUNCI_CONFIG.template(d.grupKam, d.grupOrg)), bacaConfig(KUNCI_CONFIG.folderOutputPdf),
  ]);
  if (!templateId) throw new Error(`Template untuk KAM grup ${d.grupKam} / ${d.grupOrg} belum diatur di app_config.`);
  if (!folderId) throw new Error('Folder output PDF belum diatur di app_config.');

  const dr = drive();
  const salinan = await dr.files.copy({
    fileId: templateId, supportsAllDrives: true, fields: 'id',
    requestBody: { name: d.namaFile, parents: [folderId] },
  });
  const docId = salinan.data.id!;

  await batch(docId, Object.entries(d.placeholder).map(([kunci, nilai]) => ({
    replaceAllText: { containsText: { text: kunci, matchCase: true }, replaceText: nilai },
  })));
  await isiTabelProduk(docId, d.baris);

  const pdf = await dr.files.export({ fileId: docId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' });
  const unggah = await dr.files.create({
    supportsAllDrives: true, fields: 'id, webViewLink',
    requestBody: { name: `${d.namaFile}.pdf`, parents: [folderId], mimeType: 'application/pdf' },
    media: { mimeType: 'application/pdf', body: Readable.from(Buffer.from(pdf.data as ArrayBuffer)) },
  });
  const pdfId = unggah.data.id!;
  try {
    // Sama seperti lama: siapa pun dengan tautan bisa melihat (bisa ditolak kebijakan Shared Drive — tidak fatal).
    await dr.permissions.create({ fileId: pdfId, supportsAllDrives: true, requestBody: { type: 'anyone', role: 'reader' } });
  } catch (err) {
    console.warn('[pdf] berbagi lewat tautan ditolak:', err instanceof Error ? err.message : err);
  }
  return { docId, pdfId, pdfUrl: unggah.data.webViewLink ?? `https://drive.google.com/file/d/${pdfId}/view` };
}

/** Unduh isi PDF (lampiran email konfirmasi "disetujui"). */
export async function unduhPdf(pdfId: string): Promise<Buffer> {
  const r = await drive().files.get({ fileId: pdfId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' });
  return Buffer.from(r.data as ArrayBuffer);
}
