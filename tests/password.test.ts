import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

// Vektor uji dibangun ulang dari algoritma Kode.js lama (_hashUserPassword /
// _verifyUserPassword), bukan dari lib/password.ts, supaya test ini benar-benar
// membuktikan kompatibilitas.
const PEPPER = 'pepper-uji';
const hmacLama = (salt: string, pw: string) =>
  `hmac256$${salt}$${createHmac('sha256', PEPPER).update(`${salt}:${pw}`).digest('hex')}`;
const sha256Lama = (salt: string, pw: string) =>
  `sha256$${salt}$${createHash('sha256').update(`${salt}:${pw}`).digest('hex')}`;

describe('password', () => {
  it('scrypt: hash baru bisa diverifikasi, salah password ditolak, salt acak', async () => {
    const h = await hashPassword('Rahasia#123');
    expect(h.startsWith('scrypt$16384$8$1$')).toBe(true);
    expect(await verifyPassword('Rahasia#123', h)).toEqual({ cocok: true, perluRehash: false });
    expect((await verifyPassword('rahasia#123', h)).cocok).toBe(false);
    expect(await hashPassword('Rahasia#123')).not.toBe(h);
  });

  it('hmac256$ lama: cocok dengan pepper dan minta rehash', async () => {
    process.env.LEGACY_PASSWORD_PEPPER = PEPPER;
    const stored = hmacLama('0f1e2d3c4b5a69788796a5b4c3d2e1f0', 'PDS_541');
    expect(await verifyPassword('PDS_541', stored)).toEqual({ cocok: true, perluRehash: true });
    expect((await verifyPassword('PDS_542', stored)).cocok).toBe(false);
  });

  it('hmac256$ lama: tanpa pepper selalu gagal (tidak menebak)', async () => {
    delete process.env.LEGACY_PASSWORD_PEPPER;
    expect((await verifyPassword('PDS_541', hmacLama('abc', 'PDS_541'))).cocok).toBe(false);
  });

  it('sha256$ lama: cocok dan minta rehash', async () => {
    const stored = sha256Lama('garam', 'Nippon!2026');
    expect(await verifyPassword('Nippon!2026', stored)).toEqual({ cocok: true, perluRehash: true });
    expect((await verifyPassword('nippon!2026', stored)).cocok).toBe(false);
  });

  it('plaintext / kosong / format rusak tidak pernah cocok', async () => {
    expect((await verifyPassword('abc', 'abc')).cocok).toBe(false);
    expect((await verifyPassword('abc', null)).cocok).toBe(false);
    expect((await verifyPassword('abc', 'hmac256$$')).cocok).toBe(false);
    expect((await verifyPassword('abc', 'scrypt$1$2$3')).cocok).toBe(false);
  });
});
