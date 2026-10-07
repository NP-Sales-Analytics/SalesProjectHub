import { randomUUID } from 'node:crypto';
import { and, asc, count, desc, eq, gte, inArray, like, lte, or, type SQL } from 'drizzle-orm';
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core';
import { bolehLihatPenawaran } from '@/lib/access';
import type { SessionUser } from '@/lib/auth';
import { filterPenawaran } from '@/lib/cakupan';
import { db } from '@/lib/db';
import {
  auditLog, counterLog, nomorUrut, penawaran, penawaranItem, statusPenawaran, type JenisNomor, type StatusPenawaran,
} from '@/lib/db/schema';
import { antreJob, prosesSetelahRespons } from '@/lib/jobs';
import { masterAkses } from '@/lib/master';
import {
  alasanNonStandar, CATATAN_REVISI, formatNomorPenawaran, hargaMaster, hasilEditPenawaran, sekarangWib,
  singkatanArea, STATUS_DARI_AKSI, type ModeDokumen,
} from '@/lib/penawaran/aturan';
import { cariNama, masterPenawaran } from '@/lib/penawaran/master';
import {
  editLangsungSchema, keputusanSchema, penawaranSchema, type PenawaranData,
} from '@/lib/validations/penawaran';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class GalatPenawaran extends Error {}

// ─── Penomoran ───────────────────────────────────────────────────────────

/**
 * Terbitkan nomor berikutnya secara atomik: baris nomor_urut di-lock (FOR UPDATE)
 * sampai transaksi selesai, sehingga submit bersamaan tidak pernah dapat nomor kembar.
 */
export async function terbitkanNomor(tx: Tx, jenis: JenisNomor, format: (n: number) => string) {
  const [baris] = await tx.select({ nilai: nomorUrut.nilai }).from(nomorUrut).where(eq(nomorUrut.jenis, jenis)).for('update');
  if (!baris) throw new Error(`Baris nomor_urut "${jenis}" belum ada (jalankan migrasi).`);
  const n = baris.nilai + 1;
  await tx.update(nomorUrut).set({ nilai: n }).where(eq(nomorUrut.jenis, jenis));
  const id = format(n);
  await tx.insert(counterLog).values({ jenis, nomor: n, idDokumen: id });
  return id;
}

// ─── Validasi terhadap master & cakupan ──────────────────────────────────

/** Normalkan nama organisasi/area/KAM/sales ke master; tolak yang tidak ada / di luar cakupan. */
async function sahkanProfil(user: SessionUser, d: Pick<PenawaranData, 'organisasi' | 'namaSales' | 'area' | 'kam'>) {
  const [m, ma] = await Promise.all([masterPenawaran(), masterAkses()]);
  const org = cariNama(m.organisasi, d.organisasi);
  if (!org) throw new GalatPenawaran('Organisasi tidak valid. Silakan pilih ulang Organisasi.');
  const ar = cariNama(m.area, d.area);
  if (!ar) throw new GalatPenawaran('Area tidak valid.');
  const k = cariNama(m.kam, d.kam);
  if (!k) throw new GalatPenawaran('Key Account Manager (KAM) tidak valid.');
  const sales = ma.salesOrganisasi.find((s) =>
    s.organisasi.toLowerCase() === org.nama.toLowerCase() && s.namaSales.trim().toLowerCase() === d.namaSales.trim().toLowerCase());
  if (!sales) throw new GalatPenawaran('Nama Sales tidak terdaftar pada organisasi tersebut.');
  // Sales hanya boleh mengajukan atas namanya sendiri (dulu tidak dicek di server).
  if (user.role === 'sales' && !user.akses.penugasan.some((p) =>
    p.organisasi.toLowerCase() === org.nama.toLowerCase() && p.namaSales.toLowerCase() === sales.namaSales.toLowerCase())) {
    throw new GalatPenawaran('Anda hanya dapat mengajukan penawaran atas nama Anda sendiri.');
  }
  return { org, area: ar, kam: k, namaSales: sales.namaSales, master: m };
}

