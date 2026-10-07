import type { Role } from '@/lib/db/schema';

/**
 * Katalog halaman yang bisa diberikan per user di User Management.
 * `id` = id halaman Sales Hub lama (untuk migrasi setelan UM_USER_V1_*).
 * Urutan di sini = urutan tampil di sidebar & form.
 */
export const HALAMAN = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard', grup: 'Penawaran' },
  { id: 'form-penawaran', href: '/penawaran/baru', label: 'Buat Penawaran', grup: 'Penawaran' },
  { id: 'arsip-penawaran', href: '/penawaran', label: 'Dokumen Penawaran', grup: 'Penawaran' },
  { id: 'approval-center', href: '/penawaran/approval', label: 'Approval Center', grup: 'Penawaran' },
  { id: 'project-estimator', href: '/estimator/baru', label: 'Buat Estimasi', grup: 'Estimator Cost' },
  { id: 'dokumen-estimator', href: '/estimator', label: 'Dokumen Estimator', grup: 'Estimator Cost' },
  { id: 'approval-center-estimator', href: '/estimator/approval', label: 'Approval Estimator', grup: 'Estimator Cost' },
] as const;

/** Halaman Setting tidak bisa diberikan per user: ditentukan role (sama dengan sistem lama). */
export const HALAMAN_SETTING = [
  { href: '/admin/users', label: 'User Management', roles: ['super admin'] as Role[] },
  { href: '/admin/area', label: 'Area Management', roles: ['super admin', 'admin'] as Role[] },
] as const;

export const SEMUA_HREF: string[] = HALAMAN.map((h) => h.href);
const APPROVAL = ['/penawaran/approval', '/estimator/approval'];

/** Role yang bisa dipilih di form User Management (manager admin hanya legacy). */
export const ROLE_FORM: Role[] = ['super admin', 'admin', 'manager', 'sales'];

/** Halaman default bila user tidak punya setelan tersimpan (_defaultPageAccessForRole lama). */
export function halamanDefault(role: Role): string[] {
  if (role === 'super admin' || role === 'admin' || role === 'manager') return [...SEMUA_HREF];
  return SEMUA_HREF.filter((h) => !APPROVAL.includes(h));
}

/** Halaman yang benar-benar boleh dibuka user (katalog + Setting sesuai role). */
export function halamanEfektif(user: { role: Role; aksesKustom: boolean; halaman: string[] }): string[] {
  const dasar = user.role === 'super admin' || !user.aksesKustom
    ? halamanDefault(user.role)
    : SEMUA_HREF.filter((h) => user.halaman.includes(h));
  const setting = HALAMAN_SETTING.filter((s) => s.roles.includes(user.role)).map((s) => s.href);
  return [...dasar, ...setting];
}

// ─── Cakupan data ────────────────────────────────────────────────────────

/** Data master minimum untuk menghitung cakupan default (disediakan lib/auth). */
export type MasterAkses = {
  area: { nama: string; emailApproval: string | null; emailApprovalSpec: string | null; emailApprovalSafl: string | null }[];
  organisasi: { nama: string; managerEmail: string | null }[];
  /** Satu entri per pasangan (sales, organisasi). */
  salesOrganisasi: { namaSales: string; email: string | null; organisasi: string; area: string | null }[];
};

export type Akses = {
  role: Role;
  email: string;
  semua: boolean; // super admin
  area: string[];
  organisasi: string[];
  /** Pasangan (organisasi, nama sales) milik user role sales. */
  penugasan: { organisasi: string; namaSales: string }[];
};

