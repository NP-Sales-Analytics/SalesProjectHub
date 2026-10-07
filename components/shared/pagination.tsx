'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { nomorHalaman, UKURAN_HALAMAN } from '@/lib/pagination';
import { cn } from '@/lib/utils';

export { potongHalaman } from '@/lib/pagination';

const tombol = 'grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

/** Bar atas: pilihan ukuran + info rentang. */
export function PaginationAtas({ total, mulai, akhir, ukuran, onUkuran, satuan }: {
  total: number; mulai: number; akhir: number; ukuran: number; onUkuran: (u: number) => void; satuan: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">Tampilkan:</span>
        {UKURAN_HALAMAN.map((u) => (
          <button key={u} type="button" onClick={() => onUkuran(u)} aria-pressed={u === ukuran}
            className={cn(tombol, u === ukuran ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-secondary')}>
            {u}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {total > 0 ? `Menampilkan ${mulai + 1}–${akhir} dari ${total} ${satuan}` : `0 ${satuan}`}
      </p>
    </div>
  );
}

/** Bar bawah: total + tombol halaman. */
export function PaginationBawah({ total, aktif, totalHalaman, onHalaman, satuan }: {
  total: number; aktif: number; totalHalaman: number; onHalaman: (p: number) => void; satuan: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">Total: {total} {satuan} · Halaman {aktif} dari {totalHalaman}</p>
      <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={cn(tombol, 'border-border bg-card hover:bg-secondary')} disabled={aktif <= 1}
          onClick={() => onHalaman(aktif - 1)} aria-label="Halaman sebelumnya"><ChevronLeft className="size-4" /></button>
        {nomorHalaman(aktif, totalHalaman).map((p, i) => p === '…'
          ? <span key={`e${i}`} className="px-1 text-sm text-muted-foreground">…</span>
          : (
            <button key={p} type="button" onClick={() => onHalaman(p)} aria-current={p === aktif ? 'page' : undefined}
              className={cn(tombol, p === aktif ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-secondary')}>
              {p}
            </button>
          ))}
        <button type="button" className={cn(tombol, 'border-border bg-card hover:bg-secondary')} disabled={aktif >= totalHalaman}
          onClick={() => onHalaman(aktif + 1)} aria-label="Halaman berikutnya"><ChevronRight className="size-4" /></button>
      </nav>
    </div>
  );
}
