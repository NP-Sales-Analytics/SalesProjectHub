'use server';

import { eq, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';
import { clearSessionCookie, setSessionCookie } from '@/lib/session';

// Satu pesan untuk semua kegagalan kredensial: tidak membocorkan apakah akunnya ada.
const GAGAL = 'Username/email atau password salah.';

// `username` dikembalikan supaya kolomnya terisi lagi (React mereset form setelah action).
export type HasilLogin = { pesan: string; username: string } | null;

export async function signIn(_prev: HasilLogin, formData: FormData): Promise<HasilLogin> {
  const masukan = String(formData.get('username') ?? '').trim();
  const id = masukan.toLowerCase();
  const password = String(formData.get('password') ?? '');
  const gagal = (pesan: string) => ({ pesan, username: masukan });
  if (!id || !password) return gagal(GAGAL);

  // Per akun, bukan per IP: kantor berbagi satu IP publik.
  const { ok } = await rateLimit(`login:${id}`);
  if (!ok) return gagal('Terlalu banyak percobaan. Coba lagi sebentar.');

  const [akun] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, isActive: users.isActive })
    .from(users)
    .where(or(eq(users.username, id), eq(users.email, id)))
    .limit(1);

  if (!akun) {
    await hashPassword(password); // samakan waktu respons dengan akun yang ada
    return gagal(GAGAL);
  }
  const hasil = await verifyPassword(password, akun.passwordHash);
  if (!hasil.cocok) return gagal(GAGAL);
  if (!akun.isActive) return gagal('Akun Anda sudah dinonaktifkan. Hubungi Super Admin.');

  // Hash lama (hmac256$/sha256$) diganti scrypt begitu passwordnya terbukti benar.
  await db.update(users).set({
    lastLoginAt: new Date(),
    ...(hasil.perluRehash ? { passwordHash: await hashPassword(password) } : {}),
  }).where(eq(users.id, akun.id));

  await setSessionCookie(akun.id);
  redirect('/');
}

export async function signOut() {
  await clearSessionCookie();
  redirect('/login');
}
