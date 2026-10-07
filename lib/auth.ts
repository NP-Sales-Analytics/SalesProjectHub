import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { halamanEfektif, hitungAkses, type Akses } from '@/lib/access';
import { db } from '@/lib/db';
import {
  area, organisasi, userAreaAccess, userOrganizationAccess, userPageAccess, users, type Role,
} from '@/lib/db/schema';
import { masterAkses } from '@/lib/master';
import { getSession } from '@/lib/session';
import { ttlCache } from '@/lib/ttl-cache';

export type { Role };
export type SessionUser = {
  id: string;
  username: string;
  namaLengkap: string;
  email: string;
  role: Role;
  wajibGantiPassword: boolean;
  /** href halaman yang boleh dibuka (katalog + Setting sesuai role). */
  halaman: string[];
  akses: Akses;
};

/**
 * TTL pendek (15 detik) supaya penonaktifan akun / perubahan role oleh admin cepat
 * berlaku — pengganti heartbeat getUserSessionState (60 detik) di Sales Hub lama.
 *
 * Kunci = `<userId>|<exp sesi>`. lupakanUser() dari server action TIDAK menjangkau
 * cache milik render halaman (Next memaketkan action di layer modul terpisah, dan di
 * Vercel tiap instance punya cache sendiri). Jadi perubahan atas akun SENDIRI
 * (login, ganti password) menerbitkan ulang cookie sesi → kunci baru → data segar.
 */
const cacheUser = ttlCache(async (kunci: string): Promise<SessionUser | null> => {
  const userId = kunci.split('|')[0];
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || !u.isActive) return null;

  const [halaman, aksesArea, aksesOrg, master] = await Promise.all([
    db.select({ href: userPageAccess.halaman }).from(userPageAccess).where(eq(userPageAccess.userId, u.id)),
    db.select({ nama: area.nama }).from(userAreaAccess)
      .innerJoin(area, eq(area.id, userAreaAccess.areaId)).where(eq(userAreaAccess.userId, u.id)),
    db.select({ nama: organisasi.nama }).from(userOrganizationAccess)
      .innerJoin(organisasi, eq(organisasi.id, userOrganizationAccess.organisasiId))
      .where(eq(userOrganizationAccess.userId, u.id)),
    masterAkses(),
  ]);

  return {
    id: u.id,
    username: u.username,
    namaLengkap: u.namaLengkap,
    email: u.email,
    role: u.role,
    wajibGantiPassword: u.wajibGantiPassword,
    halaman: halamanEfektif({ role: u.role, aksesKustom: u.aksesKustom, halaman: halaman.map((h) => h.href) }),
    akses: hitungAkses(
      { role: u.role, email: u.email, aksesKustom: u.aksesKustom },
      { area: aksesArea.map((a) => a.nama), organisasi: aksesOrg.map((o) => o.nama) },
      master,
    ),
  };
}, 15_000);

/**
 * Kosongkan cache user di layer modul pemanggil (efektif bila dipanggil dari render /
 * route handler). Dari server action, perubahan berlaku lewat TTL ≤15 detik.
 */
export const lupakanUser = () => cacheUser.clear();

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session) return null;
  return cacheUser.get(`${session.id}|${session.exp}`);
});

export const bolehHalaman = (user: SessionUser, href: string) => user.halaman.includes(href);

/** Halaman pertama yang boleh dibuka — tujuan setelah login. */
export const halamanAwal = (user: SessionUser) => user.halaman[0] ?? '/no-access';

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.wajibGantiPassword) redirect('/ganti-password');
  return user;
}

export async function requireHalaman(href: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!bolehHalaman(user, href)) redirect('/no-access');
  return user;
}

export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) redirect('/no-access');
  return user;
}

async function userApi(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  if (user.wajibGantiPassword) return NextResponse.json({ error: 'Wajib ganti password' }, { status: 403 });
  return user;
}

/** Izin API mengikuti halaman yang diberikan di User Management. */
export async function requireHalamanApi(href: string): Promise<SessionUser | NextResponse> {
  const user = await userApi();
  if (user instanceof NextResponse) return user;
  if (!bolehHalaman(user, href)) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
  return user;
}

export async function requireRoleApi(allowed: Role[]): Promise<SessionUser | NextResponse> {
  const user = await userApi();
  if (user instanceof NextResponse) return user;
  if (!allowed.includes(user.role)) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
  return user;
}

/** Untuk server action: lempar error bila tidak berhak (pesan aman ditampilkan). */
export async function wajibRole(allowed: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.wajibGantiPassword || !allowed.includes(user.role)) throw new AksesDitolak();
  return user;
}

export async function wajibHalaman(href: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.wajibGantiPassword || !bolehHalaman(user, href)) throw new AksesDitolak();
  return user;
}

export class AksesDitolak extends Error {
  constructor() {
    super('Tidak punya akses untuk tindakan ini. Silakan muat ulang halaman atau login kembali.');
  }
}
