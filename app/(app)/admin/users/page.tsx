import { UserTable } from '@/components/admin/user-table';
import { daftarUser, pilihanAkses } from '@/lib/admin/users';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const me = await requireHalaman('/admin/users');
  const [rows, pilihan] = await Promise.all([daftarUser(), pilihanAkses()]);
  return (
    <div className="mx-auto w-full max-w-7xl">
      <UserTable rows={rows} currentUserId={me.id} pilihan={pilihan} />
    </div>
  );
}
