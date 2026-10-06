'use client';

import { Pencil, Plus, Search, X } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { aksiSimpanArea } from '@/app/(app)/admin/area/actions';
import { PaginationAtas, PaginationBawah, potongHalaman } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AreaInput, BarisArea } from '@/lib/admin/area';

type Kolom = keyof BarisArea;
const GRUP: { judul: string; kolom: [Kolom, string, string?][] }[] = [
  { judul: 'Identitas', kolom: [['nama', 'Nama Area', 'mis. Makassar'], ['singkatan', 'Singkatan (No. Dokumen)', 'mis. MKS'], ['urutan', 'Urutan', 'kosong = paling akhir']] },
  { judul: 'Organisasi Reguler', kolom: [['emailApproval', 'Email Approval'], ['dearEmail', 'Sapaan "Dear"'], ['ccPdf', 'CC di PDF']] },
  { judul: 'Spec Project', kolom: [['emailApprovalSpec', 'Email Approval'], ['dearEmailSpec', 'Sapaan "Dear"'], ['ccPdfSpec', 'CC di PDF']] },
  { judul: 'SAFL', kolom: [['emailApprovalSafl', 'Email Approval'], ['dearEmailSafl', 'Sapaan "Dear"'], ['ccPdfSafl', 'CC di PDF']] },
  { judul: 'Semua Organisasi', kolom: [['emailCc', 'Email CC', 'pisahkan dengan koma']] },
];

function AreaFormDialog({ row, onClose }: { row: BarisArea | null; onClose: () => void }) {
  const [pending, start] = useTransition();
  const kirim = (fd: FormData) => start(async () => {
    // Divalidasi zod di server (areaInputSchema).
    const input = Object.fromEntries(GRUP.flatMap((g) => g.kolom.map(([k]) => [k, String(fd.get(k) ?? '')]))) as AreaInput;
    const hasil = await aksiSimpanArea(row?.id ?? null, input);
    if (!hasil.ok) { toast.error(hasil.pesan); return; }
    toast.success(hasil.pesan);
    onClose();
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent showCloseButton={false}
        className="grid max-h-[90svh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <DialogTitle className="text-base">{row ? `Edit Area: ${row.nama}` : 'Tambah Area'}</DialogTitle>
            <p className="text-xs text-muted-foreground">Nama area tidak dapat diubah setelah disimpan karena dirujuk data Sales &amp; Penawaran.</p>
          </div>
          <DialogClose aria-label="Tutup" className="grid size-9 place-items-center rounded-lg hover:bg-secondary"><X className="size-4" /></DialogClose>
        </header>
        <form id="area-form" className="min-h-0 space-y-5 overflow-y-auto px-5 py-5"
          // onSubmit, bukan action={}: React 19 mereset isian form setelah action selesai,
          // sehingga saat simpan gagal semua isian user hilang.
          onSubmit={(e) => { e.preventDefault(); kirim(new FormData(e.currentTarget)); }}>
          {GRUP.map((g) => (
            <div key={g.judul}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{g.judul}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {g.kolom.map(([k, label, ph]) => {
                  const terkunci = k === 'nama' && !!row;
                  return (
                    <div key={k} className={k === 'emailCc' ? 'space-y-1.5 sm:col-span-3' : 'space-y-1.5'}>
                      <Label htmlFor={`a-${k}`} className="text-xs">{label}</Label>
                      <Input id={`a-${k}`} name={k} defaultValue={String(row?.[k] ?? '')} placeholder={ph}
                        readOnly={terkunci} required={k === 'singkatan' || (k === 'nama' && !row)}
                        type={k === 'urutan' ? 'number' : 'text'} min={k === 'urutan' ? 0 : undefined}
                        maxLength={k === 'singkatan' ? 5 : undefined}
                        className={terkunci ? 'h-11 bg-secondary text-muted-foreground' : k === 'singkatan' ? 'h-11 uppercase' : 'h-11'} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </form>
        <footer className="flex gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={pending}>Batal</Button>
          <Button type="submit" form="area-form" className="h-11 flex-1" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan'}</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

export function AreaTable({ rows }: { rows: BarisArea[] }) {
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [ukuran, setUkuran] = useState(10);
  const [form, setForm] = useState<{ row: BarisArea | null } | null>(null);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return q ? rows.filter((a) => Object.values(a).some((v) => String(v ?? '').toLowerCase().includes(q))) : rows;
  }, [rows, cari]);
  const pg = potongHalaman(tersaring.length, halaman, ukuran);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={cari} onChange={(e) => { setCari(e.target.value); setHalaman(1); }}
            placeholder="Cari area, singkatan, atau email..." className="h-11 pl-10" aria-label="Cari area" />
        </div>
        <Button className="h-11 gap-2" onClick={() => setForm({ row: null })}><Plus className="size-4" /> Tambah Area</Button>
      </div>

      <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <PaginationAtas total={tersaring.length} mulai={pg.mulai} akhir={pg.akhir} ukuran={ukuran}
          onUkuran={(u) => { setUkuran(u); setHalaman(1); }} satuan="area" />
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 py-3 pl-4 text-center">Urutan</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Singkatan</TableHead>
                <TableHead>Email Approval</TableHead>
                <TableHead>Email CC</TableHead>
                <TableHead className="pr-4 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tersaring.slice(pg.mulai, pg.akhir).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="py-3 pl-4 text-center text-muted-foreground">{a.urutan ?? '-'}</TableCell>
                  <TableCell className="font-medium">{a.nama}</TableCell>
                  <TableCell><span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">{a.singkatan ?? '-'}</span></TableCell>
                  <TableCell className="max-w-64 break-all text-sm text-muted-foreground">{a.emailApproval ?? '-'}</TableCell>
                  <TableCell className="max-w-64 break-all text-sm text-muted-foreground">{a.emailCc ?? '-'}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setForm({ row: a })}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!tersaring.length && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Tidak ada area.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationBawah total={tersaring.length} aktif={pg.aktif} totalHalaman={pg.totalHalaman} onHalaman={setHalaman} satuan="area" />
      </div>

      {form && <AreaFormDialog key={form.row?.id ?? 'baru'} row={form.row} onClose={() => setForm(null)} />}
    </div>
  );
}
