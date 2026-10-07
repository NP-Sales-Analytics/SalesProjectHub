import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { detailPenawaran, GalatPenawaran } from '@/lib/penawaran/service';

export const dynamic = 'force-dynamic';

// Buka PDF penawaran (pengganti getPdfUrlById): cakupan dicek dulu, lalu dialihkan ke Drive.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.wajibGantiPassword) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  try {
    const p = await detailPenawaran(user, (await params).id);
    if (!p.pdfUrl) return NextResponse.json({ error: `PDF untuk ${p.nomor} belum tersedia.` }, { status: 404 });
    return NextResponse.redirect(p.pdfUrl);
  } catch (err) {
    if (err instanceof GalatPenawaran) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
