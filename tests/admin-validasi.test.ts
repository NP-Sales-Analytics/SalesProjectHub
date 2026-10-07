import { describe, expect, it } from 'vitest';
import { areaInputSchema } from '@/lib/admin/area';
import { rapikanUser } from '@/lib/validations/user';

const validArea = ['Jakarta', 'Medan'];
const validOrg = ['TU Jakarta', 'TU Sumatera'];
const dasar = {
  namaLengkap: ' Budi Santoso ', email: ' BUDI@Example.com ', role: 'manager', password: 'rahasia123',
  isActive: true, halaman: ['/dashboard', '/penawaran'], area: ['jakarta'], organisasi: ['tu jakarta'],
};
const rapikan = (x: object, baru = true) => rapikanUser({ ...dasar, ...x }, { baru, validArea, validOrg });

describe('validasi user (port _validateManagedUserPayload/_finalizeManagedUserAccess)', () => {
  it('merapikan teks & menormalkan nama master', () => {
    const u = rapikan({});
    expect(u.namaLengkap).toBe('Budi Santoso');
    expect(u.email).toBe('budi@example.com');
    expect(u.area).toEqual(['Jakarta']);
    expect(u.organisasi).toEqual(['TU Jakarta']);
  });

  it('password awal: wajib untuk user baru, opsional saat edit, minimal 4 (pola lama)', () => {
    expect(() => rapikan({ password: '' })).toThrow('Password wajib diisi.');
    expect(rapikan({ password: '' }, false).password).toBe('');
    expect(() => rapikan({ password: 'abc' })).toThrow('minimal 4');
    expect(rapikan({ password: 'PDS_541' }).password).toBe('PDS_541'); // pola password lama tetap boleh
  });

  it('super admin selalu semua halaman/area/organisasi', () => {
    const u = rapikan({ role: 'super admin', halaman: [], area: [], organisasi: [] });
    expect(u.halaman).toHaveLength(7);
    expect(u.area).toEqual(validArea);
    expect(u.organisasi).toEqual(validOrg);
  });

  it('sales tidak punya akses area', () => {
    expect(rapikan({ role: 'sales', halaman: ['/penawaran'] }).area).toEqual([]);
  });

  it('aturan minimum untuk user aktif', () => {
    expect(() => rapikan({ halaman: [] })).toThrow('minimal satu akses halaman');
    expect(() => rapikan({ area: ['Planet'] })).toThrow('minimal satu akses area');
    expect(() => rapikan({ organisasi: [] })).toThrow('minimal satu organisasi');
    expect(rapikan({ isActive: false, halaman: [], area: [], organisasi: [] }).isActive).toBe(false);
  });

  it('role legacy / tak dikenal ditolak di form', () => {
    expect(() => rapikan({ role: 'manager admin' })).toThrow();
    expect(() => rapikan({ email: 'bukan-email' })).toThrow('Format email tidak valid.');
  });
});

describe('validasi area (port saveArea)', () => {
  it('singkatan dijadikan huruf besar dan wajib 2–5 huruf', () => {
    expect(areaInputSchema.parse({ singkatan: 'mks' }).singkatan).toBe('MKS');
    expect(() => areaInputSchema.parse({ singkatan: 'M1' })).toThrow('2–5 huruf');
    expect(() => areaInputSchema.parse({ singkatan: 'ABCDEF' })).toThrow('2–5 huruf');
  });

  it('urutan angka bulat atau kosong; teks kosong menjadi null', () => {
    const a = areaInputSchema.parse({ singkatan: 'JKT', urutan: '7', emailCc: '  ' });
    expect(a.urutan).toBe(7);
    expect(a.emailCc).toBeNull();
    expect(areaInputSchema.parse({ singkatan: 'JKT', urutan: '' }).urutan).toBe('');
    expect(() => areaInputSchema.parse({ singkatan: 'JKT', urutan: '1.5' })).toThrow();
  });
});
