'use client';

import { Pencil, Plus, Search } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { aksiSetAktif } from '@/app/(app)/admin/users/actions';
import { LABEL_ROLE, UserFormDialog } from '@/components/admin/user-form-dialog';
import { PaginationAtas, PaginationBawah, potongHalaman } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { halamanDefault } from '@/lib/access';
import type { BarisUser } from '@/lib/admin/users';
import type { Role } from '@/lib/db/schema';
import { cn, inisial } from '@/lib/utils';

const WARNA_ROLE: Record<Role, string> = {
  'super admin': 'bg-violet-100 text-violet-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-amber-100 text-amber-700',
  'manager admin': 'bg-amber-100 text-amber-700',
  sales: 'bg-emerald-100 text-emerald-700',
};

function aksesData(u: BarisUser) {
  if (u.role === 'super admin') return 'Semua area';
  if (u.role === 'sales') return 'Data sendiri';
  return `${u.area.length} area${u.aksesKustom ? '' : ' (default)'}`;
}

export function UserTable({ rows, currentUserId, pilihan }: {
  rows: BarisUser[];
  currentUserId: string;
  pilihan: { area: string[]; organisasi: string[] };
}) {
  const [cari, setCari] = useState('');
  const [role, setRole] = useState<Role | 'semua'>('semua');
  const [status, setStatus] = useState<'semua' | 'aktif' | 'nonaktif'>('semua');
  const [halaman, setHalaman] = useState(1);
  const [ukuran, setUkuran] = useState(10);
  const [form, setForm] = useState<{ row: BarisUser | null } | null>(null);
  const [pending, start] = useTransition();

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return rows.filter((u) =>
      (!q || [u.namaLengkap, u.username, u.email, u.role].join(' ').toLowerCase().includes(q)) &&
      (role === 'semua' || u.role === role) &&
      (status === 'semua' || u.isActive === (status === 'aktif')));
  }, [rows, cari, role, status]);
  const pg = potongHalaman(tersaring.length, halaman, ukuran);

  const toggleAktif = (u: BarisUser) => start(async () => {
    const hasil = await aksiSetAktif(u.id, !u.isActive);
    if (hasil.ok) toast.success(hasil.pesan); else toast.error(hasil.pesan);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={cari} onChange={(e) => { setCari(e.target.value); setHalaman(1); }}
            placeholder="Cari nama, email, atau role..." className="h-11 pl-10" aria-label="Cari user" />
        </div>
        <Select value={role} onValueChange={(v) => { if (v) { setRole(v as Role | 'semua'); setHalaman(1); } }}>
          <SelectTrigger className="h-11 w-44" aria-label="Filter role">
            <SelectValue>{role === 'semua' ? 'Semua role' : LABEL_ROLE[role]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua role</SelectItem>
            {(Object.keys(LABEL_ROLE) as Role[]).map((r) => <SelectItem key={r} value={r}>{LABEL_ROLE[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { if (v) { setStatus(v as typeof status); setHalaman(1); } }}>
          <SelectTrigger className="h-11 w-40" aria-label="Filter status">
            <SelectValue>{{ semua: 'Semua status', aktif: 'Aktif', nonaktif: 'Nonaktif' }[status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Button className="h-11 gap-2" onClick={() => setForm({ row: null })}>
          <Plus className="size-4" /> Tambah User
        </Button>
      </div>

      <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <PaginationAtas total={tersaring.length} mulai={pg.mulai} akhir={pg.akhir} ukuran={ukuran}
          onUkuran={(u) => { setUkuran(u); setHalaman(1); }} satuan="user" />
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[56rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="py-3 pl-4">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Akses Halaman</TableHead>
                <TableHead>Akses Data</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="pr-4 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tersaring.slice(pg.mulai, pg.akhir).map((u) => {
                const jumlahHalaman = u.role === 'super admin' ? 'Semua'
                  : `${(u.aksesKustom ? u.halaman : halamanDefault(u.role)).length} halaman`;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="py-3 pl-4">
                      <div className="flex items-center gap-3">
                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                          u.isActive ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')} aria-hidden>
                          {inisial(u.namaLengkap)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.namaLengkap}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={cn('border-0 capitalize', WARNA_ROLE[u.role])}>{LABEL_ROLE[u.role]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{jumlahHalaman}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{aksesData(u)}</TableCell>
                    <TableCell className="text-center">
                      <button type="button" disabled={pending || u.id === currentUserId} onClick={() => toggleAktif(u)}
                        title={u.id === currentUserId ? 'Akun Anda sendiri' : u.isActive ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                        className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium disabled:cursor-not-allowed',
                          u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary text-muted-foreground')}>
                        <span className={cn('size-1.5 rounded-full', u.isActive ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setForm({ row: u })}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!tersaring.length && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Tidak ada user yang sesuai.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationBawah total={tersaring.length} aktif={pg.aktif} totalHalaman={pg.totalHalaman} onHalaman={setHalaman} satuan="user" />
      </div>

      {form && (
        <UserFormDialog key={form.row?.id ?? 'baru'} row={form.row} open pilihan={pilihan}
          onOpenChange={(v) => { if (!v) setForm(null); }} />
      )}
    </div>
  );
}
