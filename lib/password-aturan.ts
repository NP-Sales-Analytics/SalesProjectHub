// Aturan password yang juga dipakai komponen klien (lib/password.ts memakai node:crypto,
// jadi tidak boleh diimpor dari klien).

/** Password yang dipilih user sendiri (halaman ganti password). */
export const PASSWORD_MIN = 8;
/**
 * Password awal yang diisi Admin (user baru / reset): pola lama boleh dipakai (mis. PDS_541),
 * karena user WAJIB menggantinya saat login pertama.
 */
export const PASSWORD_MIN_AWAL = 4;
