import { NextResponse } from 'next/server';
import { requireHalamanApi } from '@/lib/auth';
import { ringkasanDashboard } from '@/lib/penawaran/service';
import { bacaFilter } from '../penawaran/_query';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireHalamanApi('/dashboard');
  if (user instanceof NextResponse) return user;
  return NextResponse.json(await ringkasanDashboard(user, bacaFilter(new URL(request.url).searchParams)));
}
