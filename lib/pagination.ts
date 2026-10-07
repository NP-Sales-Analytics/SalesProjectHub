// Logika pagination murni (dipakai komponen & test).

export const UKURAN_HALAMAN = [10, 50, 100] as const;

/** Halaman yang sudah di-clamp + rentang slice untuk data di klien. */
export function potongHalaman(total: number, halaman: number, ukuran: number) {
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const aktif = Math.min(Math.max(1, halaman), totalHalaman);
  const mulai = (aktif - 1) * ukuran;
  return { aktif, totalHalaman, mulai, akhir: Math.min(mulai + ukuran, total) };
}

/** Nomor halaman yang ditampilkan: jendela 5 + halaman pertama/terakhir dengan elipsis. */
export function nomorHalaman(aktif: number, totalHalaman: number): (number | '…')[] {
  let awal = Math.max(1, aktif - 2);
  const akhir = Math.min(totalHalaman, awal + 4);
  awal = Math.max(1, akhir - 4);
  const hasil: (number | '…')[] = [];
  if (awal > 1) hasil.push(1, ...(awal > 2 ? ['…' as const] : []));
  for (let p = awal; p <= akhir; p++) hasil.push(p);
  if (akhir < totalHalaman) hasil.push(...(akhir < totalHalaman - 1 ? ['…' as const] : []), totalHalaman);
  return hasil;
}
