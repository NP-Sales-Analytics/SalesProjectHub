'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { buatUser, setAktif, ubahUser } from '@/lib/admin/users';
import { wajibRole } from '@/lib/auth';
import type { UserInput } from '@/lib/validations/user';

export type HasilAksi = { ok: true; pesan: string } | { ok: false; pesan: string };

function gagal(err: unknown): HasilAksi {
  if (err instanceof ZodError) return { ok: false, pesan: err.issues[0]?.message ?? 'Data tidak valid.' };
  if (err instanceof Error) return { ok: false, pesan: err.message };
  return { ok: false, pesan: 'Terjadi kesalahan.' };
}

// User Management khusus Super Admin (sama dengan sistem lama).
export async function aksiBuatUser(input: UserInput): Promise<HasilAksi> {
  try {
    const aktor = await wajibRole(['super admin']);
    const hasil = await buatUser(aktor, input);
    revalidatePath('/admin/users');
    return { ok: true, pesan: `User dibuat. Email akun dikirim ke ${hasil.email}.` };
  } catch (err) {
    return gagal(err);
  }
}

export async function aksiUbahUser(id: string, input: UserInput): Promise<HasilAksi> {
  try {
    const aktor = await wajibRole(['super admin']);
    await ubahUser(aktor, id, input);
    revalidatePath('/admin/users');
    return { ok: true, pesan: 'Perubahan user disimpan.' };
  } catch (err) {
    return gagal(err);
  }
}

export async function aksiSetAktif(id: string, aktif: boolean): Promise<HasilAksi> {
  try {
    const aktor = await wajibRole(['super admin']);
    await setAktif(aktor, id, aktif);
    revalidatePath('/admin/users');
    return { ok: true, pesan: aktif ? 'User diaktifkan.' : 'User dinonaktifkan.' };
  } catch (err) {
    return gagal(err);
  }
}
