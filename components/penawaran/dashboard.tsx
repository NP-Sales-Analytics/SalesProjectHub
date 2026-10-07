'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, XAxis } from 'recharts';
import { POLLING } from '@/components/penawaran/daftar-penawaran';
import { DetailDialog } from '@/components/penawaran/detail-dialog';
import { BadgeStatus, URUTAN_STATUS } from '@/components/penawaran/status';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PilihBanyak } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Baris = { id: string; nomor: string; tanggal: string; status: string; perusahaan: string | null; pic: string | null; namaProyek: string | null };
type Titik = { label: string; jumlah: number };
type Ringkasan = {
  kpi: Record<string, number>;
  tren: { minggu: Titik[]; bulan: Titik[]; tahun: Titik[]; bulanLabel: string; tahunLabel: string };
  terbaru: Baris[];
};

const WARNA: Record<string, string> = {
  'Pending Admin': '#64748b', 'Pending Approve': '#465fff', Approved: '#12b76a', 'Approved (Revisi)': '#f79009', Ditolak: '#f04438',
};
const configTren = { jumlah: { label: 'Pengajuan', color: 'var(--primary)' } } satisfies ChartConfig;
const configStatus = Object.fromEntries(URUTAN_STATUS.map((s) => [s, { label: s, color: WARNA[s] }])) satisfies ChartConfig;
const INTERVAL = [{ k: 'minggu', l: '7 hari' }, { k: 'bulan', l: 'Bulan ini' }, { k: 'tahun', l: 'Tahun ini' }] as const;

export function Dashboard({ admin }: { admin: boolean }) {
  const [f, setF] = useState({ organisasi: [] as string[], area: [] as string[], kam: [] as string[], sales: [] as string[], dari: '', sampai: '' });
  const [interval, setRentang] = useState<'minggu' | 'bulan' | 'tahun'>('minggu');
  const [detail, setDetail] = useState<string | null>(null);
  const parameter = new URLSearchParams(Object.entries(f).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v])).toString();

  const { data } = useQuery<Ringkasan>({
    queryKey: ['penawaran', 'dashboard', parameter],
    queryFn: async () => (await fetch(`/api/dashboard?${parameter}`)).json(),
    placeholderData: keepPreviousData,
    refetchInterval: POLLING,
  });
  const { data: opsi } = useQuery<{ organisasi: string[]; area: string[]; kam: string[]; sales: string[] }>({
    queryKey: ['penawaran', 'opsi', 'arsip'],
    queryFn: async () => (await fetch('/api/penawaran?mode=opsi')).json(),
    staleTime: 5 * 60_000,
  });

  const total = URUTAN_STATUS.reduce((a, s) => a + (data?.kpi[s] ?? 0), 0);
  const tren = data?.tren[interval] ?? [];
  const pie = URUTAN_STATUS.map((s) => ({ status: s, jumlah: data?.kpi[s] ?? 0, fill: WARNA[s] })).filter((x) => x.jumlah > 0);
  const kartu = 'rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PilihBanyak items={opsi?.organisasi ?? []} value={f.organisasi} onChange={(v) => setF({ ...f, organisasi: v })} labelSemua="Semua organisasi" satuan="organisasi" className="w-48" />
        <PilihBanyak items={opsi?.area ?? []} value={f.area} onChange={(v) => setF({ ...f, area: v })} labelSemua="Semua area" satuan="area" className="w-40" />
        <PilihBanyak items={opsi?.kam ?? []} value={f.kam} onChange={(v) => setF({ ...f, kam: v })} labelSemua="Semua KAM" satuan="KAM" className="w-40" />
        <PilihBanyak items={opsi?.sales ?? []} value={f.sales} onChange={(v) => setF({ ...f, sales: v })} labelSemua="Semua sales" satuan="sales" className="w-40" />
        <Input type="date" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })} className="h-11 w-40" aria-label="Dari tanggal" />
        <Input type="date" value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} className="h-11 w-40" aria-label="Sampai tanggal" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className={kartu}>
          <p className="text-2xl font-semibold">{data ? total : '—'}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total penawaran</p>
        </div>
        {URUTAN_STATUS.map((s) => (
          <div key={s} className={kartu}>
            <p className="text-2xl font-semibold">{data ? (data.kpi[s] ?? 0) : '—'}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: WARNA[s] }} aria-hidden />{s}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={cn(kartu, 'min-w-0 lg:col-span-2')}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Tren pengajuan</h2>
              <p className="text-xs text-muted-foreground">
                {interval === 'minggu' ? '7 hari terakhir' : interval === 'bulan' ? data?.tren.bulanLabel : data?.tren.tahunLabel}
              </p>
            </div>
            <div className="flex gap-1 rounded-xl bg-secondary p-1">
              {INTERVAL.map((i) => (
                <Button key={i.k} size="sm" variant={interval === i.k ? 'default' : 'ghost'} className="h-8" onClick={() => setRentang(i.k)}>{i.l}</Button>
              ))}
            </div>
          </div>
          <ChartContainer config={configTren} className="h-64 w-full">
            <BarChart data={tren} margin={{ top: 22, left: 0, right: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={interval === 'bulan' ? 2 : 0} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="jumlah" radius={6} fill="var(--color-jumlah)">
                {/* Angka di atas batang; batang 0 tanpa label (seperti dashboard lama). */}
                <LabelList dataKey="jumlah" position="top" fontSize={11} fontWeight={700}
                  formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')} />
                {tren.map((t) => <Cell key={t.label} fillOpacity={t.jumlah > 0 ? 1 : 0.25} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>

        <section className={cn(kartu, 'min-w-0')}>
          <h2 className="text-sm font-semibold">Distribusi status</h2>
          <ChartContainer config={configStatus} className="mx-auto h-56 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
              <Pie data={pie} dataKey="jumlah" nameKey="status" innerRadius="58%" outerRadius="90%" strokeWidth={0}>
                {pie.map((d) => <Cell key={d.status} fill={d.fill} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {URUTAN_STATUS.map((s) => (
              <li key={s} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: WARNA[s] }} />{s}
                <span className="ml-auto font-medium">{data?.kpi[s] ?? 0}</span></li>
            ))}
          </ul>
        </section>
      </div>

      <section className={kartu}>
        <h2 className="mb-3 text-sm font-semibold">Pengajuan terbaru</h2>
        <ul className="divide-y divide-border">
          {data?.terbaru.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setDetail(r.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-secondary/40">
                <span className="hidden w-36 shrink-0 text-xs font-semibold sm:block">{r.nomor}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold sm:hidden">{r.nomor}</span>
                  <span className="block truncate text-sm">{r.namaProyek || '-'}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.perusahaan || '-'} · {r.tanggal}</span>
                </span>
                <BadgeStatus status={r.status} />
              </button>
            </li>
          ))}
          {data && !data.terbaru.length && <li className="py-8 text-center text-sm text-muted-foreground">Belum ada data pengajuan.</li>}
        </ul>
      </section>

      {detail && <DetailDialog id={detail} admin={admin} onClose={() => setDetail(null)} />}
    </div>
  );
}
