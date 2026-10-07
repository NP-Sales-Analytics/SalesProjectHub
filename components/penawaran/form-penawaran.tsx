'use client';

import { AlertTriangle, ArrowLeft, Check, PackagePlus, Plus, Send, Trash2, Wand2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { aksiSubmitPenawaran, aksiUbahPenawaran } from '@/app/(app)/penawaran/actions';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { PilihBanyak, PilihSatu } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah, hargaMaster, type ProdukMaster } from '@/lib/penawaran/aturan';
import { cn } from '@/lib/utils';

export type AwalItem = {
  jenisProduk: string; tier: string; namaProduk: string; jenisRm: string; warna: string; kemasan: string;
  kodeWarna: string; catatanAdmin: string; harga: number;
};
export type AwalForm = {
  id: string; nomor: string; status: string; catatanApproval: string | null;
  organisasi: string; namaSales: string; area: string; kam: string; franco: string;
  perusahaan: string; pic: string; telepon: string; email: string; namaProyek: string; alamat: string;
  produk: AwalItem[];
};
type Master = {
  organisasi: string[];
  penugasan: { organisasi: string; namaSales: string }[];
  area: string[];
  kam: string[];
  produk: ProdukMaster[];
};
type PerluTindakan = { id: string; nomor: string; status: string; tanggal: string; perusahaan: string | null; namaProyek: string | null; catatanApproval: string | null };

const BARU = '__baru__'; // pilihan "tambah baru" di dropdown → isian teks bebas
const JENIS = ['Interior', 'Exterior'];
const TIER = ['FP-1', 'FP-2', 'FP-3', 'FP-4', 'Others'];

type Item = AwalItem & { kunci: string; jenisBaru: boolean; produkBaru: boolean; kemasanBaru: boolean };

const kosong = (global?: { jenis: string; tier: string }): Item => ({
  kunci: crypto.randomUUID(), jenisProduk: global?.jenis ?? '', tier: global?.tier ?? '', namaProduk: '', jenisRm: '', warna: '',
  kemasan: '', kodeWarna: '', catatanAdmin: '', harga: 0, jenisBaru: false, produkBaru: false, kemasanBaru: false,
});
const unik = (xs: string[]) => [...new Set(xs.filter(Boolean))];

/** Satu dropdown master dengan pilihan "tambah baru" yang membuka isian teks. */
function PilihAtauKetik({ label, items, value, baru, onPilih, onKetik, onBatal, placeholder, labelBaru, disabled }: {
  label: string; items: string[]; value: string; baru: boolean; disabled?: boolean;
  onPilih: (v: string) => void; onKetik: (v: string) => void; onBatal: () => void; placeholder: string; labelBaru?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {baru ? (
        <div className="relative">
          <Input value={value} onChange={(e) => onKetik(e.target.value)} placeholder={`Ketik ${label.toLowerCase()} baru...`}
            className="h-11 border-amber-300 bg-amber-50/60 pr-10" autoFocus />
          <button type="button" onClick={onBatal} aria-label="Batal, kembali ke pilihan"
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>
      ) : disabled ? (
        <div className="flex h-11 items-center rounded-xl border border-border bg-secondary/60 px-3.5 text-sm text-muted-foreground">{placeholder}</div>
      ) : (
        <PilihSatu items={labelBaru ? [BARU, ...items] : items} value={value} placeholder={placeholder}
          format={(v) => (v === BARU ? `+ ${labelBaru}` : v)}
          onChange={(v) => (v === BARU ? onPilih(BARU) : onPilih(v))} />
      )}
    </div>
  );
}

