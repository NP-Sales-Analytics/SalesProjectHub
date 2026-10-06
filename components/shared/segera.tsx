import { Construction } from 'lucide-react';

/** Halaman sementara selama migrasi bertahap (diganti di tahap 4–5). */
export function Segera({ judul, tahap }: { judul: string; tahap: number }) {
  return (
    <div className="mx-auto grid w-full max-w-xl place-items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Construction className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="mt-3 text-base font-semibold">{judul}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Halaman ini sedang dimigrasikan (tahap {tahap}).</p>
    </div>
  );
}