function nilaiHeader(d: PenawaranData, p: Awaited<ReturnType<typeof sahkanProfil>>) {
  return {
    organisasi: p.org.nama, kam: p.kam.nama, namaSales: p.namaSales, area: p.area.nama, franco: d.franco,
    perusahaan: d.perusahaan, pic: d.pic, telepon: d.telepon || null, email: d.email || null,
    namaProyek: d.namaProyek, alamat: d.alamat,
  };
}

const barisItem = (penawaranId: string, items: (PenawaranData['produk'][number] & { harga: number })[]) =>
  items.map((it, i) => ({
    penawaranId, noItem: i + 1, jenisProduk: it.jenisProduk, tier: it.tier, namaProduk: it.namaProduk,
    jenisRm: it.jenisRm || null, warna: it.warna || null, kemasan: it.kemasan, kodeWarna: it.kodeWarna || null,
    catatanAdmin: it.catatanAdmin || null, hargaSatuan: it.harga, hargaEdit: it.harga,
  }));

async function antreDokumen(tx: Tx, penawaranId: string, mode: ModeDokumen, extra: Record<string, unknown> = {}) {
  return antreJob(tx, { jenis: 'buat_dokumen', kunci: `buat_dokumen:${penawaranId}:${randomUUID()}`, payload: { penawaranId, mode, ...extra } });
}

// ─── Submit (submitPenawaran) ────────────────────────────────────────────

export async function submitPenawaran(user: SessionUser, raw: unknown) {
  const d = penawaranSchema.parse(raw);
  const profil = await sahkanProfil(user, d);
  // Harga dihitung ulang dari master (dulu dipercaya dari browser).
  const items = d.produk.map((it) => ({ ...it, harga: hargaMaster(it, profil.master.produk) }));
  const alasan = alasanNonStandar(items, profil.master.produk);
  const status: StatusPenawaran = alasan ? 'Pending Admin' : 'Pending Approve';

  const id = randomUUID();
  const hasil = await db.transaction(async (tx) => {
    const nomor = await terbitkanNomor(tx, 'penawaran', (n) => formatNomorPenawaran(n, singkatanArea(profil.area.nama, profil.area.singkatan)));
    await tx.insert(penawaran).values({
      id, nomor, tanggal: sekarangWib().iso, status, ...nilaiHeader(d, profil),
      dibuatOlehUserId: user.id, dibuatOlehEmail: user.email,
    });
    await tx.insert(penawaranItem).values(barisItem(id, items));
    await tx.insert(auditLog).values({ userId: user.id, aksi: 'submit_penawaran', entitas: 'penawaran', entitasId: nomor, detail: { status, alasan } });
    // Hanya penawaran standar yang langsung dibuatkan dokumen + email permintaan approval.
    const jobId = status === 'Pending Approve' ? await antreDokumen(tx, id, 'request_approval') : null;
    return { nomor, jobId };
  });
  prosesSetelahRespons([hasil.jobId]);
  return { id, nomor: hasil.nomor, status, alasanNonStandar: alasan };
}

// ─── Ambil & cek cakupan ─────────────────────────────────────────────────

async function ambilDalamCakupan(user: SessionUser, id: string) {
  const [p] = await db.select().from(penawaran).where(eq(penawaran.id, id)).limit(1);
  if (!p || !bolehLihatPenawaran(user.akses, p)) throw new GalatPenawaran('Penawaran tidak ditemukan atau di luar akses Anda.');
  return p;
}

// ─── Edit Penawaran oleh Admin (updatePenawaran) ─────────────────────────

export async function ubahPenawaran(user: SessionUser, id: string, raw: unknown) {
  const lama = await ambilDalamCakupan(user, id);
  const d = penawaranSchema.parse(raw);
  const profil = await sahkanProfil(user, d);
  const { status, mode } = hasilEditPenawaran(lama.status);
  const revisi = mode === 'confirm_approved';

  const jobId = await db.transaction(async (tx) => {
    await tx.update(penawaran).set({
      ...nilaiHeader(d, profil), status, tanggal: sekarangWib().iso,
      // Sistem lama menulis ulang semua baris: catatan/approver hilang, kecuali revisi yang dipulihkan.
      catatanApproval: revisi ? CATATAN_REVISI : null,
      approver: revisi ? (lama.approver || 'Admin') : null,
      approvedAt: revisi ? new Date() : null,
    }).where(eq(penawaran.id, id));
    await tx.delete(penawaranItem).where(eq(penawaranItem.penawaranId, id));
    await tx.insert(penawaranItem).values(barisItem(id, d.produk));
    await tx.insert(auditLog).values({ userId: user.id, aksi: 'ubah_penawaran', entitas: 'penawaran', entitasId: lama.nomor, detail: { dari: lama.status, ke: status, mode } });
    return antreDokumen(tx, id, mode, revisi ? { aksi: 'approve', alasan: CATATAN_REVISI, approver: lama.approver || 'Admin' } : {});
  });
  prosesSetelahRespons([jobId]);
  return { status };
}

