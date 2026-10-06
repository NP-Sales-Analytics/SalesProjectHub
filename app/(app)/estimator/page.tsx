import { Segera } from '@/components/shared/segera';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DokumenEstimatorPage() {
  await requireHalaman('/estimator');
  return <Segera judul="Dokumen Estimator" tahap={5} />;
}
