import { NextResponse } from 'next/server';
import { prosesAntrean } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

// Penyapu antrean job (Vercel Cron mengirim header Authorization: Bearer <CRON_SECRET>).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Tidak berhak' }, { status: 401 });
  }
  return NextResponse.json({ hasil: await prosesAntrean() });
}