// ─── Edit langsung Admin (adminEditPenawaran) ────────────────────────────

export async function editLangsungPenawaran(user: SessionUser, id: string, raw: unknown) {
  const lama = await ambilDalamCakupan(user, id);
  const d = editLangsungSchema.parse(raw);
  const itemsLama = await db.select().from(penawaranItem).where(eq(penawaranItem.penawaranId, id)).orderBy(asc(penawaranItem.noItem));
  if (d.produk.length !== itemsLama.length) throw new GalatPenawaran('Jumlah produk berubah. Muat ulang data lalu coba lagi.');

  const jobId = await db.transaction(async (tx) => {
    // Status, tanggal, catatan approval, approver, dan pembuat sengaja tidak disentuh.
    await tx.update(penawaran).set({
      perusahaan: d.perusahaan, pic: d.pic, telepon: d.telepon || null, email: d.email || null, alamat: d.alamat,
      namaProyek: d.namaProyek, franco: d.franco, kam: d.kam, namaSales: d.namaSales, area: d.area,
    }).where(eq(penawaran.id, id));
    for (const [i, it] of d.produk.entries()) {
      await tx.update(penawaranItem).set({
        jenisProduk: it.jenisProduk, namaProduk: it.namaProduk, tier: it.tier, jenisRm: it.jenisRm, warna: it.warna,
        kemasan: it.kemasan, kodeWarna: it.kodeWarna, catatanAdmin: it.catatanAdmin, hargaSatuan: it.harga, hargaEdit: it.harga,
      }).where(and(eq(penawaranItem.penawaranId, id), eq(penawaranItem.noItem, itemsLama[i].noItem)));
    }
    await tx.insert(auditLog).values({ userId: user.id, aksi: 'edit_langsung_penawaran', entitas: 'penawaran', entitasId: lama.nomor });
    // PDF diperbarui tanpa email; Pending Admin belum punya PDF.
    return lama.status === 'Pending Admin' ? null : antreDokumen(tx, id, 'no_email');
  });
  prosesSetelahRespons([jobId]);
  return { pdfDiperbarui: !!jobId };
}

// ─── Approval (processApproval) ──────────────────────────────────────────

export async function putuskanPenawaran(user: SessionUser, id: string, raw: unknown) {
  const p = await ambilDalamCakupan(user, id);
  const d = keputusanSchema.parse(raw);
  const statusBaru = STATUS_DARI_AKSI[d.aksi];
  const sekarang = new Date();

  const jobId = await db.transaction(async (tx) => {
    // Gerbang: hanya berlaku bila masih Pending Approve (atomik — dua manager tak bisa sama-sama menang).
    const [r] = await tx.update(penawaran)
      .set({ status: statusBaru, catatanApproval: d.alasan || null, approver: user.namaLengkap, approvedAt: sekarang })
      .where(and(eq(penawaran.id, id), eq(penawaran.status, 'Pending Approve')));
    if (r.affectedRows !== 1) return undefined;
    await tx.insert(auditLog).values({ userId: user.id, aksi: `approval_${d.aksi}`, entitas: 'penawaran', entitasId: p.nomor, detail: { alasan: d.alasan } });
    return antreJob(tx, {
      jenis: 'email_konfirmasi', kunci: `email_konfirmasi:${id}:${sekarang.getTime()}`,
      payload: { penawaranId: id, aksi: d.aksi, alasan: d.alasan, approver: user.namaLengkap },
    });
  });
  if (jobId === undefined) {
    const [kini] = await db.select({ status: penawaran.status }).from(penawaran).where(eq(penawaran.id, id)).limit(1);
    throw new GalatPenawaran(`Dokumen ini sudah diproses (status: ${kini?.status ?? '-'}). Muat ulang halaman untuk melihat status terkini.`);
  }
  prosesSetelahRespons([jobId]);
  return { status: statusBaru };
}

