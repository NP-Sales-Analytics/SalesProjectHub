import { AreaTable } from '@/components/admin/area-table';
import { daftarArea } from '@/lib/admin/area';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AreaPage() {
  await requireHalaman('/admin/area');
  return (
    <div className="mx-auto w-full max-w-7xl">
      <AreaTable rows={await daftarArea()} />
    </div>
  );
}
