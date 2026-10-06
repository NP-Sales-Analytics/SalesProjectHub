import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword, PASSWORD_MIN } from '@/lib/password';

// Membuat / memulihkan akun Super Admin pertama dari env:
//   BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_NAMA (opsional)
// Jalankan: npm run bootstrap:admin

async function main() {
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '');
  const nama = String(process.env.BOOTSTRAP_ADMIN_NAMA ?? 'Super Admin').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('BOOTSTRAP_ADMIN_EMAIL belum diset / tidak valid.');
  if (password.length < PASSWORD_MIN) throw new Error(`BOOTSTRAP_ADMIN_PASSWORD minimal ${PASSWORD_MIN} karakter.`);

  const data = {
    username: nama.toLowerCase(), namaLengkap: nama, role: 'super admin' as const,
    passwordHash: await hashPassword(password), isActive: true, wajibGantiPassword: false,
  };
  const [ada] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (ada) {
    await db.update(users).set(data).where(eq(users.id, ada.id));
    console.log(`Super Admin diperbarui: ${email}`);
  } else {
    await db.insert(users).values({ id: randomUUID(), email, ...data });
    console.log(`Super Admin dibuat: ${email}`);
  }
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exitCode = 1; })
  .finally(() => mysqlPool.end());