// ─── Baca ────────────────────────────────────────────────────────────────

export type FilterPenawaran = {
  q?: string; status?: string[]; organisasi?: string[]; area?: string[]; kam?: string[]; sales?: string[];
  dari?: string; sampai?: string;
};

function kondisi(user: SessionUser, f: FilterPenawaran, denganStatus = true): SQL | undefined {
  const syarat: (SQL | undefined)[] = [filterPenawaran(user.akses)];
  const daftar = (v?: string[]) => (v ?? []).map((x) => x.trim()).filter(Boolean);
  const st = daftar(f.status).filter((s) => (statusPenawaran as readonly string[]).includes(s)) as StatusPenawaran[];
  if (denganStatus && st.length) syarat.push(inArray(penawaran.status, st));
  if (daftar(f.organisasi).length) syarat.push(inArray(penawaran.organisasi, daftar(f.organisasi)));
  if (daftar(f.area).length) syarat.push(inArray(penawaran.area, daftar(f.area)));
  if (daftar(f.kam).length) syarat.push(inArray(penawaran.kam, daftar(f.kam)));
  if (daftar(f.sales).length) syarat.push(inArray(penawaran.namaSales, daftar(f.sales)));
  if (f.dari && /^\d{4}-\d{2}-\d{2}$/.test(f.dari)) syarat.push(gte(penawaran.tanggal, f.dari));
  if (f.sampai && /^\d{4}-\d{2}-\d{2}$/.test(f.sampai)) syarat.push(lte(penawaran.tanggal, f.sampai));
  const q = f.q?.trim();
  if (q) {
    const pola = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
    syarat.push(or(like(penawaran.nomor, pola), like(penawaran.perusahaan, pola), like(penawaran.pic, pola),
      like(penawaran.namaProyek, pola), like(penawaran.namaSales, pola), like(penawaran.organisasi, pola)));
  }
  return and(...syarat.filter((s): s is SQL => !!s));
}

const URUTAN = {
  tanggal: [penawaran.tanggal, penawaran.createdAt],
  nomor: [penawaran.createdAt],
  perusahaan: [penawaran.perusahaan],
  proyek: [penawaran.namaProyek],
  sales: [penawaran.namaSales],
  status: [penawaran.status],
} as const;
export type KolomUrut = keyof typeof URUTAN;

const kolomDaftar = {
  id: penawaran.id, nomor: penawaran.nomor, tanggal: penawaran.tanggal, status: penawaran.status,
  organisasi: penawaran.organisasi, kam: penawaran.kam, namaSales: penawaran.namaSales, area: penawaran.area,
  perusahaan: penawaran.perusahaan, pic: penawaran.pic, namaProyek: penawaran.namaProyek,
  catatanApproval: penawaran.catatanApproval, approver: penawaran.approver, pdfUrl: penawaran.pdfUrl,
};
export type BarisDaftarPenawaran = { [K in keyof typeof kolomDaftar]: (typeof kolomDaftar)[K]['_']['data'] | null };