const kunci = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
const daftarEmail = (v: string | null | undefined) =>
  String(v ?? '').split(/[,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);

/**
 * Cakupan area & organisasi user — port _getUserSetting / _defaultAreaAccessForUser /
 * _defaultOrganizationAccessForUser. `tersimpan` = isi tabel user_*_access bila aksesKustom.
 */
export function hitungAkses(
  user: { role: Role; email: string; aksesKustom: boolean },
  tersimpan: { area: string[]; organisasi: string[] },
  master: MasterAkses,
): Akses {
  const email = kunci(user.email);
  const semuaArea = master.area.map((a) => a.nama);
  const semuaOrg = master.organisasi.map((o) => o.nama);
  const sah = (pilihan: string[], valid: string[]) => {
    const peta = new Map(valid.map((v) => [kunci(v), v]));
    return [...new Set(pilihan.map((p) => peta.get(kunci(p))).filter((v): v is string => !!v))];
  };

  let area: string[];
  let organisasi: string[];
  if (user.role === 'super admin') {
    area = semuaArea;
    organisasi = semuaOrg;
  } else if (user.aksesKustom) {
    area = user.role === 'sales' ? [] : sah(tersimpan.area, semuaArea);
    organisasi = sah(tersimpan.organisasi, semuaOrg);
  } else if (user.role === 'admin' || user.role === 'manager admin') {
    area = semuaArea;
    organisasi = semuaOrg;
  } else if (user.role === 'manager') {
    area = master.area
      .filter((a) => [a.emailApproval, a.emailApprovalSpec, a.emailApprovalSafl].some((v) => daftarEmail(v).includes(email)))
      .map((a) => a.nama);
    organisasi = master.organisasi.filter((o) => daftarEmail(o.managerEmail).includes(email)).map((o) => o.nama);
  } else {
    area = [];
    organisasi = sah(master.salesOrganisasi.filter((s) => kunci(s.email) === email).map((s) => s.organisasi), semuaOrg);
  }

  const orgSet = new Set(organisasi.map(kunci));
  const penugasan = user.role === 'sales'
    ? master.salesOrganisasi
      .filter((s) => kunci(s.email) === email && orgSet.has(kunci(s.organisasi)))
      .map((s) => ({ organisasi: s.organisasi, namaSales: s.namaSales }))
    : [];

  return { role: user.role, email, semua: user.role === 'super admin', area, organisasi, penugasan };
}

/** Apakah satu penawaran terlihat oleh user (_filterPenawaranByUser lama). */
export function bolehLihatPenawaran(akses: Akses, p: { area: string | null; organisasi: string | null; namaSales: string | null }) {
  if (akses.semua) return true;
  if (akses.role === 'sales') {
    return akses.penugasan.some((x) => kunci(x.organisasi) === kunci(p.organisasi) && kunci(x.namaSales) === kunci(p.namaSales));
  }
  if (akses.role === 'admin' || akses.role === 'manager' || akses.role === 'manager admin') {
    return akses.area.some((a) => kunci(a) === kunci(p.area)) && akses.organisasi.some((o) => kunci(o) === kunci(p.organisasi));
  }
  return false;
}

/**
 * Pasangan (organisasi, nama sales) yang estimasinya terlihat oleh admin/manager
 * (_filterEstimatorByUser lama): organisasi diizinkan dan area sales kosong atau diizinkan.
 */
export function pasanganEstimatorTerlihat(akses: Akses, master: MasterAkses) {
  const area = new Set(akses.area.map(kunci));
  const org = new Set(akses.organisasi.map(kunci));
  return master.salesOrganisasi
    .filter((s) => org.has(kunci(s.organisasi)) && (!kunci(s.area) || area.has(kunci(s.area))))
    .map((s) => ({ organisasi: s.organisasi, namaSales: s.namaSales }));
}

/** Apakah satu estimasi terlihat oleh user (_filterEstimatorByUser lama). */
export function bolehLihatEstimator(
  akses: Akses,
  master: MasterAkses,
  e: { organisasi: string | null; namaSales: string | null; dibuatOlehEmail: string | null },
) {
  if (akses.semua) return true;
  if (!akses.organisasi.some((o) => kunci(o) === kunci(e.organisasi))) return false;
  const cocokPasangan = (daftar: { organisasi: string; namaSales: string }[]) =>
    daftar.some((x) => kunci(x.organisasi) === kunci(e.organisasi) && kunci(x.namaSales) === kunci(e.namaSales));
  if (akses.role === 'sales') return kunci(e.dibuatOlehEmail) === akses.email || cocokPasangan(akses.penugasan);
  if (akses.role === 'admin' || akses.role === 'manager' || akses.role === 'manager admin') {
    return cocokPasangan(pasanganEstimatorTerlihat(akses, master));
  }
  return false;
}

/** Role sales tidak boleh menerima kolom biaya/margin estimator. */
export const sembunyikanBiaya = (role: Role) => role === 'sales';
