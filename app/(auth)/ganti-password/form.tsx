'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_MIN } from '@/lib/password-aturan';
import { gantiPassword } from './actions';

export function FormGantiPassword() {
  const [error, action, pending] = useActionState(gantiPassword, null);
  return (
    <form action={action} className="mt-5 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Password baru</Label>
        <Input id="password" name="password" type="password" required minLength={PASSWORD_MIN}
          autoComplete="new-password" className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ulang">Ulangi password baru</Label>
        <Input id="ulang" name="ulang" type="password" required minLength={PASSWORD_MIN}
          autoComplete="new-password" className="h-11" />
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? 'Menyimpan...' : 'Simpan password'}
      </Button>
    </form>
  );
}
