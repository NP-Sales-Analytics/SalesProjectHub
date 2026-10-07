'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil, PencilLine, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { aksiEditLangsung } from '@/app/(app)/penawaran/actions';
import { BadgeStatus } from '@/components/penawaran/status';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/penawaran/aturan';
import { cn } from '@/lib/utils';

type Item = {
  noItem: number; jenisProduk: string | null; tier: string | null; namaProduk: string | null; jenisRm: string | null;
  warna: string | null; kemasan: string | null; kodeWarna: string | null; catatanAdmin: string | null; hargaSatuan: number; hargaEdit: number;
};
export type DetailPenawaran = {
  id: string; nomor: string; tanggal: string; status: string; organisasi: string | null; kam: string | null; namaSales: string | null;
  area: string | null; franco: string | null; perusahaan: string | null; pic: string | null; telepon: string | null; email: string | null;
  namaProyek: string | null; alamat: string | null; catatanApproval: string | null; approver: string | null; pdfUrl: string | null;
  produk: Item[];
};

const HEADER: [keyof DetailPenawaran, string, boolean?][] = [
  ['perusahaan', 'Perusahaan'], ['pic', 'PIC'], ['telepon', 'Telepon'], ['email', 'Email'], ['alamat', 'Alamat', true],
  ['franco', 'Franco'], ['kam', 'Key Account Manager'], ['namaSales', 'Sales / Specifier'], ['area', 'Area'],
];
const KOLOM_ITEM: [keyof Item, string][] = [
  ['jenisProduk', 'Jenis Produk'], ['tier', 'Tier'], ['jenisRm', 'Jenis RM'], ['warna', 'Warna'], ['kemasan', 'Kemasan'], ['kodeWarna', 'Kode Warna'],
];
const harga = (it: Item) => Number(it.hargaEdit || it.hargaSatuan || 0);

