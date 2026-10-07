import { DaftarPenawaran } from '@/components/penawaran/daftar-penawaran';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ApprovalCenterPage() {
  const user = await requireHalaman('/penawaran/approval');
  return (
    <div className="mx-auto w-full max-w-7xl">
      <DaftarPenawaran mode="approval" admin={user.role === 'super admin' || user.role === 'admin'} />
    </div>
  );
}
