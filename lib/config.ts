import { db } from '@/lib/db';
import { appConfig } from '@/lib/db/schema';
import { ttlCache } from '@/lib/ttl-cache';

/**
 * Kunci app_config yang dipakai aplikasi. Nilainya diisi saat deploy (bukan di repo):
 * ID template Google Docs, folder output PDF, file logo tanda tangan email, dan
 * HTML tanda tangan email (berisi data pribadi — repo ini publik).
 */
export const KUNCI_CONFIG = {
  folderOutputPdf: 'pdf_folder_output_id',
  logoTandaTangan: 'email_logo_file_id',
  tandaTanganHtml: 'email_tanda_tangan_html',
  /** template_<grupKam 1..4>_<grupOrg jawa|sumatera|safl> */
  template: (grupKam: number, grupOrg: string) => `template_${grupKam}_${grupOrg}`,
} as const;

const cache = ttlCache(async () => {
  const rows = await db.select().from(appConfig);
  return new Map(rows.map((r) => [r.kunci, r.nilai]));
}, 60_000);

export async function bacaConfig(kunci: string): Promise<string | null> {
  return (await cache.get()).get(kunci)?.trim() || null;
}

export const lupakanConfig = () => cache.clear();
