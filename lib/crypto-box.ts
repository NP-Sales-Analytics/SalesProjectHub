import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Enkripsi simetris untuk nilai rahasia yang harus menunggu di tabel jobs
// (mis. password awal di email akun baru). Kunci diturunkan dari AUTH_SECRET.

function kunci() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET belum diset');
  return createHash('sha256').update(`saleshub-jobs:${secret}`).digest();
}

export function segel(teks: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', kunci(), iv);
  const data = Buffer.concat([cipher.update(teks, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function bukaSegel(tersegel: string): string {
  const [iv, tag, data] = tersegel.split('.').map((b) => Buffer.from(b, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', kunci(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
