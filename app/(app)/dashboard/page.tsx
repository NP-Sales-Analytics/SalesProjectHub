import { Segera } from '@/components/shared/segera';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requireHalaman('/dashboard');
  return <Segera judul="Dashboard" tahap={4} />;
}
