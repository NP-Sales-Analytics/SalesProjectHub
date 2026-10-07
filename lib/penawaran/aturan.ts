// Aturan bisnis penawaran yang murni (tanpa database) — port 1:1 dari Kode.js lama,
// sehingga bisa dites langsung terhadap perilaku Sales Hub.

import type { KategoriOrganisasi } from '@/lib/db/schema';

export const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const BULAN_DOKUMEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Tanggal & bulan saat ini menurut WIB (Sales Hub lama berjalan di zona Asia/Jakarta). */
export function sekarangWib(now = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now).split('-').map(Number);
  return { tahun: y, bulan: m, hari: d, iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

/** Port getAreaSingkatan: singkatan master (huruf besar) → 3 huruf nama area → 'GEN'. */
export function singkatanArea(namaArea: string | null | undefined, singkatanMaster: string | null | undefined) {
  if (!String(namaArea ?? '').trim()) return 'GEN';
  if (String(singkatanMaster ?? '').trim()) return String(singkatanMaster).trim().toUpperCase();
  return String(namaArea).replace(/[^a-z]/gi, '').substring(0, 3).toUpperCase() || 'GEN';
}

/** `479/NIP-PRJ/IV/2026/JKT` (getNextId lama). */
export function formatNomorPenawaran(n: number, singkatan: string, now = new Date()) {
  const w = sekarangWib(now);
  return `${n}/NIP-PRJ/${ROMAWI[w.bulan - 1]}/${w.tahun}/${singkatan}`;
}

/** `EST-1/IV/2026` (getNextEstimatorId lama). */
export function formatNomorEstimator(n: number, now = new Date()) {
  const w = sekarangWib(now);
  return `EST-${n}/${ROMAWI[w.bulan - 1]}/${w.tahun}`;
}

/** Tanggal dokumen seperti Utilities.formatDate('dd MMM yyyy'): "06 Oct 2026". */
export function tanggalDokumen(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]} ${BULAN_DOKUMEN[Number(m[2]) - 1]} ${m[1]}` : iso;
}

// ─── Penawaran standar (isStandardOffer) ─────────────────────────────────

export type ProdukMaster = { nama: string; jenisRm: string; warna: string; kemasan: string; fp1: number; fp2: number; fp3: number; fp4: number };
export type ItemPenawaran = {
  jenisProduk: string; tier: string; namaProduk: string; jenisRm: string; warna: string; kemasan: string;
  kodeWarna: string; catatanAdmin: string; harga: number;
};

/**
 * Port isStandardOffer: penawaran masuk Pending Admin bila ADA SATU produk yang
 * (1) jenis RM CCM, (2) tier Others, (3) catatan admin diisi, (4) produk tidak ada di
 * master, (5) kombinasi nama+RM+warna+kemasan tidak ada di master, atau (6) harga ≤ 0.
 * Pencocokan master persis sama dengan versi lama (peka huruf besar).
 */
export function alasanNonStandar(items: ItemPenawaran[], master: ProdukMaster[]): string | null {
  for (const p of items) {
    if (p.jenisRm.trim().toUpperCase() === 'CCM') return `jenis RM CCM: ${p.namaProduk}`;
    if (p.tier.trim().toLowerCase() === 'others') return `tier Others: ${p.namaProduk}`;
    if (p.catatanAdmin.trim() !== '') return `catatan admin diisi: ${p.namaProduk}`;
    if (!master.some((r) => r.nama === p.namaProduk)) return `produk custom: ${p.namaProduk}`;
    if (!master.some((r) => r.nama === p.namaProduk && r.jenisRm === p.jenisRm && r.warna === p.warna && r.kemasan === p.kemasan)) {
      return `kemasan custom: ${p.namaProduk} / ${p.kemasan}`;
    }
    if (!(Number(p.harga) > 0)) return `harga tidak valid: ${p.namaProduk}`;
  }
  return null;
}

export const isPenawaranStandar = (items: ItemPenawaran[], master: ProdukMaster[]) => alasanNonStandar(items, master) === null;

/**
 * Harga satuan dari master menurut FP Tier (dulu dihitung di browser lalu dipercaya
 * server). Kombinasi tak ada di master / tier Others → 0.
 */
export function hargaMaster(p: Pick<ItemPenawaran, 'tier' | 'namaProduk' | 'jenisRm' | 'warna' | 'kemasan'>, master: ProdukMaster[]) {
  const baris = master.find((r) => r.nama === p.namaProduk && r.jenisRm === p.jenisRm && r.warna === p.warna && r.kemasan === p.kemasan);
  if (!baris) return 0;
  return ({ 'FP-1': baris.fp1, 'FP-2': baris.fp2, 'FP-3': baris.fp3, 'FP-4': baris.fp4 } as Record<string, number>)[p.tier] ?? 0;
}

// ─── Alur status (updatePenawaran) ───────────────────────────────────────

export type ModeDokumen = 'request_approval' | 'no_email' | 'confirm_approved';
export const CATATAN_REVISI = 'Dokumen telah direvisi oleh Admin sesuai instruksi approval sebelumnya.';

/** Status baru & mode email setelah Admin menyimpan Edit Penawaran (port updatePenawaran). */
export function hasilEditPenawaran(statusLama: string) {
  const s = statusLama.trim().toLowerCase();
  if (s === 'approved (revisi)') return { status: 'Approved' as const, mode: 'confirm_approved' as ModeDokumen };
  if (s === 'pending approve') return { status: 'Pending Approve' as const, mode: 'no_email' as ModeDokumen };
  return { status: 'Pending Approve' as const, mode: 'request_approval' as ModeDokumen };
}

export type AksiApproval = 'approve' | 'approve_revisi' | 'decline';
export const STATUS_DARI_AKSI: Record<AksiApproval, 'Approved' | 'Approved (Revisi)' | 'Ditolak'> = {
  approve: 'Approved', approve_revisi: 'Approved (Revisi)', decline: 'Ditolak',
};

// ─── Template & routing email ────────────────────────────────────────────

/** Grup KAM (KAM_TEMPLATE_MAP): substring tak peka huruf besar, entri pertama menang; default 1. */
const KATA_KUNCI_KAM = [
  ['high rise', 'special building', 'swasta'],
  ['housing', 'landed', 'military'],
  ['pemerintah', 'bumn', 'pemerintahan'],
  ['maintenance', 'repainting', 'building maintenance'],
];
export function grupKam(kam: string | null | undefined): 1 | 2 | 3 | 4 {
  const k = String(kam ?? '').trim().toLowerCase();
  if (!k) return 1;
  const i = KATA_KUNCI_KAM.findIndex((kata) => kata.some((w) => k.includes(w)));
  return (i < 0 ? 1 : i + 1) as 1 | 2 | 3 | 4;
}

/** _templateGroup: safl → sumatera (nama memuat "sumatera") → jawa. */
export function grupOrganisasi(nama: string | null | undefined, kategori: KategoriOrganisasi | null | undefined) {
  if (kategori === 'safl') return 'safl' as const;
  if (/sumatera/i.test(String(nama ?? ''))) return 'sumatera' as const;
  return 'jawa' as const;
}

/** Kolom area yang dipakai (email approval, CC PDF, sapaan) menurut kategori organisasi. */
export function kolomArea<T extends Record<string, unknown>>(area: T, kategori: KategoriOrganisasi | null | undefined, dasar: 'emailApproval' | 'ccPdf' | 'dearEmail') {
  const kunci = kategori === 'safl' ? `${dasar}Safl` : kategori === 'spec' ? `${dasar}Spec` : dasar;
  return String(area[kunci] ?? '').trim();
}

/** Teks kolom Nama Produk di PDF: "Nama  (kode warna | warna)" (_isiTabelProduk). */
export function teksProdukPdf(p: { namaProduk: string | null; kodeWarna: string | null; warna: string | null }) {
  const info = String(p.kodeWarna ?? '').trim() || String(p.warna ?? '').trim();
  return info ? `${p.namaProduk || '-'}  (${info})` : (p.namaProduk || '-');
}

export const formatRupiah = (n: number) => Number(n || 0).toLocaleString('id-ID');