/** Daftar ber-halaman (server-side) + jumlah per status untuk kartu KPI. */
export async function daftarPenawaran(user: SessionUser, f: FilterPenawaran, opsi: { halaman: number; ukuran: number; urut?: KolomUrut; arah?: 'asc' | 'desc' }) {
  const where = kondisi(user, f);
  const ukuran = Math.min(Math.max(1, opsi.ukuran), 100);
  const arah = opsi.arah === 'asc' ? asc : desc;
  const urut = (URUTAN[opsi.urut ?? 'tanggal'] ?? URUTAN.tanggal).map((k) => arah(k));

  const [[{ total }], perStatus] = await Promise.all([
    db.select({ total: count() }).from(penawaran).where(where),
    db.select({ status: penawaran.status, jumlah: count() }).from(penawaran).where(kondisi(user, f, false)).groupBy(penawaran.status),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const halaman = Math.min(Math.max(1, opsi.halaman), totalHalaman);
  const rows = await db.select(kolomDaftar).from(penawaran).where(where).orderBy(...urut)
    .limit(ukuran).offset((halaman - 1) * ukuran);
  return {
    rows: rows as BarisDaftarPenawaran[], total, halaman, totalHalaman,
    kpi: Object.fromEntries(perStatus.map((s) => [s.status, s.jumlah])) as Partial<Record<StatusPenawaran, number>>,
  };
}

export async function detailPenawaran(user: SessionUser, id: string) {
  const p = await ambilDalamCakupan(user, id);
  const produk = await db.select().from(penawaranItem).where(eq(penawaranItem.penawaranId, id)).orderBy(asc(penawaranItem.noItem));
  return { ...p, produk };
}

/** Pilihan filter (nilai distinct dalam cakupan user). */
export async function opsiFilter(user: SessionUser) {
  const where = filterPenawaran(user.akses);
  const distinct = async (kol: AnyMySqlColumn) => (await db.selectDistinct({ v: kol }).from(penawaran).where(where).orderBy(asc(kol)))
    .map((r) => r.v as string | null).filter((v): v is string => !!v);
  const [organisasi, area, kam, sales] = await Promise.all([
    distinct(penawaran.organisasi), distinct(penawaran.area), distinct(penawaran.kam), distinct(penawaran.namaSales),
  ]);
  return { organisasi, area, kam, sales, status: [...statusPenawaran] };
}

/** Dokumen yang menunggu harga / revisi Admin (daftar "Edit Penawaran" lama). */
export async function perluTindakanAdmin(user: SessionUser) {
  return db.select(kolomDaftar).from(penawaran)
    .where(and(filterPenawaran(user.akses), inArray(penawaran.status, ['Pending Admin', 'Approved (Revisi)'])))
    .orderBy(desc(penawaran.createdAt)).limit(50);
}

// ─── Dashboard ───────────────────────────────────────────────────────────

const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export async function ringkasanDashboard(user: SessionUser, f: FilterPenawaran) {
  const where = kondisi(user, f);
  const w = sekarangWib();
  const awalTahun = `${w.tahun}-01-01`;
  const [perStatus, perHari, terbaru] = await Promise.all([
    db.select({ status: penawaran.status, jumlah: count() }).from(penawaran).where(where).groupBy(penawaran.status),
    db.select({ tanggal: penawaran.tanggal, jumlah: count() }).from(penawaran)
      .where(and(where, gte(penawaran.tanggal, awalTahun))).groupBy(penawaran.tanggal),
    db.select(kolomDaftar).from(penawaran).where(where).orderBy(desc(penawaran.createdAt)).limit(8),
  ]);
  const harian = new Map(perHari.map((r) => [String(r.tanggal).slice(0, 10), r.jumlah]));
  const tgl = (d: Date) => d.toISOString().slice(0, 10);
  const hariIni = new Date(`${w.iso}T00:00:00Z`);

  const minggu = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hariIni); d.setUTCDate(d.getUTCDate() - (6 - i));
    return { label: `${d.getUTCDate()} ${BULAN_ID[d.getUTCMonth()]}`, jumlah: harian.get(tgl(d)) ?? 0 };
  });
  const jumlahHari = new Date(Date.UTC(w.tahun, w.bulan, 0)).getUTCDate();
  const bulan = Array.from({ length: jumlahHari }, (_, i) => {
    const iso = `${w.tahun}-${String(w.bulan).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    return { label: String(i + 1), jumlah: harian.get(iso) ?? 0 };
  });
  const tahun = BULAN_ID.map((label, i) => ({
    label,
    jumlah: [...harian].filter(([k]) => Number(k.slice(5, 7)) === i + 1).reduce((a, [, v]) => a + v, 0),
  }));

  return {
    kpi: Object.fromEntries(perStatus.map((s) => [s.status, s.jumlah])) as Partial<Record<StatusPenawaran, number>>,
    tren: { minggu, bulan, tahun, bulanLabel: `${BULAN_ID[w.bulan - 1]} ${w.tahun}`, tahunLabel: String(w.tahun) },
    terbaru: terbaru as BarisDaftarPenawaran[],
  };
}

