import { google } from 'googleapis';

// Akses Google Docs/Drive lewat service account (pengganti DocumentApp/DriveApp).
// GOOGLE_SERVICE_ACCOUNT_JSON = isi file JSON kunci service account (satu baris).
// Service account harus diberi akses ke template, folder output (Shared Drive),
// dan file logo email.

let auth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

export function googleAuth() {
  if (auth) return auth;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON belum diset');
  auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents'],
  });
  return auth;
}

export const drive = () => google.drive({ version: 'v3', auth: googleAuth() });
export const docs = () => google.docs({ version: 'v1', auth: googleAuth() });

/** Unduh isi file Drive (mis. gambar logo tanda tangan email). */
export async function unduhFileDrive(fileId: string): Promise<{ nama: string; tipe: string; base64: string }> {
  const d = drive();
  const meta = await d.files.get({ fileId, fields: 'name, mimeType', supportsAllDrives: true });
  const isi = await d.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' });
  return {
    nama: meta.data.name ?? 'file',
    tipe: meta.data.mimeType ?? 'application/octet-stream',
    base64: Buffer.from(isi.data as ArrayBuffer).toString('base64'),
  };
}
