import { Segera } from '@/components/shared/segera';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ApprovalCenterPage() {
  await requireHalaman('/penawaran/approval');
  return <Segera judul="Approval Center" tahap={4} />;
}