/** Overview penawaran (viewOffer) + edit langsung Admin tanpa approval ulang (adminEditPenawaran). */
export function DetailDialog({ id, admin, onClose }: { id: string; admin: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: p, isLoading, error } = useQuery<DetailPenawaran>({
    queryKey: ['penawaran', id],
    queryFn: async () => {
      const r = await fetch(`/api/penawaran/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error((await r.json()).error ?? 'Gagal memuat.');
      return r.json();
    },
  });
  const [edit, setEdit] = useState<DetailPenawaran | null>(null);
  const [pending, start] = useTransition();
  const status = p?.status.toLowerCase() ?? '';

  const simpan = () => start(async () => {
    if (!edit) return;
    const hasil = await aksiEditLangsung(edit.id, {
      perusahaan: edit.perusahaan ?? '', pic: edit.pic ?? '', telepon: edit.telepon ?? '', email: edit.email ?? '',
      alamat: edit.alamat ?? '', namaProyek: edit.namaProyek ?? '', franco: edit.franco ?? '', kam: edit.kam ?? '',
      namaSales: edit.namaSales ?? '', area: edit.area ?? '',
      produk: edit.produk.map((it) => ({
        jenisProduk: it.jenisProduk ?? '', namaProduk: it.namaProduk ?? '', tier: it.tier ?? '', jenisRm: it.jenisRm ?? '',
        warna: it.warna ?? '', kemasan: it.kemasan ?? '', kodeWarna: it.kodeWarna ?? '', catatanAdmin: it.catatanAdmin ?? '', harga: harga(it),
      })),
    });
    if (!hasil.ok) { toast.error(hasil.pesan); return; }
    toast.success(hasil.pesan);
    setEdit(null);
    qc.invalidateQueries({ queryKey: ['penawaran'] });
  });

  const ubahHeader = (k: keyof DetailPenawaran, v: string) => setEdit((e) => (e ? { ...e, [k]: v } : e));
  const ubahItem = (i: number, patch: Partial<Item>) => setEdit((e) => (e ? { ...e, produk: e.produk.map((x, j) => (j === i ? { ...x, ...patch } : x)) } : e));

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent showCloseButton={false}
        className="grid max-h-[90svh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {edit ? (
              <Input value={edit.namaProyek ?? ''} onChange={(e) => ubahHeader('namaProyek', e.target.value)} aria-label="Nama proyek" className="h-10 font-semibold" />
            ) : (
              <DialogTitle className="truncate text-base">{p?.namaProyek || p?.nomor || 'Memuat...'}</DialogTitle>
            )}
            {p && <p className="mt-1 text-xs text-muted-foreground">{p.nomor} · {p.tanggal} · {p.organisasi}</p>}
          </div>
          <DialogClose aria-label="Tutup" className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-secondary"><X className="size-4" /></DialogClose>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
          {isLoading && <p className="text-sm text-muted-foreground">Memuat detail...</p>}
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {p && !edit && (
            <>
              <BadgeStatus status={p.status} />
              {['ditolak', 'approved', 'approved (revisi)'].includes(status) && (
                <div className={cn('rounded-xl border p-3 text-sm',
                  status === 'ditolak' ? 'border-red-100 bg-red-50' : status === 'approved' ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50')}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {status === 'ditolak' ? 'Catatan Penolakan' : status === 'approved' ? 'Catatan Persetujuan' : 'Instruksi Revisi'}
                  </p>
                  <p className="font-medium">{p.catatanApproval || '(tidak ada catatan)'}</p>
                  {p.approver && <p className="mt-1 text-xs text-muted-foreground">Diproses oleh: <b>{p.approver}</b></p>}
                </div>
              )}
              <dl className="grid grid-cols-2 gap-2.5">
                {HEADER.map(([k, label, lebar]) => (
                  <div key={k} className={cn('rounded-xl bg-secondary/60 p-3', lebar && 'col-span-2')}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="break-words text-sm font-medium">{String(p[k] ?? '') || '-'}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Produk</p>
                <ul className="space-y-2">
                  {p.produk.map((it) => (
                    <li key={it.noItem} className="flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                      <div className="min-w-0 text-sm">
                        <p className="font-medium">{it.namaProduk || '-'}</p>
                        <p className="text-xs text-muted-foreground">{[it.tier, it.jenisRm, it.warna, it.kemasan].filter(Boolean).join(' · ')}</p>
                        {it.kodeWarna && <p className="text-xs"><span className="text-muted-foreground">Kode Warna:</span> {it.kodeWarna}</p>}
                        {it.catatanAdmin && <p className="text-xs"><span className="text-muted-foreground">Catatan Admin:</span> {it.catatanAdmin}</p>}
                      </div>
                      <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">Rp {formatRupiah(harga(it))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {edit && (
            <>
              <p className="rounded-xl bg-accent/60 px-3 py-2 text-xs text-accent-foreground">
                Perubahan langsung tersimpan tanpa proses approval ulang. Status, tanggal, dan catatan approval tidak berubah; PDF diperbarui otomatis.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {HEADER.map(([k, label, lebar]) => (
                  <div key={k} className={cn('space-y-1', (lebar || k === 'kam') && 'col-span-2')}>
                    <Label htmlFor={`e-${k}`} className="text-xs text-muted-foreground">{label}</Label>
                    <Input id={`e-${k}`} value={String(edit[k] ?? '')} onChange={(e) => ubahHeader(k, e.target.value)} className="h-10" />
                  </div>
                ))}
              </div>
              <ul className="space-y-3">
                {edit.produk.map((it, i) => (
                  <li key={it.noItem} className="grid grid-cols-2 gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Nama Produk</Label>
                      <Input value={it.namaProduk ?? ''} onChange={(e) => ubahItem(i, { namaProduk: e.target.value })} className="h-10 bg-white" />
                    </div>
                    {KOLOM_ITEM.map(([k, label]) => (
                      <div key={k} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Input value={String(it[k] ?? '')} onChange={(e) => ubahItem(i, { [k]: e.target.value })} className="h-10 bg-white" />
                      </div>
                    ))}
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Catatan Admin</Label>
                      <Input value={it.catatanAdmin ?? ''} onChange={(e) => ubahItem(i, { catatanAdmin: e.target.value })} className="h-10 bg-white" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Harga (Rp)</Label>
                      <Input inputMode="numeric" value={harga(it) ? formatRupiah(harga(it)) : ''}
                        onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')) || 0; ubahItem(i, { hargaEdit: n, hargaSatuan: n }); }}
                        className="h-10 bg-white" />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          {edit ? (
            <>
              <Button variant="outline" className="h-11" onClick={() => setEdit(null)} disabled={pending}>Batal</Button>
              <Button className="h-11" onClick={simpan} disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan'}</Button>
            </>
          ) : (
            <>
              {p?.pdfUrl && (
                <Button variant="outline" className="h-11 gap-1.5" render={<a href={`/api/penawaran/${encodeURIComponent(p.id)}/pdf`} target="_blank" rel="noopener" />}>
                  <FileText className="size-4" /> PDF
                </Button>
              )}
              {admin && p && (
                <>
                  <Button variant="outline" className="h-11 gap-1.5" render={<Link href={`/penawaran/baru?edit=${encodeURIComponent(p.id)}`} />}
                    title="Edit Penawaran (dengan alur approval)">
                    <PencilLine className="size-4" /> Edit Penawaran
                  </Button>
                  <Button variant="outline" className="h-11 gap-1.5" onClick={() => setEdit(structuredClone(p))} title="Edit langsung tanpa approval ulang">
                    <Pencil className="size-4" /> Edit Langsung
                  </Button>
                </>
              )}
              <Button className="h-11" onClick={onClose}>Tutup</Button>
            </>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
