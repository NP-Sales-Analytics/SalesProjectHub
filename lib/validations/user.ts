import { z } from 'zod';
import { ROLE_FORM, SEMUA_HREF } from '@/lib/access';
import { PASSWORD_MIN } from '@/lib/password-aturan';

const daftar = z.array(z.string().trim()).default([]);

export const userInputSchema = z.object({
  namaLengkap: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(200),
  email: z.string().trim().toLowerCase().email('Format email tidak valid.').max(255),
  role: z.enum(ROLE_FORM as [string, ...string[]], { message: 'Role user tidak valid.' }),
  password: z.string().default(''),
  isActive: z.boolean(),
  halaman: daftar,
  area: daftar,
  organisasi: daftar,
});
export type UserInput = z.input<typeof userInputSchema>;

/**
 * Aturan _validateManagedUserPayload + _finalizeManagedUserAccess lama.
 * `validArea`/`validOrg` = nama master (untuk menyaring & normalisasi kapitalisasi).
 */
export function rapikanUser(raw: unknown, opsi: { baru: boolean; validArea: string[]; validOrg: string[] }) {
  const p = userInputSchema.parse(raw);
  const role = p.role as (typeof ROLE_FORM)[number];
  if (opsi.baru && !p.password) throw new Error('Password wajib diisi.');
  if (p.password && p.password.length < PASSWORD_MIN) throw new Error(`Password minimal ${PASSWORD_MIN} karakter.`);

  const saring = (pilihan: string[], valid: string[]) => {
    const peta = new Map(valid.map((v) => [v.toLowerCase(), v]));
    return [...new Set(pilihan.map((x) => peta.get(x.toLowerCase())).filter((v): v is string => !!v))];
  };
  let halaman = SEMUA_HREF.filter((h) => p.halaman.includes(h));
  let area = saring(p.area, opsi.validArea);
  let organisasi = saring(p.organisasi, opsi.validOrg);

  if (role === 'super admin') {
    halaman = [...SEMUA_HREF];
    area = [...opsi.validArea];
    organisasi = [...opsi.validOrg];
  }
  if (role === 'sales') area = [];
  if (p.isActive && role !== 'super admin' && !halaman.length) {
    throw new Error('User aktif harus memiliki minimal satu akses halaman.');
  }
  if (p.isActive && (role === 'admin' || role === 'manager') && !area.length) {
    throw new Error('User Admin atau Manager aktif harus memiliki minimal satu akses area.');
  }
  if (p.isActive && !organisasi.length) throw new Error('User aktif harus memiliki minimal satu organisasi.');

  return { ...p, role, halaman, area, organisasi };
}
