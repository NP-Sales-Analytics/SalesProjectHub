'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { auditLog, users } from '@/lib/db/schema';
import { hashPassword, PASSWORD_MIN, verifyPassword } from '@/lib/password';
import { getSession, setSessionCookie } from '@/lib/session';

export async function gantiPassword(_prev: string | null, formData: FormData): Promise<string | null> {
  // Sengaja TIDAK lewat getSessionUser(): ia di-memo React cache() per request, dan
  // render redirect('/') di bawah berjalan di request yang sama — ia akan memakai data
  // lama (wajib ganti = true) dan memantulkan user kembali ke halaman ini.
  const session = await getSession();
  if (!session) redirect('/login');
  const [user] = await db.select({ id: users.id, isActive: users.isActive, passwordHash: users.passwordHash }).from(users).where(eq(users.id, session.id)).limit(1);
  if (!user?.isActive) redirect('/login');

  const baru = String(formData.get('password') ?? '');
  const ulang = String(formData.get('ulang') ?? '');
  if (baru.length < PASSWORD_MIN) return `Password minimal ${PASSWORD_MIN} karakter.`;
  if (baru !== ulang) return 'Konfirmasi password tidak sama.';
  if ((await verifyPassword(baru, user.passwordHash)).cocok) return 'Password baru harus berbeda dari password sebelumnya.';

  await db.transaction(async (tx) => {
    await tx.update(users)
      .set({ passwordHash: await hashPassword(baru), wajibGantiPassword: false })
      .where(eq(users.id, user.id));
    await tx.insert(auditLog).values({ userId: user.id, aksi: 'ganti_password', entitas: 'users', entitasId: user.id });
  });
  // Cookie baru → kunci cache user baru → status wajib-ganti langsung segar.
  await setSessionCookie(user.id);
  redirect('/');
}
