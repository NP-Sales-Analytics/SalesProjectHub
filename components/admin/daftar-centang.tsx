'use client';

import { ChevronDown } from 'lucide-react';

/** Daftar checkbox yang bisa dilipat, dengan "Pilih semua". Dipakai form user. */
export function DaftarCentang({
  judul, pilihan, terpilih, onChange, kosong = 'Belum ada yang dipilih', terkunci = false, catatan,
}: {
  judul: string;
  pilihan: { nilai: string; label: string }[];
  terpilih: string[];
  onChange: (v: string[]) => void;
  kosong?: string;
  terkunci?: boolean;
  catatan?: string;
}) {
  const semua = pilihan.length > 0 && pilihan.every((p) => terpilih.includes(p.nilai));
  const toggle = (nilai: string) =>
    onChange(terpilih.includes(nilai) ? terpilih.filter((x) => x !== nilai) : [...terpilih, nilai]);

  return (
    <fieldset disabled={terkunci} className="space-y-2">
      <legend className="text-sm font-medium">{judul}</legend>
      <details className="group rounded-xl border border-border bg-background">
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-3.5 text-sm">
          <span className={terpilih.length ? '' : 'text-muted-foreground'}>
            {terkunci ? (catatan ?? 'Semua') : terpilih.length ? `${terpilih.length} dipilih` : kosong}
          </span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        {!terkunci && (
          <div className="max-h-60 space-y-0.5 overflow-y-auto border-t border-border p-2">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm font-medium hover:bg-secondary">
              <input type="checkbox" className="size-4 accent-primary" checked={semua}
                onChange={() => onChange(semua ? [] : pilihan.map((p) => p.nilai))} />
              Pilih semua
            </label>
            {pilihan.map((p) => (
              <label key={p.nilai} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-secondary">
                <input type="checkbox" className="size-4 accent-primary" checked={terpilih.includes(p.nilai)}
                  onChange={() => toggle(p.nilai)} />
                {p.label}
              </label>
            ))}
          </div>
        )}
      </details>
      {catatan && !terkunci && <p className="text-xs text-muted-foreground">{catatan}</p>}
    </fieldset>
  );
}
