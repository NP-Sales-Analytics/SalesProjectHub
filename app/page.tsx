import { Brand } from '@/components/shared/brand';

// Sementara (tahap scaffold): diganti redirect per role setelah auth ada (tahap 3).
export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="space-y-3 text-center">
        <Brand size="lg" className="justify-center" />
        <p className="text-sm text-muted-foreground">Sales Hub versi Next.js sedang dalam migrasi.</p>
      </div>
    </main>
  );
}
