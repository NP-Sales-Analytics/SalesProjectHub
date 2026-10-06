import { Segera } from '@/components/shared/segera';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function BuatPenawaranPage() {
  await requireHalaman('/penawaran/baru');
  return <Segera judul="Buat Penawaran" tahap={4} />;
}
