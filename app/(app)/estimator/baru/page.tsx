import { Segera } from '@/components/shared/segera';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function BuatEstimasiPage() {
  await requireHalaman('/estimator/baru');
  return <Segera judul="Buat Estimasi" tahap={5} />;
}