export function FormPenawaran({ master, awal, galatEdit, perluTindakan }: {
  master: Master; awal: AwalForm | null; galatEdit: string | null; perluTindakan: PerluTindakan[] | null;
}) {
  const router = useRouter();
  const edit = !!awal;
  const [pending, start] = useTransition();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [gantiProduk, setGantiProduk] = useState<string[] | null>(null);
  const [cobaKirim, setCobaKirim] = useState(false);

  // Sales dengan satu organisasi / satu nama langsung terisi (perilaku _autoFillSalesProfile).
  const orgAwal = awal?.organisasi ?? (master.organisasi.length === 1 ? master.organisasi[0] : '');
  const salesUntuk = (org: string) => unik(master.penugasan.filter((p) => p.organisasi === org).map((p) => p.namaSales)).sort();
  const [h, setH] = useState({
    organisasi: orgAwal,
    namaSales: awal?.namaSales ?? (salesUntuk(orgAwal).length === 1 ? salesUntuk(orgAwal)[0] : ''),
    area: awal?.area ?? '', kam: awal?.kam ?? '', franco: awal?.franco ?? '', perusahaan: awal?.perusahaan ?? '',
    pic: awal?.pic ?? '', telepon: awal?.telepon ?? '', email: awal?.email ?? '', namaProyek: awal?.namaProyek ?? '', alamat: awal?.alamat ?? '',
  });
  const [global, setGlobal] = useState({ jenis: '', tier: '' });
  const [pilihanProduk, setPilihanProduk] = useState<string[]>([]);
  const namaProdukMaster = useMemo(() => unik(master.produk.map((p) => p.nama)), [master.produk]);

  const [items, setItems] = useState<Item[]>(() => awal?.produk.length
    ? awal.produk.map((it) => ({
      ...it, kunci: crypto.randomUUID(),
      jenisBaru: !!it.jenisProduk && !JENIS.includes(it.jenisProduk),
      produkBaru: !!it.namaProduk && !namaProdukMaster.includes(it.namaProduk),
      kemasanBaru: !!it.kemasan && !master.produk.some((p) => p.nama === it.namaProduk && p.jenisRm === it.jenisRm && p.warna === it.warna && p.kemasan === it.kemasan),
    }))
    : [kosong()]);

  const ubah = (kunci: string, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.kunci === kunci ? { ...x, ...patch } : x)));
  const opsi = (it: Item) => {
    const p = master.produk.filter((m) => m.nama === it.namaProduk);
    const rm = unik(p.map((m) => m.jenisRm));
    const warna = unik(p.filter((m) => m.jenisRm === it.jenisRm).map((m) => m.warna));
    const kemasan = unik(p.filter((m) => m.jenisRm === it.jenisRm && m.warna === it.warna).map((m) => m.kemasan));
    return { rm, warna, kemasan };
  };
  /** Pilih nilai cascade; bila tingkat berikutnya hanya punya satu opsi, langsung terisi. */
  const pilihCascade = (it: Item, patch: Partial<Item>) => {
    const baru = { ...it, ...patch };
    if (!baru.produkBaru) {
      const o = opsi(baru);
      if (!baru.jenisRm && o.rm.length === 1) baru.jenisRm = o.rm[0];
      const o2 = opsi(baru);
      if (baru.jenisRm && !baru.warna && o2.warna.length === 1) baru.warna = o2.warna[0];
      const o3 = opsi(baru);
      if (baru.warna && !baru.kemasan && !baru.kemasanBaru && o3.kemasan.length === 1) baru.kemasan = o3.kemasan[0];
    }
    ubah(it.kunci, baru);
  };

  const harga = (it: Item) => (edit ? it.harga : hargaMaster(it, master.produk));
  const lengkap = (it: Item) => !!(it.jenisProduk && it.tier && it.namaProduk && it.kemasan);
  const headerLengkap = !!(h.organisasi && h.namaSales && h.area && h.kam && h.franco && h.perusahaan && h.pic && h.namaProyek && h.alamat);

  const terapkanGlobal = (patch: Partial<{ jenis: string; tier: string }>) => {
    const g = { ...global, ...patch };
    setGlobal(g);
    setItems((xs) => xs.map((x) => ({
      ...x,
      ...(patch.jenis !== undefined && patch.jenis ? { jenisProduk: patch.jenis, jenisBaru: false } : {}),
      ...(patch.tier !== undefined && patch.tier ? { tier: patch.tier } : {}),
    })));
  };
  const tambahProdukBanyak = (ganti: boolean, daftar: string[]) => {
    setItems((xs) => {
      const sisa = xs.filter((x) => (ganti ? false : !!x.namaProduk));
      const baru = daftar.map((nama) => {
        const it = { ...kosong(global), namaProduk: nama };
        const o = master.produk.filter((m) => m.nama === nama);
        const rm = unik(o.map((m) => m.jenisRm));
        if (rm.length === 1) it.jenisRm = rm[0];
        return it;
      });
      return [...sisa, ...baru].length ? [...sisa, ...baru] : [kosong(global)];
    });
    setPilihanProduk([]);
    toast.success(`${daftar.length} produk ditambahkan ke penawaran.`);
  };

  const kirim = () => start(async () => {
    const input = {
      ...h,
      produk: items.map((it) => ({
        jenisProduk: it.jenisProduk, tier: it.tier, namaProduk: it.namaProduk, jenisRm: it.jenisRm, warna: it.warna,
        kemasan: it.kemasan, kodeWarna: it.kodeWarna, catatanAdmin: it.catatanAdmin, harga: harga(it),
      })),
    };
    const hasil = edit ? await aksiUbahPenawaran(awal.id, input) : await aksiSubmitPenawaran(input);
    setKonfirmasi(false);
    if (!hasil.ok) { toast.error(hasil.pesan); return; }
    toast.success(hasil.pesan);
    router.push('/penawaran');
  });

  const cobaSubmit = () => {
    setCobaKirim(true);
    if (!headerLengkap) { toast.error('Lengkapi Profil Sales dan Detail Klien yang wajib diisi.'); return; }
    if (items.some((it) => !lengkap(it))) {
      toast.error('Pastikan setiap produk memilih Jenis Produk, FP Tier, Nama Produk, dan Kemasan.');
      document.querySelector('[data-tidak-lengkap="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setKonfirmasi(true);
  };

  const field = (k: keyof typeof h, label: string, opsiField?: { wajib?: boolean; tipe?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={`f-${k}`} className="text-xs font-medium text-muted-foreground">
        {label}{opsiField?.wajib === false && <span className="ml-1 font-normal">(opsional)</span>}
      </Label>
      <Input id={`f-${k}`} type={opsiField?.tipe ?? 'text'} value={h[k]} placeholder={opsiField?.placeholder}
        onChange={(e) => setH({ ...h, [k]: e.target.value })}
        className={cn('h-11', cobaKirim && opsiField?.wajib !== false && !h[k] && 'border-destructive')} />
    </div>
  );
  const pilih = (k: 'organisasi' | 'namaSales' | 'area' | 'kam', label: string, items_: string[], placeholder: string, onChange?: (v: string) => void) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <PilihSatu items={items_} value={h[k]} placeholder={placeholder} onChange={onChange ?? ((v) => setH({ ...h, [k]: v }))}
        className={cn(cobaKirim && !h[k] && 'border-destructive')} />
    </div>
  );

  const kartu = 'rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6';

  return (
    <div className="space-y-5 pb-24">
      {galatEdit && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{galatEdit}</p>}

      {edit && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <div>
            <p className="font-semibold text-amber-900">Edit Penawaran {awal.nomor}</p>
            <p className="text-amber-800">
              Status saat ini <b>{awal.status}</b>. Setelah disimpan:{' '}
              {awal.status === 'Approved (Revisi)' ? 'status menjadi Approved dan email konfirmasi dikirim ke pengaju.'
                : awal.status === 'Pending Approve' ? 'status tetap Pending Approve, PDF diperbarui tanpa email.'
                  : 'status menjadi Pending Approve dan permintaan approval dikirim.'}
            </p>
            {awal.catatanApproval && <p className="mt-1 italic text-amber-700">Catatan approval: {awal.catatanApproval}</p>}
          </div>
          <Button variant="outline" className="h-10 gap-1.5 bg-white" render={<Link href="/penawaran/baru" />}>
            <ArrowLeft className="size-4" /> Batal edit
          </Button>
        </div>
      )}

      {!edit && perluTindakan && perluTindakan.length > 0 && (
        <details className={cn(kartu, 'border-amber-200')}>
          <summary className="cursor-pointer list-none text-sm font-semibold">
            <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{perluTindakan.length}</span>
            Penawaran menunggu harga / revisi Admin — klik untuk memilih
          </summary>
          <ul className="mt-3 divide-y divide-border">
            {perluTindakan.map((p) => (
              <li key={p.id}>
                <Link href={`/penawaran/baru?edit=${p.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-secondary/50">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{p.nomor} <span className="text-muted-foreground">· {p.tanggal}</span></span>
                    <span className="block truncate text-xs text-muted-foreground">{p.namaProyek || '-'} — {p.perusahaan || '-'}</span>
                    {p.status === 'Approved (Revisi)' && p.catatanApproval && <span className="block truncate text-xs italic text-amber-700">{p.catatanApproval}</span>}
                  </span>
                  <span className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                    {p.status === 'Approved (Revisi)' ? 'Perlu revisi' : 'Isi harga'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className={kartu}>
        <h2 className="mb-4 text-base font-semibold">Profil Sales</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {pilih('organisasi', 'Organisasi', master.organisasi, 'Pilih organisasi', (v) => {
            const s = salesUntuk(v);
            setH({ ...h, organisasi: v, namaSales: s.length === 1 ? s[0] : '' });
          })}
          {pilih('namaSales', 'Nama Sales', salesUntuk(h.organisasi), h.organisasi ? 'Pilih nama sales' : 'Pilih organisasi dulu')}
          {pilih('area', 'Area Kerja', master.area, 'Pilih area')}
          {pilih('kam', 'Key Account Manager', master.kam, 'Pilih KAM')}
          <div className="md:col-span-2">{field('franco', 'Lokasi Franco', { placeholder: 'Kota tujuan' })}</div>
        </div>
      </section>

      <section className={kartu}>
        <h2 className="mb-4 text-base font-semibold">Detail Klien</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {field('perusahaan', 'Nama Perusahaan', { placeholder: 'PT. XYZ Indonesia' })}
          {field('pic', 'PIC Proyek', { placeholder: 'Nama penanggung jawab' })}
          {field('telepon', 'Nomor Telepon / WhatsApp', { wajib: false, tipe: 'tel', placeholder: '+62 8xx xxxx xxxx' })}
          {field('email', 'Alamat Email', { wajib: false, tipe: 'email', placeholder: 'klien@perusahaan.com' })}
          <div className="md:col-span-2">{field('namaProyek', 'Nama Proyek', { placeholder: 'Contoh: Pembangunan Fasilitas Umum' })}</div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="f-alamat" className="text-xs font-medium text-muted-foreground">Alamat</Label>
            <textarea id="f-alamat" rows={3} value={h.alamat} onChange={(e) => setH({ ...h, alamat: e.target.value })}
              placeholder="Alamat pengiriman proyek..."
              className={cn('w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none',
                cobaKirim && !h.alamat && 'border-destructive')} />
          </div>
        </div>
      </section>

      <section className={kartu}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Daftar Produk <span className="ml-1 text-sm font-normal text-muted-foreground">· {items.length} produk</span></h2>
          <Button variant="outline" className="h-10 gap-1.5" onClick={() => setItems((xs) => [...xs, kosong(global)])}>
            <Plus className="size-4" /> Tambah
          </Button>
        </div>

        <div className="mb-5 rounded-xl border border-dashed border-primary/40 bg-accent/40 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
            <Wand2 className="size-4" /> Terapkan ke semua produk <span className="font-normal normal-case text-muted-foreground">(opsional)</span>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Jenis Produk (semua)</Label>
              <PilihSatu items={JENIS} value={global.jenis} placeholder="Pilih jenis produk" onChange={(v) => terapkanGlobal({ jenis: v })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">FP Tier (semua)</Label>
              <PilihSatu items={TIER} value={global.tier} placeholder="Pilih tier" onChange={(v) => terapkanGlobal({ tier: v })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">Produk (pilih banyak)</Label>
              <div className="flex gap-2">
                <PilihBanyak items={namaProdukMaster} value={pilihanProduk} onChange={setPilihanProduk}
                  labelSemua="Pilih produk..." satuan="produk" cariPlaceholder="Cari produk..." className="min-w-0 flex-1" />
                <Button className="h-11 gap-1.5" disabled={!pilihanProduk.length}
                  onClick={() => (items.some((x) => x.namaProduk) ? setGantiProduk(pilihanProduk) : tambahProdukBanyak(true, pilihanProduk))}>
                  <PackagePlus className="size-4" /> Terapkan
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((it, idx) => {
            const o = opsi(it);
            const tandai = cobaKirim && !lengkap(it);
            const nilaiHarga = harga(it);
            return (
              <div key={it.kunci} data-tidak-lengkap={tandai}
                className={cn('relative rounded-xl border border-l-4 border-border border-l-primary/60 p-4', tandai && 'ring-2 ring-destructive/60')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Produk {idx + 1}</p>
                  {items.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-9 gap-1 text-destructive hover:text-destructive"
                      onClick={() => setItems((xs) => xs.filter((x) => x.kunci !== it.kunci))} aria-label={`Hapus produk ${idx + 1}`}>
                      <Trash2 className="size-4" /> Hapus
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <PilihAtauKetik label="Jenis Produk" items={JENIS} value={it.jenisProduk} baru={it.jenisBaru} placeholder="Pilih jenis produk"
                    labelBaru="Tambah jenis produk..."
                    onPilih={(v) => ubah(it.kunci, v === BARU ? { jenisBaru: true, jenisProduk: '' } : { jenisProduk: v })}
                    onKetik={(v) => ubah(it.kunci, { jenisProduk: v })} onBatal={() => ubah(it.kunci, { jenisBaru: false, jenisProduk: '' })} />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">FP Tier</Label>
                    <PilihSatu items={TIER} value={it.tier} placeholder="Pilih tier" onChange={(v) => ubah(it.kunci, { tier: v })} />
                  </div>
                  <PilihAtauKetik label="Nama Produk" items={namaProdukMaster} value={it.namaProduk} baru={it.produkBaru}
                    placeholder="Pilih produk" labelBaru="Tambah produk baru..."
                    onPilih={(v) => (v === BARU
                      ? ubah(it.kunci, { produkBaru: true, namaProduk: '', jenisRm: '', warna: '', kemasan: '', kemasanBaru: true })
                      : pilihCascade(it, { namaProduk: v, jenisRm: '', warna: '', kemasan: '', kemasanBaru: false }))}
                    onKetik={(v) => ubah(it.kunci, { namaProduk: v })}
                    onBatal={() => ubah(it.kunci, { produkBaru: false, namaProduk: '', jenisRm: '', warna: '', kemasan: '', kemasanBaru: false })} />
                  {it.produkBaru ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Jenis Mix</Label>
                      <Input value={it.jenisRm} onChange={(e) => ubah(it.kunci, { jenisRm: e.target.value })} placeholder="Ketik jenis mix..." className="h-11 border-amber-300 bg-amber-50/60" />
                    </div>
                  ) : (
                    <PilihAtauKetik label="Jenis Mix" items={o.rm} value={it.jenisRm} baru={false} disabled={!it.namaProduk}
                      placeholder={it.namaProduk ? 'Pilih jenis mix' : 'Pilih produk dulu'}
                      onPilih={(v) => pilihCascade(it, { jenisRm: v, warna: '', kemasan: '', kemasanBaru: false })} onKetik={() => {}} onBatal={() => {}} />
                  )}
                  {it.produkBaru ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Warna</Label>
                      <Input value={it.warna} onChange={(e) => ubah(it.kunci, { warna: e.target.value })} placeholder="Ketik warna..." className="h-11 border-amber-300 bg-amber-50/60" />
                    </div>
                  ) : (
                    <PilihAtauKetik label="Warna" items={o.warna} value={it.warna} baru={false} disabled={!it.jenisRm}
                      placeholder={it.jenisRm ? 'Pilih warna' : 'Pilih jenis mix dulu'}
                      onPilih={(v) => pilihCascade(it, { warna: v, kemasan: '', kemasanBaru: false })} onKetik={() => {}} onBatal={() => {}} />
                  )}
                  <PilihAtauKetik label="Kemasan" items={o.kemasan} value={it.kemasan} baru={it.kemasanBaru}
                    disabled={!it.produkBaru && !it.warna && !it.kemasanBaru}
                    placeholder={it.warna ? 'Pilih kemasan' : 'Pilih warna dulu'} labelBaru="Tambah kemasan baru..."
                    onPilih={(v) => ubah(it.kunci, v === BARU ? { kemasanBaru: true, kemasan: '' } : { kemasan: v })}
                    onKetik={(v) => ubah(it.kunci, { kemasan: v })}
                    onBatal={() => ubah(it.kunci, it.produkBaru ? { kemasan: '' } : { kemasanBaru: false, kemasan: '' })} />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Kode Warna <span className="font-normal">(opsional)</span></Label>
                    <textarea rows={2} value={it.kodeWarna} onChange={(e) => ubah(it.kunci, { kodeWarna: e.target.value })} placeholder="Contoh: NP OW 1015 P"
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:border-ring focus-visible:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Catatan Admin <span className="font-normal">(opsional)</span></Label>
                    <textarea rows={2} value={it.catatanAdmin} onChange={(e) => ubah(it.kunci, { catatanAdmin: e.target.value })} placeholder="Catatan khusus Admin..."
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:border-ring focus-visible:outline-none" />
                    {it.catatanAdmin.trim() && (
                      <p className="flex gap-1.5 text-xs text-amber-700"><AlertTriangle className="size-3.5 shrink-0" />
                        Setelah diisi, penawaran otomatis masuk status <b>Pending Admin</b> untuk direview.</p>
                    )}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor={`harga-${it.kunci}`} className="text-xs font-medium text-muted-foreground">
                      Harga Satuan {edit ? '(diisi Admin)' : '(otomatis berdasarkan FP Tier)'}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                        <Input id={`harga-${it.kunci}`} readOnly={!edit} inputMode="numeric"
                          value={edit ? (it.harga ? formatRupiah(it.harga) : '') : (nilaiHarga > 0 ? formatRupiah(nilaiHarga) : '')}
                          placeholder={edit ? 'Masukkan harga...' : (lengkap(it) ? 'Tidak ada di master — dinilai Admin' : 'Lengkapi pilihan...')}
                          onChange={(e) => ubah(it.kunci, { harga: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                          className={cn('h-11 pl-10 font-semibold', !edit && 'bg-secondary/60')} />
                      </div>
                      {edit && (
                        <Button variant="outline" className="h-11" onClick={() => ubah(it.kunci, { harga: hargaMaster(it, master.produk) })}
                          title="Isi dengan harga master sesuai FP Tier">
                          Cek harga
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button className="h-12 w-full gap-2 text-base" disabled={pending} onClick={cobaSubmit}>
          {edit ? <Check className="size-5" /> : <Send className="size-5" />}
          {pending ? 'Memproses...' : edit ? 'Simpan Perubahan' : 'Kirim Penawaran'}
        </Button>
      </div>

      <AlertDialog open={konfirmasi} onOpenChange={setKonfirmasi}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{edit ? 'Simpan perubahan?' : 'Kirim penawaran?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {edit ? 'Data penawaran akan diperbarui dan PDF dibuat ulang.' : `${items.length} produk untuk ${h.perusahaan || '-'} akan diajukan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <Button disabled={pending} onClick={kirim}>{pending ? 'Memproses...' : edit ? 'Ya, simpan' : 'Ya, kirim'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!gantiProduk} onOpenChange={(v) => { if (!v) setGantiProduk(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sudah ada produk terisi</AlertDialogTitle>
            <AlertDialogDescription>
              Ganti semua produk dengan {gantiProduk?.length} produk pilihan, atau tambahkan ke daftar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="outline" onClick={() => { tambahProdukBanyak(false, gantiProduk!); setGantiProduk(null); }}>Tambahkan</Button>
            <Button onClick={() => { tambahProdukBanyak(true, gantiProduk!); setGantiProduk(null); }}>Ganti semua</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
