'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Eye, FileText, PencilLine, Search, X, XCircle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { aksiPutuskan } from '@/app/(app)/penawaran/actions';
import { DetailDialog } from '@/components/penawaran/detail-dialog';
import { BadgeStatus, URUTAN_STATUS, WARNA_STATUS } from '@/components/penawaran/status';
import { PaginationAtas, PaginationBawah } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { PilihBanyak } from '@/components/ui/combobox';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/lib/use-debounce';
import { cn } from '@/lib/utils';

type Baris = {
  id: string; nomor: string; tanggal: string; status: string; organisasi: string | null; kam: string | null; namaSales: string | null;
  area: string | null; perusahaan: string | null; pic: string | null; namaProyek: string | null; pdfUrl: string | null;
};
type Hasil = { rows: Baris[]; total: number; halaman: number; totalHalaman: number; kpi: Record<string, number> };
type Opsi = { organisasi: string[]; area: string[]; kam: string[]; sales: string[] };
type Aksi = 'approve' | 'approve_revisi' | 'decline';

export const POLLING = () => (typeof document !== 'undefined' && document.visibilityState === 'visible' ? 10_000 : false) as number | false;

function KeputusanDialog({ baris, aksi, onClose }: { baris: Baris; aksi: Aksi; onClose: () => void }) {
  const qc = useQueryClient();
  const [alasan, setAlasan] = useState('');
  const [pending, start] = useTransition();
  const wajib = aksi !== 'approve';
  const judul = { approve: 'Setujui penawaran', approve_revisi: 'Setujui dengan revisi', decline: 'Tolak penawaran' }[aksi];
  const kirim = () => start(async () => {
    const r = await aksiPutuskan(baris.id, { aksi, alasan });
    if (!r.ok) { toast.error(r.pesan); qc.invalidateQueries({ queryKey: ['penawaran'] }); onClose(); return; }
    toast.success(r.pesan);
    qc.invalidateQueries({ queryKey: ['penawaran'] });
    onClose();
  });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-w-md rounded-2xl p-0 sm:max-w-md">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle className="text-base">{judul}</DialogTitle>
          <DialogClose aria-label="Tutup" className="grid size-9 place-items-center rounded-lg hover:bg-secondary"><X className="size-4" /></DialogClose>
        </header>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl bg-secondary/60 p-3 text-sm">
            <p className="font-medium">{baris.nomor}</p>
            <p className="text-muted-foreground">{baris.namaProyek || '-'} — {baris.perusahaan || '-'}</p>
            <p className="text-muted-foreground">Sales: {baris.namaSales || '-'}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alasan">{aksi === 'decline' ? 'Alasan penolakan' : aksi === 'approve_revisi' ? 'Instruksi revisi' : 'Catatan (opsional)'}</Label>
            <textarea id="alasan" rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Tuliskan alasan atau catatan..."
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:border-ring focus-visible:outline-none" />
          </div>
          <p className="text-xs text-muted-foreground">Nama approver diambil dari akun Anda. Email konfirmasi dikirim ke pengaju.</p>
        </div>
        <footer className="flex gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" className="h-11 flex-1" onClick={onClose} disabled={pending}>Batal</Button>
          <Button className={cn('h-11 flex-1', aksi === 'decline' && 'bg-destructive hover:bg-destructive/90', aksi === 'approve_revisi' && 'bg-amber-500 hover:bg-amber-500/90')}
            disabled={pending || (wajib && !alasan.trim())} onClick={kirim}>
            {pending ? 'Memproses...' : 'Konfirmasi'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

const KOLOM_URUT: { kunci: string; label: string; kelas?: string }[] = [
  { kunci: 'nomor', label: 'ID' }, { kunci: 'perusahaan', label: 'Klien / PIC', kelas: 'hidden md:table-cell' },
  { kunci: 'proyek', label: 'Nama Proyek' }, { kunci: 'sales', label: 'Sales', kelas: 'hidden lg:table-cell' },
  { kunci: 'tanggal', label: 'Tanggal', kelas: 'hidden lg:table-cell' },
];

/** Dokumen Penawaran (mode arsip) & Approval Center (mode approval). */
export function DaftarPenawaran({ mode, admin }: { mode: 'arsip' | 'approval'; admin: boolean }) {
  const approval = mode === 'approval';
  const [cari, setCari] = useState('');
  const q = useDebounce(cari, 300);
  const [f, setF] = useState<{ status: string[]; organisasi: string[]; area: string[]; kam: string[]; sales: string[]; dari: string; sampai: string }>(
    { status: [], organisasi: [], area: [], kam: [], sales: [], dari: '', sampai: '' });
  const [halaman, setHalaman] = useState(1);
  const [ukuran, setUkuran] = useState(10);
  const [urut, setUrut] = useState({ kolom: 'tanggal', arah: 'desc' as 'asc' | 'desc' });
  const [detail, setDetail] = useState<string | null>(null);
  const [keputusan, setKeputusan] = useState<{ baris: Baris; aksi: Aksi } | null>(null);
  const sumber = approval ? '&sumber=approval' : '';

  const parameter = new URLSearchParams({
    q, halaman: String(halaman), ukuran: String(ukuran), urut: urut.kolom, arah: urut.arah,
    ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v])),
  }).toString();
  const { data, isFetching } = useQuery<Hasil>({
    queryKey: ['penawaran', mode, parameter],
    queryFn: async () => (await fetch(`/api/penawaran?${parameter}${sumber}`)).json(),
    placeholderData: keepPreviousData,
    refetchInterval: POLLING,
  });
  const { data: opsi } = useQuery<Opsi>({
    queryKey: ['penawaran', 'opsi', mode],
    queryFn: async () => (await fetch(`/api/penawaran?mode=opsi${sumber}`)).json(),
    staleTime: 5 * 60_000,
  });
  const saring = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setHalaman(1); };
  const ubahUrut = (kolom: string) => setUrut((u) => ({ kolom, arah: u.kolom === kolom && u.arah === 'desc' ? 'asc' : 'desc' }));
  const mulai = data ? (data.halaman - 1) * ukuran : 0;
  const aktifFilter = [f.organisasi, f.area, f.kam, f.sales, f.status].some((x) => x.length) || !!f.dari || !!f.sampai;

  return (
    <div className="space-y-4">
      <div className={cn('grid gap-3', approval ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-5')}>
        {(approval ? ['Pending Approve'] : URUTAN_STATUS).map((s) => (
          <button key={s} type="button" disabled={approval}
            onClick={() => saring({ status: f.status.length === 1 && f.status[0] === s ? [] : [s] })}
            className={cn('rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition-colors',
              !approval && 'hover:border-primary/50', f.status.length === 1 && f.status[0] === s && 'border-primary ring-2 ring-primary/20')}>
            <p className="text-2xl font-semibold">{data?.kpi[s] ?? '—'}</p>
            <p className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium', WARNA_STATUS[s])}>{approval ? 'Menunggu keputusan' : s}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={cari} onChange={(e) => { setCari(e.target.value); setHalaman(1); }} placeholder="Cari ID, proyek, perusahaan, PIC, sales..."
            className="h-11 pl-10" aria-label="Cari penawaran" />
        </div>
        <PilihBanyak items={opsi?.organisasi ?? []} value={f.organisasi} onChange={(v) => saring({ organisasi: v })} labelSemua="Semua organisasi" satuan="organisasi" className="w-48" />
        <PilihBanyak items={opsi?.area ?? []} value={f.area} onChange={(v) => saring({ area: v })} labelSemua="Semua area" satuan="area" className="w-40" />
        <PilihBanyak items={opsi?.kam ?? []} value={f.kam} onChange={(v) => saring({ kam: v })} labelSemua="Semua KAM" satuan="KAM" className="w-40" />
        <PilihBanyak items={opsi?.sales ?? []} value={f.sales} onChange={(v) => saring({ sales: v })} labelSemua="Semua sales" satuan="sales" className="w-40" />
        <div className="flex items-center gap-1.5">
          <Input type="date" value={f.dari} onChange={(e) => saring({ dari: e.target.value })} className="h-11 w-40" aria-label="Dari tanggal" />
          <span className="text-sm text-muted-foreground">–</span>
          <Input type="date" value={f.sampai} onChange={(e) => saring({ sampai: e.target.value })} className="h-11 w-40" aria-label="Sampai tanggal" />
        </div>
        {aktifFilter && (
          <Button variant="ghost" className="h-11" onClick={() => saring({ status: [], organisasi: [], area: [], kam: [], sales: [], dari: '', sampai: '' })}>Reset filter</Button>
        )}
      </div>

      <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <PaginationAtas total={data?.total ?? 0} mulai={mulai} akhir={mulai + (data?.rows.length ?? 0)} ukuran={ukuran}
          onUkuran={(u) => { setUkuran(u); setHalaman(1); }} satuan="dokumen" />
        <div className={cn('overflow-x-auto rounded-xl border border-border transition-opacity', isFetching && 'opacity-80')}>
          <Table>
            <TableHeader>
              <TableRow>
                {KOLOM_URUT.map((k) => (
                  <TableHead key={k.kunci} className={cn('py-3 first:pl-4', k.kelas)}>
                    <button type="button" onClick={() => ubahUrut(k.kunci)} className="inline-flex items-center gap-1 font-medium">
                      {k.label}
                      {urut.kolom === k.kunci ? (urut.arah === 'asc' ? <ArrowUp className="size-3.5 text-primary" /> : <ArrowDown className="size-3.5 text-primary" />)
                        : <ArrowUpDown className="size-3.5 text-muted-foreground/60" />}
                    </button>
                  </TableHead>
                ))}
                {!approval && <TableHead>Status</TableHead>}
                <TableHead className="pr-4 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="py-3 pl-4 align-top font-semibold"><span className="block max-w-36 break-words">{r.nomor}</span></TableCell>
                  <TableCell className="hidden align-top md:table-cell">
                    <p className="max-w-52 truncate font-medium">{r.perusahaan || '-'}</p>
                    <p className="max-w-52 truncate text-xs text-muted-foreground">{r.pic || '-'}</p>
                  </TableCell>
                  <TableCell className="align-top"><p className="max-w-64 break-words">{r.namaProyek || '-'}</p></TableCell>
                  <TableCell className="hidden align-top lg:table-cell">{r.namaSales || '-'}</TableCell>
                  <TableCell className="hidden whitespace-nowrap align-top text-muted-foreground lg:table-cell">{r.tanggal}</TableCell>
                  {!approval && <TableCell className="align-top"><BadgeStatus status={r.status} /></TableCell>}
                  <TableCell className="pr-4 align-top">
                    <div className="flex justify-center gap-1.5">
                      <Button variant="outline" size="icon" className="size-9" onClick={() => setDetail(r.id)} aria-label={`Lihat ${r.nomor}`} title="Overview">
                        <Eye className="size-4" />
                      </Button>
                      {!approval && r.pdfUrl && (
                        <Button variant="outline" size="icon" className="size-9" aria-label={`PDF ${r.nomor}`} title="Buka PDF"
                          render={<a href={`/api/penawaran/${encodeURIComponent(r.id)}/pdf`} target="_blank" rel="noopener" />}>
                          <FileText className="size-4" />
                        </Button>
                      )}
                      {approval && (
                        <>
                          <Button variant="outline" size="icon" className="size-9 text-emerald-600" title="Setujui" aria-label={`Setujui ${r.nomor}`}
                            onClick={() => setKeputusan({ baris: r, aksi: 'approve' })}><CheckCircle2 className="size-4" /></Button>
                          <Button variant="outline" size="icon" className="size-9 text-amber-600" title="Setujui dengan revisi" aria-label={`Revisi ${r.nomor}`}
                            onClick={() => setKeputusan({ baris: r, aksi: 'approve_revisi' })}><PencilLine className="size-4" /></Button>
                          <Button variant="outline" size="icon" className="size-9 text-destructive" title="Tolak" aria-label={`Tolak ${r.nomor}`}
                            onClick={() => setKeputusan({ baris: r, aksi: 'decline' })}><XCircle className="size-4" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data && !data.rows.length && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {approval ? 'Tidak ada dokumen yang menunggu approval.' : 'Belum ada data penawaran.'}
                </TableCell></TableRow>
              )}
              {!data && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Memuat data...</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <PaginationBawah total={data?.total ?? 0} aktif={data?.halaman ?? 1} totalHalaman={data?.totalHalaman ?? 1} onHalaman={setHalaman} satuan="dokumen" />
      </div>

      {detail && <DetailDialog id={detail} admin={admin} onClose={() => setDetail(null)} />}
      {keputusan && <KeputusanDialog baris={keputusan.baris} aksi={keputusan.aksi} onClose={() => setKeputusan(null)} />}
    </div>
  );
}
