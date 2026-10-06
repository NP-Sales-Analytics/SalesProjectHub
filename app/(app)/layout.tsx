import { AppHeader } from '@/components/shared/app-header';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { QueryProvider } from '@/components/shared/query-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { requireUser } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Otorisasi per halaman tetap di page.tsx masing-masing (requireHalaman).
  const user = await requireUser();

  return (
    // key={user.id}: user berikutnya di browser yang sama tidak mewarisi cache
    // React Query milik user sebelumnya (data sudah disaring cakupan).
    <QueryProvider key={user.id}>
      <TooltipProvider>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar user={{ namaLengkap: user.namaLengkap, email: user.email, role: user.role, halaman: user.halaman }} />
          <SidebarInset className="min-w-0 bg-background">
            <AppHeader />
            <div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </QueryProvider>
  );
}
