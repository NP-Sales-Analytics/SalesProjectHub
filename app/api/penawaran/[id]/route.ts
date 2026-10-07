import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { detailPenawaran, GalatPenawaran } from '@/lib/penawaran/service';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.wajibGantiPassword) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  try {
    return NextResponse.json(await detailPenawaran(user, (await params).id));
  } catch (err) {
    if (err instanceof GalatPenawaran) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
