import { NextResponse } from 'next/server';
import { requireHalamanApi } from '@/lib/auth';
import { daftarPenawaran, opsiFilter } from '@/lib/penawaran/service';
import { bacaFilter, bacaHalaman } from './_query';

export const dynamic = 'force-dynamic';

// Daftar penawaran ber-halaman, sudah disaring cakupan user di server.
// ?mode=opsi → pilihan filter. Dipakai Dokumen Penawaran & Approval Center.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const halaman = sp.get('sumber') === 'approval' ? '/penawaran/approval' : '/penawaran';
  const user = await requireHalamanApi(halaman);
  if (user instanceof NextResponse) return user;
  if (sp.get('mode') === 'opsi') return NextResponse.json(await opsiFilter(user));
  const filter = bacaFilter(sp);
  if (halaman === '/penawaran/approval') filter.status = ['Pending Approve'];
  return NextResponse.json(await daftarPenawaran(user, filter, bacaHalaman(sp)));
}
