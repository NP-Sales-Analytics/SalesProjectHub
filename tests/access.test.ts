import { describe, expect, it } from 'vitest';
import {
  bolehLihatEstimator, bolehLihatPenawaran, halamanDefault, halamanEfektif, hitungAkses,
  sembunyikanBiaya, type MasterAkses,
} from '@/lib/access';

const master: MasterAkses = {
  area: [
    { nama: 'Jakarta', emailApproval: 'mgr.jkt@x.co', emailApprovalSpec: null, emailApprovalSafl: null },
    { nama: 'Bandung', emailApproval: 'lain@x.co; MGR.JKT@x.co', emailApprovalSpec: null, emailApprovalSafl: null },
    { nama: 'Medan', emailApproval: 'mgr.mdn@x.co', emailApprovalSpec: 'mgr.jkt@x.co', emailApprovalSafl: null },
    { nama: 'Surabaya', emailApproval: 'mgr.sby@x.co', emailApprovalSpec: null, emailApprovalSafl: null },
  ],
  organisasi: [
    { nama: 'TU Jakarta', managerEmail: 'mgr.jkt@x.co' },
    { nama: 'TU Sumatera', managerEmail: 'mgr.mdn@x.co' },
    { nama: 'Spec Project-TU East', managerEmail: null },
  ],
  salesOrganisasi: [
    { namaSales: 'Budi', email: 'budi@x.co', organisasi: 'TU Jakarta', area: 'Jakarta' },
    { namaSales: 'Budi', email: 'budi@x.co', organisasi: 'Spec Project-TU East', area: 'Surabaya' },
    { namaSales: 'Sari', email: 'sari@x.co', organisasi: 'TU Sumatera', area: 'Medan' },
    { namaSales: 'Tono', email: 'tono@x.co', organisasi: 'TU Jakarta', area: '' },
  ],
};
const tanpaSetelan = { area: [], organisasi: [] };

describe('halaman', () => {
  it('default per role: sales tanpa kedua halaman approval', () => {
    expect(halamanDefault('sales')).not.toContain('/penawaran/approval');
    expect(halamanDefault('sales')).not.toContain('/estimator/approval');
    expect(halamanDefault('manager')).toContain('/penawaran/approval');
    expect(halamanDefault('manager admin')).not.toContain('/estimator/approval');
  });

  it('Setting mengikuti role, bukan setelan halaman', () => {
    const sa = halamanEfektif({ role: 'super admin', aksesKustom: true, halaman: [] });
    expect(sa).toContain('/admin/users');
    expect(sa).toContain('/admin/area');
    expect(sa).toContain('/penawaran/approval'); // super admin selalu semua halaman
    const admin = halamanEfektif({ role: 'admin', aksesKustom: false, halaman: [] });
    expect(admin).toContain('/admin/area');
    expect(admin).not.toContain('/admin/users');
    expect(halamanEfektif({ role: 'manager', aksesKustom: false, halaman: [] })).not.toContain('/admin/area');
  });

  it('setelan kustom dipakai persis, href tak dikenal dibuang', () => {
    const h = halamanEfektif({ role: 'manager', aksesKustom: true, halaman: ['/penawaran', '/evil', '/dashboard'] });
    expect(h).toEqual(['/dashboard', '/penawaran']);
  });
});

describe('cakupan default (tanpa setelan tersimpan)', () => {
  it('manager: area dari email approval (semua varian), organisasi dari manager organisasi', () => {
    const a = hitungAkses({ role: 'manager', email: 'MGR.jkt@x.co', aksesKustom: false }, tanpaSetelan, master);
    expect(a.area).toEqual(['Jakarta', 'Bandung', 'Medan']);
    expect(a.organisasi).toEqual(['TU Jakarta']);
  });

  it('admin: semua area & organisasi', () => {
    const a = hitungAkses({ role: 'admin', email: 'a@x.co', aksesKustom: false }, tanpaSetelan, master);
    expect(a.area).toHaveLength(4);
    expect(a.organisasi).toHaveLength(3);
  });

  it('sales: organisasi & penugasan dari master SALES (lintas organisasi)', () => {
    const a = hitungAkses({ role: 'sales', email: 'budi@x.co', aksesKustom: false }, tanpaSetelan, master);
    expect(a.area).toEqual([]);
    expect(a.organisasi).toEqual(['TU Jakarta', 'Spec Project-TU East']);
    expect(a.penugasan).toHaveLength(2);
  });
});

