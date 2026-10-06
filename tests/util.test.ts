import { describe, expect, it } from 'vitest';
import { nomorHalaman, potongHalaman } from '@/lib/pagination';
import { bukaSegel, segel } from '@/lib/crypto-box';
import { rapikanEmail } from '@/lib/email/graph';
import { emailAkunBaru } from '@/lib/email/templat';

process.env.AUTH_SECRET = 'rahasia-uji';

describe('crypto-box', () => {
  it('bolak-balik, acak tiap kali, dan menolak data yang diubah', () => {
    const a = segel('PDS_541&<x>');
    expect(bukaSegel(a)).toBe('PDS_541&<x>');
    expect(segel('PDS_541&<x>')).not.toBe(a);
    const [iv, tag, data] = a.split('.');
    expect(() => bukaSegel([iv, tag, data.slice(0, -2) + 'AA'].join('.'))).toThrow();
  });
});

describe('email', () => {
  it('rapikanEmail: pecah koma/titik koma, dedup tak peka huruf besar, buang pengecualian', () => {
    expect(rapikanEmail(['a@x.co; B@x.co', 'b@X.co', null, ' c@x.co ,', 'to@x.co'], ['TO@x.co']))
      .toEqual(['a@x.co', 'B@x.co', 'c@x.co']);
  });

  it('emailAkunBaru: subjek & isi sesuai sistem lama, input di-escape', () => {
    const e = emailAkunBaru({
      namaLengkap: 'Esti <Ariamy>', email: 'esti@x.co', password: 'P&S_541', urlAplikasi: 'https://saleshub.example',
      tandaTanganHtml: '<p>TTD</p>', adaLogo: true,
    });
    expect(e.subject).toBe('Akun SalesHub - Esti <Ariamy>');
    expect(e.html).toContain('Dear Esti &lt;Ariamy&gt;');
    expect(e.html).toContain('P&amp;S_541');
    expect(e.html).toContain('https://saleshub.example');
    expect(e.html).toContain('<p>TTD</p>');
    expect(e.html).toContain('cid:logo_ttd');
    expect(emailAkunBaru({ ...{ namaLengkap: 'A', email: 'a@x.co', password: 'p', urlAplikasi: 'u' }, tandaTanganHtml: null, adaLogo: false }).html)
      .not.toContain('cid:');
  });
});

describe('pagination', () => {
  it('potongHalaman meng-clamp halaman', () => {
    expect(potongHalaman(23, 9, 10)).toEqual({ aktif: 3, totalHalaman: 3, mulai: 20, akhir: 23 });
    expect(potongHalaman(0, 1, 10)).toEqual({ aktif: 1, totalHalaman: 1, mulai: 0, akhir: 0 });
  });

  it('nomorHalaman: jendela 5 dengan elipsis (model Dokumen Penawaran)', () => {
    expect(nomorHalaman(1, 3)).toEqual([1, 2, 3]);
    expect(nomorHalaman(6, 12)).toEqual([1, '…', 4, 5, 6, 7, 8, '…', 12]);
    expect(nomorHalaman(12, 12)).toEqual([1, '…', 8, 9, 10, 11, 12]);
  });
});
