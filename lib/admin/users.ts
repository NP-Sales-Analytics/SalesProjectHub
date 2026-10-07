import { randomUUID } from 'node:crypto';
import { and, asc, eq, ne, or } from 'drizzle-orm';
import { hitungAkses } from '@/lib/access';
import { lupakanUser, type SessionUser } from '@/lib/auth';
import { segel } from '@/lib/crypto-box';
import { db } from '@/lib/db';
import {
  area, auditLog, organisasi, sales, salesOrganisasi, userAreaAccess, userOrganizationAccess,
  userPageAccess, users,
} from '@/lib/db/schema';
import { antreJob, prosesSetelahRespons } from '@/lib/jobs';
import { lupakanMaster, masterAkses } from '@/lib/master';
import { hashPassword } from '@/lib/password';
import { rapikanUser } from '@/lib/validations/user';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type BarisUser = {
  id: string;
  username: string;
  namaLengkap: string;
  email: string;
  role: (typeof users.$inferSelect)['role'];
  isActive: boolean;
  aksesKustom: boolean;
  halaman: string[];
  area: string[];
  organisasi: string[];
};

/** Daftar user untuk User Management (tanpa password_hash). */
export async function daftarUser(): Promise<BarisUser[]> {
  const [rows, hal, ar, org] = await Promise.all([
    db.select({
      id: users.id, username: users.username, namaLengkap: users.namaLengkap, email: users.email,
      role: users.role, isActive: users.isActive, aksesKustom: users.aksesKustom,
    }).from(users).orderBy(asc(users.namaLengkap)),
    db.select().from(userPageAccess),
    db.select({ userId: userAreaAccess.userId, nama: area.nama }).from(userAreaAccess)
      .innerJoin(area, eq(area.id, userAreaAccess.areaId)),
    db.select({ userId: userOrganizationAccess.userId, nama: organisasi.nama }).from(userOrganizationAccess)
      .innerJoin(organisasi, eq(organisasi.id, userOrganizationAccess.organisasiId)),
  ]);
  const kelompok = <T extends { userId: string }>(xs: T[], ambil: (x: T) => string) => {
    const m = new Map<string, string[]>();
    for (const x of xs) m.set(x.userId, [...(m.get(x.userId) ?? []), ambil(x)]);
    return m;
  };
  const h = kelompok(hal, (x) => x.halaman);
  const a = kelompok(ar, (x) => x.nama);
  const o = kelompok(org, (x) => x.nama);
  const master = await masterAkses();
  // Tanpa setelan tersimpan: tampilkan akses efektif default role (seperti UM lama),
  // supaya form edit tidak terbuka kosong.
  return rows.map((r) => {
    const efektif = hitungAkses({ role: r.role, email: r.email, aksesKustom: r.aksesKustom },
      { area: a.get(r.id) ?? [], organisasi: o.get(r.id) ?? [] }, master);
    return { ...r, halaman: h.get(r.id) ?? [], area: efektif.area, organisasi: efektif.organisasi };
  });
}

async function namaMaster() {
  const [ar, org] = await Promise.all([
    db.select({ id: area.id, nama: area.nama }).from(area),
    db.select({ id: organisasi.id, nama: organisasi.nama }).from(organisasi),
  ]);
  return { ar, org };
}

async function simpanAkses(tx: Tx, userId: string, data: { halaman: string[]; area: string[]; organisasi: string[] },
  master: Awaited<ReturnType<typeof namaMaster>>) {
  await tx.delete(userPageAccess).where(eq(userPageAccess.userId, userId));
  await tx.delete(userAreaAccess).where(eq(userAreaAccess.userId, userId));
  await tx.delete(userOrganizationAccess).where(eq(userOrganizationAccess.userId, userId));
  if (data.halaman.length) await tx.insert(userPageAccess).values(data.halaman.map((halaman) => ({ userId, halaman })));
  const idArea = master.ar.filter((x) => data.area.includes(x.nama)).map((x) => x.id);
  const idOrg = master.org.filter((x) => data.organisasi.includes(x.nama)).map((x) => x.id);
  if (idArea.length) await tx.insert(userAreaAccess).values(idArea.map((areaId) => ({ userId, areaId })));
  if (idOrg.length) await tx.insert(userOrganizationAccess).values(idOrg.map((organisasiId) => ({ userId, organisasiId })));
}

/**
 * Port _dbUpsertManagedSales: user role sales disinkronkan ke master SALES
 * (nama, email, organisasi). Dicari lewat nama lama → email → nama baru.
 */