describe('cakupan kustom', () => {
  it('nilai tersimpan disaring ke master (tak peka huruf besar), sales tanpa area', () => {
    const a = hitungAkses({ role: 'manager', email: 'm@x.co', aksesKustom: true },
      { area: ['jakarta', 'Tidak Ada'], organisasi: ['tu sumatera'] }, master);
    expect(a.area).toEqual(['Jakarta']);
    expect(a.organisasi).toEqual(['TU Sumatera']);
    const s = hitungAkses({ role: 'sales', email: 'budi@x.co', aksesKustom: true },
      { area: ['Jakarta'], organisasi: ['TU Jakarta'] }, master);
    expect(s.area).toEqual([]);
    expect(s.penugasan).toEqual([{ organisasi: 'TU Jakarta', namaSales: 'Budi' }]); // Spec dicabut
  });
});

describe('visibilitas penawaran', () => {
  const p = (area: string, organisasi: string, namaSales: string) => ({ area, organisasi, namaSales });

  it('super admin melihat semua', () => {
    const a = hitungAkses({ role: 'super admin', email: 's@x.co', aksesKustom: false }, tanpaSetelan, master);
    expect(bolehLihatPenawaran(a, p('Planet', 'Org Asing', 'Siapa'))).toBe(true);
  });

  it('manager: area DAN organisasi harus diizinkan', () => {
    const a = hitungAkses({ role: 'manager', email: 'mgr.jkt@x.co', aksesKustom: false }, tanpaSetelan, master);
    expect(bolehLihatPenawaran(a, p('jakarta', 'TU Jakarta', 'Budi'))).toBe(true);
    expect(bolehLihatPenawaran(a, p('Surabaya', 'TU Jakarta', 'Budi'))).toBe(false); // area terlarang
    expect(bolehLihatPenawaran(a, p('Medan', 'TU Sumatera', 'Sari'))).toBe(false); // organisasi terlarang
  });

  it('sales: hanya pasangan (organisasi, nama sales) miliknya', () => {
    const a = hitungAkses({ role: 'sales', email: 'budi@x.co', aksesKustom: false }, tanpaSetelan, master);
    expect(bolehLihatPenawaran(a, p('Jakarta', 'TU Jakarta', 'budi'))).toBe(true);
    expect(bolehLihatPenawaran(a, p('Jakarta', 'TU Jakarta', 'Tono'))).toBe(false); // sales lain, org sama
    expect(bolehLihatPenawaran(a, p('Medan', 'TU Sumatera', 'Budi'))).toBe(false); // nama sama, org lain
  });
});

describe('visibilitas estimator', () => {
  const e = (organisasi: string, namaSales: string, dibuatOlehEmail: string | null = null) =>
    ({ organisasi, namaSales, dibuatOlehEmail });

  it('admin/manager: lewat area sales; area sales kosong = lolos', () => {
    const a = hitungAkses({ role: 'manager', email: 'm@x.co', aksesKustom: true },
      { area: ['Medan'], organisasi: ['TU Jakarta', 'TU Sumatera'] }, master);
    expect(bolehLihatEstimator(a, master, e('TU Sumatera', 'Sari'))).toBe(true);
    expect(bolehLihatEstimator(a, master, e('TU Jakarta', 'Budi'))).toBe(false); // Budi di Jakarta
    expect(bolehLihatEstimator(a, master, e('TU Jakarta', 'Tono'))).toBe(true); // area kosong
  });

  it('sales: buatan sendiri atau penugasannya, dalam organisasinya', () => {
    const a = hitungAkses({ role: 'sales', email: 'sari@x.co', aksesKustom: false }, tanpaSetelan, master);
    expect(bolehLihatEstimator(a, master, e('TU Sumatera', 'Sari'))).toBe(true);
    expect(bolehLihatEstimator(a, master, e('TU Sumatera', '', 'SARI@x.co'))).toBe(true);
    expect(bolehLihatEstimator(a, master, e('TU Jakarta', '', 'sari@x.co'))).toBe(false); // org bukan miliknya
  });

  it('biaya disembunyikan hanya untuk sales', () => {
    expect(sembunyikanBiaya('sales')).toBe(true);
    expect(sembunyikanBiaya('manager')).toBe(false);
  });
});
