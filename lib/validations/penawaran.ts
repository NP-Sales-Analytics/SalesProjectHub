import { z } from 'zod';

const t = (maks: number) => z.string().trim().max(maks);
const wajib = (label: string, maks: number) => t(maks).min(1, `${label} wajib diisi.`);

export const itemSchema = z.object({
  jenisProduk: wajib('Jenis Produk', 100),
  tier: wajib('FP Tier', 20),
  namaProduk: wajib('Nama Produk', 255),
  jenisRm: t(50).default(''),
  warna: t(100).default(''),
  kemasan: wajib('Kemasan', 50),
  kodeWarna: t(255).default('').transform((v) => v.replace(/\r\n|\r|\n/g, ' ')),
  catatanAdmin: t(2000).default('').transform((v) => v.replace(/\r\n|\r|\n/g, ' ')),
  // Hanya dipakai saat Admin mengisi harga manual (Edit Penawaran / edit langsung).
  harga: z.coerce.number().int('Harga harus angka bulat.').min(0, 'Harga tidak boleh negatif.').default(0),
});

export const penawaranSchema = z.object({
  organisasi: wajib('Organisasi', 150),
  namaSales: wajib('Nama Sales', 150),
  area: wajib('Area', 100),
  kam: wajib('Key Account Manager (KAM)', 150),
  franco: wajib('Lokasi Franco', 255),
  perusahaan: wajib('Nama Perusahaan', 255),
  pic: wajib('PIC', 200),
  telepon: t(100).default(''),
  email: z.union([z.literal(''), z.string().trim().email('Format email klien tidak valid.').max(255)]).default(''),
  namaProyek: wajib('Nama Proyek', 500),
  alamat: wajib('Alamat', 2000),
  produk: z.array(itemSchema).min(1, 'Minimal satu produk.').max(100, 'Maksimal 100 produk per penawaran.'),
});
export type PenawaranInput = z.input<typeof penawaranSchema>;
export type PenawaranData = z.output<typeof penawaranSchema>;

/** Edit langsung Admin (adminEditPenawaran): header + isi item, jumlah item tetap. */
export const editLangsungSchema = z.object({
  perusahaan: t(255), pic: t(200), telepon: t(100), email: t(255), alamat: t(2000), namaProyek: t(500),
  franco: t(255), kam: wajib('Key Account Manager (KAM)', 150), namaSales: t(150), area: t(100),
  produk: z.array(z.object({
    jenisProduk: t(100), namaProduk: t(255), tier: t(20), jenisRm: t(50), warna: t(100), kemasan: t(50),
    kodeWarna: t(255), catatanAdmin: t(2000),
    harga: z.coerce.number().int('Harga harus angka bulat.').min(0, 'Harga tidak boleh negatif.'),
  })),
});
export type EditLangsungInput = z.input<typeof editLangsungSchema>;

export const keputusanSchema = z.object({
  aksi: z.enum(['approve', 'approve_revisi', 'decline']),
  alasan: t(2000).default(''),
}).refine((v) => v.aksi === 'approve' || v.alasan.length > 0, {
  message: 'Alasan / catatan wajib diisi untuk penolakan dan persetujuan dengan revisi.', path: ['alasan'],
});
export type KeputusanInput = z.input<typeof keputusanSchema>;
