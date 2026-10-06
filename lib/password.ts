import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';

// scrypt bawaan node:crypto (tanpa dependensi). Parameter disimpan di dalam hash
// supaya bisa dinaikkan nanti tanpa mematahkan hash lama.
const N = 16384;
const R = 8;
const P = 1;
const PANJANG = 64;

function scrypt(password: string, salt: Buffer, n = N, r = R, p = P): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, PANJANG, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key)),
  );
}

function samaPersis(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Hash baru: `scrypt$N$r$p$<salt base64url>$<hash base64url>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export type HasilVerifikasi = { cocok: boolean; perluRehash: boolean };

/**
 * Menerima hash baru (scrypt) dan dua format Sales Hub lama, yang di-rehash ke scrypt
 * saat login berhasil:
 *  - `hmac256$<salt>$<hex>` = HMAC-SHA256(key = LEGACY_PASSWORD_PEPPER, pesan = `salt:password`)
 *  - `sha256$<salt>$<hex>`  = SHA-256(`salt:password`)
 * Password plaintext lama TIDAK pernah dibandingkan apa adanya: saat migrasi data ia
 * di-hash ke scrypt dan user ditandai wajib ganti password.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<HasilVerifikasi> {
  const gagal = { cocok: false, perluRehash: false };
  if (!stored) return gagal;
  const parts = stored.split('$');

  if (parts[0] === 'scrypt' && parts.length === 6) {
    const [, n, r, p, salt, hash] = parts;
    const key = await scrypt(password, Buffer.from(salt, 'base64url'), Number(n), Number(r), Number(p));
    const cocok = samaPersis(key.toString('base64url'), hash);
    return { cocok, perluRehash: cocok && (Number(n) !== N || Number(r) !== R || Number(p) !== P) };
  }

  if (parts[0] === 'hmac256' && parts.length === 3 && parts[1] && parts[2]) {
    const pepper = process.env.LEGACY_PASSWORD_PEPPER;
    if (!pepper) return gagal;
    const hex = createHmac('sha256', pepper).update(`${parts[1]}:${password}`, 'utf8').digest('hex');
    const cocok = samaPersis(hex, parts[2]);
    return { cocok, perluRehash: cocok };
  }

  if (parts[0] === 'sha256' && parts.length === 3 && parts[1] && parts[2]) {
    const hex = createHash('sha256').update(`${parts[1]}:${password}`, 'utf8').digest('hex');
    const cocok = samaPersis(hex, parts[2]);
    return { cocok, perluRehash: cocok };
  }

  return gagal;
}

export { PASSWORD_MIN } from '@/lib/password-aturan';
