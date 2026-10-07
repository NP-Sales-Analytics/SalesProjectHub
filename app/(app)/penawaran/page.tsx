import { DaftarPenawaran } from '@/components/penawaran/daftar-penawaran';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DokumenPenawaranPage() {
  const user = await requireHalaman('/penawaran');
  return (
    <div className="mx-auto w-full max-w-7xl">
      <DaftarPenawaran mode="arsip" admin={user.role === 'super admin' || user.role === 'admin'} />
    </div>
  );
}
