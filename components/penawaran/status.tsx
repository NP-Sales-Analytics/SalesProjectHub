import { cn } from '@/lib/utils';

export const WARNA_STATUS: Record<string, string> = {
  'Pending Admin': 'bg-slate-100 text-slate-700',
  'Pending Approve': 'bg-blue-50 text-blue-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  'Approved (Revisi)': 'bg-amber-50 text-amber-800',
  Ditolak: 'bg-red-50 text-red-700',
};
export const URUTAN_STATUS = ['Pending Admin', 'Pending Approve', 'Approved', 'Approved (Revisi)', 'Ditolak'] as const;

export function BadgeStatus({ status, className }: { status: string | null; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
      WARNA_STATUS[status ?? ''] ?? 'bg-secondary text-muted-foreground', className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {status ?? '-'}
    </span>
  );
}
