import { describe, expect, it } from 'vitest';
import {
  alasanNonStandar, formatNomorEstimator, formatNomorPenawaran, grupKam, grupOrganisasi, hargaMaster,
  hasilEditPenawaran, kolomArea, sekarangWib, singkatanArea, tanggalDokumen, teksProdukPdf,
  type ItemPenawaran, type ProdukMaster,
} from '@/lib/penawaran/aturan';

const master: ProdukMaster[] = [
  { nama: 'Vinilex', jenisRm: 'RM', warna: 'Putih', kemasan: '5 kg', fp1: 100, fp2: 97, fp3: 94, fp4: 90 },
  { nama: 'Vinilex', jenisRm: 'CCM', warna: 'Base A', kemasan: '20 L', fp1: 500, fp2: 480, fp3: 460, fp4: 450 },
];
const item = (x: Partial<ItemPenawaran>): ItemPenawaran => ({
  jenisProduk: 'Interior', tier: 'FP-2', namaProduk: 'Vinilex', jenisRm: 'RM', warna: 'Putih', kemasan: '5 kg',
  kodeWarna: '', catatanAdmin: '', harga: 97, ...x,
});

describe('nomor dokumen', () => {
  // 30 Apr 2026 20:00 UTC = 1 Mei 2026 03:00 WIB → bulan V (zona WIB, seperti Apps Script lama)
  const t = new Date(Date.UTC(2026, 3, 30, 20, 0));
  it('format penawaran & estimator memakai bulan romawi WIB', () => {
    expect(sekarangWib(t).iso).toBe('2026-05-01');
    expect(formatNomorPenawaran(479, 'JKT', t)).toBe('479/NIP-PRJ/V/2026/JKT');
    expect(formatNomorEstimator(3, t)).toBe('EST-3/V/2026');
  });
  it('singkatan area: master → 3 huruf nama → GEN', () => {
    expect(singkatanArea('Jakarta', 'jkt')).toBe('JKT');
    expect(singkatanArea('Bangka Belitung', null)).toBe('BAN');
    expect(singkatanArea('', 'JKT')).toBe('GEN');
    expect(singkatanArea('123', null)).toBe('GEN');
  });
  it('tanggal dokumen "dd MMM yyyy"', () => expect(tanggalDokumen('2026-10-06')).toBe('06 Oct 2026'));
});

describe('penawaran standar (isStandardOffer)', () => {
  it('produk master lengkap dengan harga = standar', () => expect(alasanNonStandar([item({})], master)).toBeNull());
  it.each([
    ['CCM', { jenisRm: 'ccm', warna: 'Base A', kemasan: '20 L' }, 'CCM'],
    ['tier Others', { tier: 'Others' }, 'Others'],
    ['catatan admin', { catatanAdmin: 'mohon diskon' }, 'catatan admin'],
    ['produk custom', { namaProduk: 'Cat Lain' }, 'produk custom'],
    ['kemasan custom', { kemasan: '1 kg' }, 'kemasan custom'],
    ['harga nol', { harga: 0 }, 'harga'],
    ['beda huruf besar = custom (persis seperti lama)', { namaProduk: 'VINILEX' }, 'produk custom'],
  ])('%s → Pending Admin', (_n, x, alasan) => {
    expect(alasanNonStandar([item({}), item(x as Partial<ItemPenawaran>)], master)).toContain(alasan);
  });
});

describe('harga dari master', () => {
  it('ambil kolom FP sesuai tier; kombinasi asing / Others = 0', () => {
    expect(hargaMaster(item({ tier: 'FP-4' }), master)).toBe(90);
    expect(hargaMaster(item({ tier: 'Others' }), master)).toBe(0);
    expect(hargaMaster(item({ kemasan: '1 kg' }), master)).toBe(0);
  });
});

describe('alur Edit Penawaran (updatePenawaran)', () => {
  it('Approved (Revisi) → Approved + konfirmasi; Pending Approve → tanpa email; lainnya → minta approval', () => {
    expect(hasilEditPenawaran('Approved (Revisi)')).toEqual({ status: 'Approved', mode: 'confirm_approved' });
    expect(hasilEditPenawaran('Pending Approve')).toEqual({ status: 'Pending Approve', mode: 'no_email' });
    for (const s of ['Pending Admin', 'Ditolak', 'Approved']) {
      expect(hasilEditPenawaran(s)).toEqual({ status: 'Pending Approve', mode: 'request_approval' });
    }
  });
});

describe('template & routing', () => {
  it('grup KAM: kata kunci, entri pertama menang, default 1', () => {
    expect(grupKam('KAM High Rise & Special Building')).toBe(1);
    expect(grupKam('Housing & Landed')).toBe(2);
    expect(grupKam('Pemerintah & BUMN')).toBe(3);
    expect(grupKam('Building Maintenance')).toBe(4);
    expect(grupKam('Swasta Maintenance')).toBe(1); // dua cocok → yang pertama
    expect(grupKam('')).toBe(1);
    expect(grupKam('Lainnya')).toBe(1);
  });
  it('grup organisasi: safl → sumatera → jawa', () => {
    expect(grupOrganisasi('TU Project SAFL', 'safl')).toBe('safl');
    expect(grupOrganisasi('Spec Project-TU Sumatera', 'spec')).toBe('sumatera');
    expect(grupOrganisasi('TU Jakarta', 'reguler')).toBe('jawa');
  });
  it('kolom area mengikuti kategori organisasi', () => {
    const a = { emailApproval: 'reg@x', emailApprovalSpec: 'spec@x', emailApprovalSafl: 'safl@x' };
    expect(kolomArea(a, 'reguler', 'emailApproval')).toBe('reg@x');
    expect(kolomArea(a, 'spec', 'emailApproval')).toBe('spec@x');
    expect(kolomArea(a, 'safl', 'emailApproval')).toBe('safl@x');
  });
  it('teks produk PDF: kode warna diutamakan, lalu warna', () => {
    expect(teksProdukPdf({ namaProduk: 'Vinilex', kodeWarna: 'NP OW 1015 P', warna: 'Putih' })).toBe('Vinilex  (NP OW 1015 P)');
    expect(teksProdukPdf({ namaProduk: 'Vinilex', kodeWarna: '', warna: 'Putih' })).toBe('Vinilex  (Putih)');
    expect(teksProdukPdf({ namaProduk: 'Vinilex', kodeWarna: null, warna: '' })).toBe('Vinilex');
  });
});
