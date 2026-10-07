import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import { appConfig } from '@/lib/db/schema';

// Isi / perbarui tabel app_config dari file JSON di LUAR repo (berisi ID Google &
// tanda tangan email — tidak boleh di-commit karena repo publik).
//   npm run config:isi -- D:/rahasia/saleshub-config.json
// Format: { "pdf_folder_output_id": "...", "template_1_jawa": "...", ... }

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Pakai: npm run config:isi -- <path ke file JSON>');
  const isi = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  const pasangan = Object.entries(isi).filter(([, v]) => typeof v === 'string' && v.trim());
  for (const [kunci, nilai] of pasangan) {
    await db.insert(appConfig).values({ kunci, nilai: String(nilai) })
      .onDuplicateKeyUpdate({ set: { nilai: sql`values(nilai)` } });
  }
  console.log(`app_config diperbarui: ${pasangan.map(([k]) => k).join(', ')}`);
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exitCode = 1; })
  .finally(() => mysqlPool.end());
