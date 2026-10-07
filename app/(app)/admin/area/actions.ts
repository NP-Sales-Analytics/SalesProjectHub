'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { simpanArea, type AreaInput } from '@/lib/admin/area';
import { wajibRole } from '@/lib/auth';

export type HasilAksi = { ok: boolean; pesan: string };

export async function aksiSimpanArea(idLama: string | null, input: AreaInput): Promise<HasilAksi> {
  try {
    const aktor = await wajibRole(['super admin', 'admin']);
    const hasil = await simpanArea(aktor, idLama, input);
    revalidatePath('/admin/area');
    return { ok: true, pesan: hasil.baru ? 'Area baru berhasil ditambahkan.' : 'Perubahan area berhasil disimpan.' };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, pesan: err.issues[0]?.message ?? 'Data tidak valid.' };
    return { ok: false, pesan: err instanceof Error ? err.message : 'Terjadi kesalahan.' };
  }
}
