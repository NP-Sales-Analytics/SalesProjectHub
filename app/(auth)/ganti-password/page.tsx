import { redirect } from 'next/navigation';
import { Brand } from '@/components/shared/brand';
import { getSessionUser } from '@/lib/auth';
import { FormGantiPassword } from './form';

export const dynamic = 'force-dynamic';

export default async function GantiPasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4">
      <Brand size="lg" />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h1 className="text-lg font-semibold">Buat password baru</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.wajibGantiPassword
            ? 'Demi keamanan, akun Anda wajib memakai password baru sebelum melanjutkan.'
            : 'Ganti password akun Anda.'}
        </p>
        <FormGantiPassword />
      </div>
    </main>
  );
}