async function sinkronSales(tx: Tx, data: { namaLengkap: string; email: string; organisasi: string[] },
  namaLama: string | null, master: Awaited<ReturnType<typeof namaMaster>>) {
  const cari = async (kolom: 'nama' | 'email', nilai: string | null) => {
    if (!nilai) return null;
    const [r] = await tx.select({ id: sales.id }).from(sales).where(eq(kolom === 'nama' ? sales.nama : sales.email, nilai)).limit(1);
    return r ?? null;
  };
  const lama = await cari('nama', namaLama);
  const sesuaiNama = await cari('nama', data.namaLengkap);
  const kini = lama ?? (await cari('email', data.email)) ?? sesuaiNama;
  if (kini && sesuaiNama && kini.id !== sesuaiNama.id) throw new Error('Nama Sales sudah digunakan oleh data SALES lain.');

  const salesId = kini?.id ?? randomUUID();
  if (kini) await tx.update(sales).set({ nama: data.namaLengkap, email: data.email }).where(eq(sales.id, salesId));
  else await tx.insert(sales).values({ id: salesId, nama: data.namaLengkap, email: data.email });

  await tx.delete(salesOrganisasi).where(eq(salesOrganisasi.salesId, salesId));
  const idOrg = master.org.filter((x) => data.organisasi.includes(x.nama)).map((x) => x.id);
  if (idOrg.length) await tx.insert(salesOrganisasi).values(idOrg.map((organisasiId) => ({ salesId, organisasiId })));
}

async function cekUnik(username: string, email: string, kecualiId?: string) {
  const bentrok = or(eq(users.username, username), eq(users.email, email));
  const [ada] = await db.select({ username: users.username, email: users.email }).from(users)
    .where(kecualiId ? and(bentrok, ne(users.id, kecualiId)) : bentrok).limit(1);
  if (ada?.username === username) throw new Error('Nama lengkap sudah digunakan oleh user lain.');
  if (ada) throw new Error('Email sudah digunakan.');
}

export async function buatUser(aktor: SessionUser, raw: unknown) {
  const master = await namaMaster();
  const d = rapikanUser(raw, { baru: true, validArea: master.ar.map((x) => x.nama), validOrg: master.org.map((x) => x.nama) });
  // Username = nama lengkap (lowercase), sama seperti Sales Hub lama.
  const username = d.namaLengkap.toLowerCase();
  await cekUnik(username, d.email);

  const id = randomUUID();
  const jobId = await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id, username, namaLengkap: d.namaLengkap, email: d.email, role: d.role,
      // Password awal dari Admin → user wajib menggantinya saat login pertama.
      passwordHash: await hashPassword(d.password), wajibGantiPassword: true, isActive: d.isActive, aksesKustom: true,
    });
    await simpanAkses(tx, id, d, master);
    if (d.role === 'sales') await sinkronSales(tx, d, null, master);
    await tx.insert(auditLog).values({
      userId: aktor.id, aksi: 'buat_user', entitas: 'users', entitasId: id,
      detail: { role: d.role, email: d.email, isActive: d.isActive },
    });
    return antreJob(tx, { jenis: 'email_akun_baru', kunci: `email_akun_baru:${id}`, payload: { userId: id, rahasia: segel(d.password) } });
  });

  if (d.role === 'sales') lupakanMaster();
  lupakanUser();
  prosesSetelahRespons([jobId]);
  return { id, email: d.email };
}

export async function ubahUser(aktor: SessionUser, id: string, raw: unknown) {
  const [lama] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!lama) throw new Error('User yang akan diperbarui tidak ditemukan.');
  const master = await namaMaster();
  const d = rapikanUser(raw, { baru: false, validArea: master.ar.map((x) => x.nama), validOrg: master.org.map((x) => x.nama) });
  if (id === aktor.id && (!d.isActive || d.role !== lama.role)) {
    throw new Error('Anda tidak bisa menonaktifkan atau mengubah role akun Anda sendiri.');
  }
  const username = d.namaLengkap.toLowerCase();
  await cekUnik(username, d.email, id);

  await db.transaction(async (tx) => {
    await tx.update(users).set({
      username, namaLengkap: d.namaLengkap, email: d.email, role: d.role, isActive: d.isActive, aksesKustom: true,
      // Reset password oleh Admin → user wajib mengganti lagi saat login berikutnya.
      ...(d.password ? { passwordHash: await hashPassword(d.password), wajibGantiPassword: true } : {}),
    }).where(eq(users.id, id));
    await simpanAkses(tx, id, d, master);
    if (d.role === 'sales') await sinkronSales(tx, d, lama.namaLengkap, master);
    await tx.insert(auditLog).values({
      userId: aktor.id, aksi: 'ubah_user', entitas: 'users', entitasId: id,
      detail: { role: d.role, isActive: d.isActive, resetPassword: !!d.password },
    });
  });
  if (d.role === 'sales') lupakanMaster();
  lupakanUser();
}

export async function setAktif(aktor: SessionUser, id: string, aktif: boolean) {
  if (id === aktor.id && !aktif) throw new Error('Anda tidak bisa menonaktifkan akun Anda sendiri.');
  await db.transaction(async (tx) => {
    await tx.update(users).set({ isActive: aktif }).where(eq(users.id, id));
    await tx.insert(auditLog).values({ userId: aktor.id, aksi: aktif ? 'aktifkan_user' : 'nonaktifkan_user', entitas: 'users', entitasId: id });
  });
  lupakanUser();
}

/** Pilihan master untuk form (nama saja). */
export async function pilihanAkses() {
  const m = await namaMaster();
  return { area: m.ar.map((x) => x.nama).sort(), organisasi: m.org.map((x) => x.nama).sort() };
}

