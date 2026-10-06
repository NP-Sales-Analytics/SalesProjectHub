import { Segera } from '@/components/shared/segera';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ApprovalEstimatorPage() {
  await requireHalaman('/estimator/approval');
  return <Segera judul="Approval Estimator" tahap={5} />;
}
