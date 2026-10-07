import { Dashboard } from '@/components/penawaran/dashboard';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireHalaman('/dashboard');
  return (
    <div className="mx-auto w-full max-w-7xl">
      <Dashboard admin={user.role === 'super admin' || user.role === 'admin'} />
    </div>
  );
}
