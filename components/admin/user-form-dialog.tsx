'use client';

import { Eye, EyeOff, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { aksiBuatUser, aksiUbahUser } from '@/app/(app)/admin/users/actions';
import { DaftarCentang } from '@/components/admin/daftar-centang';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HALAMAN, halamanDefault, ROLE_FORM } from '@/lib/access';
import type { BarisUser } from '@/lib/admin/users';
import type { Role } from '@/lib/db/schema';
import { PASSWORD_MIN_AWAL } from '@/lib/password-aturan';

export const LABEL_ROLE: Record<Role, string> = {
  'super admin': 'Super Admin', admin: 'Admin', manager: 'Manager', 'manager admin': 'Manager Admin', sales: 'Sales',
};

export function UserFormDialog({
  row, open, onOpenChange, pilihan,
}: {
  row: BarisUser | null; // null = tambah
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pilihan: { area: string[]; organisasi: string[] };
}) {
  const edit = !!row;
  const [pending, start] = useTransition();
  const [role, setRole] = useState<Role>(row?.role ?? 'sales');
  const [aktif, setAktif] = useState(row?.isActive ?? true);
  // User tanpa setelan tersimpan: form menampilkan akses default role-nya.
  const [halaman, setHalaman] = useState<string[]>(row ? (row.aksesKustom ? row.halaman : halamanDefault(row.role)) : halamanDefault('sales'));
  const [area, setArea] = useState<string[]>(row?.area ?? []);
  const [organisasi, setOrganisasi] = useState<string[]>(row?.organisasi ?? []);
  const [lihat, setLihat] = useState(false);
  const superAdmin = role === 'super admin';

  const kirim = (fd: FormData) => start(async () => {
    const input = {
      namaLengkap: String(fd.get('namaLengkap') ?? ''),
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
      role, isActive: aktif, halaman, area, organisasi,
    };
    const hasil = edit ? await aksiUbahUser(row.id, input) : await aksiBuatUser(input);
    if (!hasil.ok) { toast.error(hasil.pesan); return; }
    toast.success(hasil.pesan);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}
        className="grid max-h-[90svh] max-w-xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <DialogTitle className="text-base">{edit ? 'Ubah User' : 'Tambah User'}</DialogTitle>
            <p className="text-xs text-muted-foreground">Login memakai nama lengkap atau email.</p>
          </div>
          <DialogClose aria-label="Tutup" className="grid size-9 place-items-center rounded-lg hover:bg-secondary">
            <X className="size-4" />
          </DialogClose>
        </header>

        <form id="user-form" className="min-h-0 space-y-4 overflow-y-auto px-5 py-5"
          // onSubmit, bukan action={}: React 19 mereset isian form setelah action selesai.
          onSubmit={(e) => { e.preventDefault(); kirim(new FormData(e.currentTarget)); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="u-nama">Nama Lengkap</Label>
              <Input id="u-nama" name="namaLengkap" defaultValue={row?.namaLengkap ?? ''} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" name="email" type="email" defaultValue={row?.email ?? ''} required className="h-11" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => {
                if (!v) return;
                setRole(v as Role);
                if (!edit) setHalaman(halamanDefault(v as Role));
              }}>
                <SelectTrigger className="h-11 w-full"><SelectValue>{LABEL_ROLE[role]}</SelectValue></SelectTrigger>
                <SelectContent>
                  {ROLE_FORM.map((r) => <SelectItem key={r} value={r}>{LABEL_ROLE[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-password">{edit ? 'Password baru (opsional)' : 'Password'}</Label>
              <div className="relative">
                <Input id="u-password" name="password" type={lihat ? 'text' : 'password'} required={!edit}
                  minLength={PASSWORD_MIN_AWAL} autoComplete="new-password" className="h-11 pr-11"
                  placeholder={edit ? 'Kosongkan bila tidak diganti' : `Minimal ${PASSWORD_MIN_AWAL} karakter`} />
                <button type="button" onClick={() => setLihat((v) => !v)} aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground">
                  {lihat ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3.5 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
            Akun aktif
          </label>

          <DaftarCentang judul="Akses Halaman" terkunci={superAdmin} catatan={superAdmin ? 'Super Admin selalu bisa membuka semua halaman' : undefined}
            pilihan={HALAMAN.map((h) => ({ nilai: h.href, label: h.label }))} terpilih={halaman} onChange={setHalaman} />
          <DaftarCentang judul="Akses Area" terkunci={superAdmin || role === 'sales'}
            catatan={superAdmin ? 'Semua area' : role === 'sales' ? 'Sales melihat data miliknya sendiri' : undefined}
            pilihan={pilihan.area.map((a) => ({ nilai: a, label: a }))} terpilih={area} onChange={setArea} />
          <DaftarCentang judul="Akses Organisasi" terkunci={superAdmin} catatan={superAdmin ? 'Semua organisasi' : undefined}
            pilihan={pilihan.organisasi.map((o) => ({ nilai: o, label: o }))} terpilih={organisasi} onChange={setOrganisasi} />
          {!edit && (
            <p className="text-xs text-muted-foreground">
              Setelah disimpan, email berisi kredensial login otomatis dikirim ke alamat email user. User wajib mengganti password saat login pertama.
            </p>
          )}
        </form>

        <footer className="flex gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={pending}>Batal</Button>
          <Button type="submit" form="user-form" className="h-11 flex-1" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan'}</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
