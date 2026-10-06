'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';

/**
 * Judul diambil dari rute, bukan dikirim tiap halaman.
 *
 * Header ini hidup di layout supaya bisa menempel saat digulung, sementara
 * page.tsx adalah server component yang di-render di dalamnya - mengoper judul
 * ke atas butuh context atau portal, sedangkan pemetaan rute sudah cukup dan
 * tetap satu sumber kebenaran dengan label di sidebar.
 */
const JUDUL: { awalan: string; judul: string; keterangan: string }[] = [
  { awalan: '/dashboard', judul: 'Dashboard', keterangan: 'Ringkasan status dan tren pengajuan penawaran.' },
  { awalan: '/penawaran/baru', judul: 'Buat Penawaran', keterangan: 'Ajukan penawaran proyek baru.' },
  { awalan: '/penawaran/approval', judul: 'Approval Center', keterangan: 'Penawaran yang menunggu keputusan Anda.' },
  { awalan: '/penawaran', judul: 'Dokumen Penawaran', keterangan: 'Seluruh dokumen penawaran sesuai cakupan akses Anda.' },
  { awalan: '/estimator/baru', judul: 'Buat Estimasi', keterangan: 'Susun estimasi biaya proyek.' },
  { awalan: '/estimator/approval', judul: 'Approval Estimator', keterangan: 'Estimasi yang menunggu keputusan Anda.' },
  { awalan: '/estimator', judul: 'Dokumen Estimator', keterangan: 'Seluruh estimasi sesuai cakupan akses Anda.' },
  { awalan: '/admin/users', judul: 'User Management', keterangan: 'Kelola akun, role, akses halaman, area, dan organisasi.' },
  { awalan: '/admin/area', judul: 'Area Management', keterangan: 'Area, singkatan nomor dokumen, dan routing email approval.' },
];

export function AppHeader() {
  const pathname = usePathname();
  // Yang terpanjang menang: '/admin/users' harus kalah-kan '/admin' seandainya
  // nanti ada halaman admin lain.
  const aktif = JUDUL
    .filter((j) => pathname === j.awalan || pathname.startsWith(j.awalan + '/'))
    .sort((a, b) => b.awalan.length - a.awalan.length)[0];

  return (
    // h-[68px] menyamai tinggi header sidebar, sehingga garis bawah keduanya
    // menyambung jadi satu garis lurus di desktop.
    //
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:h-[68px] md:px-6">
      {/* Hanya di HP: sidebar tersembunyi jadi drawer, tombolnya di sini. */}
      <SidebarTrigger className="size-10 shrink-0 md:hidden" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight tracking-tight md:text-lg">
          {aktif?.judul ?? 'Sales Hub'}
        </h1>
        {/* Keterangan disembunyikan di HP: tinggi header dua baris memakan
            ruang daftar yang justru jadi isi utama halaman. */}
        {aktif?.keterangan && (
          <p className="mt-0.5 hidden truncate text-xs text-muted-foreground md:block">
            {aktif.keterangan}
          </p>
        )}
      </div>
    </header>
  );
}
