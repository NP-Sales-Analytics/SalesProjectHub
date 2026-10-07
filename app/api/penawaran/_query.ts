import type { FilterPenawaran, KolomUrut } from '@/lib/penawaran/service';

/** Baca filter daftar/dashboard dari query string (nilai ganda dipisah koma). */
export function bacaFilter(sp: URLSearchParams): FilterPenawaran {
  const daftar = (k: string) => (sp.get(k) ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  return {
    q: sp.get('q') ?? undefined, status: daftar('status'), organisasi: daftar('organisasi'), area: daftar('area'),
    kam: daftar('kam'), sales: daftar('sales'), dari: sp.get('dari') ?? undefined, sampai: sp.get('sampai') ?? undefined,
  };
}

export function bacaHalaman(sp: URLSearchParams) {
  const urut = (sp.get('urut') ?? 'tanggal') as KolomUrut;
  return {
    halaman: Math.max(1, Number(sp.get('halaman')) || 1),
    ukuran: [10, 50, 100].includes(Number(sp.get('ukuran'))) ? Number(sp.get('ukuran')) : 10,
    urut, arah: sp.get('arah') === 'asc' ? 'asc' as const : 'desc' as const,
  };
}
