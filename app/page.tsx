import { redirect } from 'next/navigation';
import { getSessionUser, halamanAwal } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.wajibGantiPassword) redirect('/ganti-password');
  redirect(halamanAwal(user));
}
