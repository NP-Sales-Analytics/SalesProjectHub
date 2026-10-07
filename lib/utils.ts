import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Inisial dari sebuah nama, maksimal dua huruf (prefiks PT/CV dibuang). */
export function inisial(nama: string) {
  return (
    nama
      .replace(/^(PT|CV)[.\s]+/i, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  );
}

/**
 * DATETIME dari `db.execute` mentah datang sebagai teks tanpa zona
 * ("2026-10-03 12:57:01.000") yang isinya UTC. `new Date(teks)` membacanya
 * sebagai jam lokal server, jadi di mesin ber-zona WIB bergeser 7 jam.
 */
export function isoUtc(value: unknown) {
  if (value == null) return null;
  return (value instanceof Date ? value : new Date(`${String(value).replace(' ', 'T')}Z`)).toISOString();
}
