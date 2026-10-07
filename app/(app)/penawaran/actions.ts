'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { AksesDitolak, wajibHalaman, wajibRole } from '@/lib/auth';
import {
  editLangsungPenawaran, GalatPenawaran, putuskanPenawaran, submitPenawaran, ubahPenawaran,
} from '@/lib/penawaran/service';

export type HasilAksi<T = undefined> = { ok: true; pesan: string; data?: T } | { ok: false; pesan: string };

function gagal(err: unknown): { ok: false; pesan: string } {
  if (err instanceof ZodError) return { ok: false, pesan: err.issues[0]?.message ?? 'Data tidak valid.' };
  if (err instanceof GalatPenawaran || err instanceof AksesDitolak) return { ok: false, pesan: err.message };
  console.error('[penawaran]', err);
  return { ok: false, pesan: 'Terjadi kesalahan di server. Tidak ada data yang tersimpan; silakan coba lagi.' };
}

const segarkan = () => { revalidatePath('/penawaran'); revalidatePath('/dashboard'); };

export async function aksiSubmitPenawaran(input: unknown): Promise<HasilAksi<{ nomor: string; status: string }>> {
  try {
    const user = await wajibHalaman('/penawaran/baru');
    const r = await submitPenawaran(user, input);
    segarkan();
    return {
      ok: true, data: { nomor: r.nomor, status: r.status },
      pesan: r.status === 'Pending Approve'
        ? `Penawaran ${r.nomor} terkirim dan menunggu approval.`
        : `Penawaran ${r.nomor} masuk antrean Admin (${r.alasanNonStandar}).`,
    };
  } catch (err) { return gagal(err); }
}

// Edit Penawaran & edit langsung: khusus Admin / Super Admin (dulu dilindungi PIN admin bersama).
export async function aksiUbahPenawaran(id: string, input: unknown): Promise<HasilAksi<{ status: string }>> {
  try {
    const user = await wajibRole(['super admin', 'admin']);
    const r = await ubahPenawaran(user, id, input);
    segarkan();
    return { ok: true, data: r, pesan: `Perubahan disimpan. Status: ${r.status}.` };
  } catch (err) { return gagal(err); }
}

export async function aksiEditLangsung(id: string, input: unknown): Promise<HasilAksi> {
  try {
    const user = await wajibRole(['super admin', 'admin']);
    const r = await editLangsungPenawaran(user, id, input);
    segarkan();
    return { ok: true, pesan: r.pdfDiperbarui ? 'Data diperbarui. PDF sedang dibuat ulang.' : 'Data diperbarui.' };
  } catch (err) { return gagal(err); }
}

// Approval: siapa pun yang punya akses halaman Approval Center (dulu password bersama).
export async function aksiPutuskan(id: string, input: unknown): Promise<HasilAksi<{ status: string }>> {
  try {
    const user = await wajibHalaman('/penawaran/approval');
    const r = await putuskanPenawaran(user, id, input);
    segarkan();
    revalidatePath('/penawaran/approval');
    return { ok: true, data: r, pesan: `Penawaran ${r.status === 'Ditolak' ? 'ditolak' : 'disetujui'}. Email konfirmasi dikirim ke pengaju.` };
  } catch (err) { return gagal(err); }
}
