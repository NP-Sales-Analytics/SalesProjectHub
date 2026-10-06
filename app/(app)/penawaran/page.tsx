import { Segera } from '@/components/shared/segera';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DokumenPenawaranPage() {
  await requireHalaman('/penawaran');
  return <Segera judul="Dokumen Penawaran" tahap={4} />;
}
