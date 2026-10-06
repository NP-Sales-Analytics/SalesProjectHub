# Sales Hub (Next.js + MySQL)

Migrasi Sales Hub Nippon Paint — penawaran proyek dan estimator cost — dari Google Apps Script
+ Supabase ke Next.js + MySQL, mengikuti stack dan pola Dealer Nite.

> Status: **dalam migrasi** di branch `migrate/nextjs-mysql`. Aplikasi lama (Apps Script) masih
> menjadi sistem produksi. Dokumentasi migrasi: [`docs/migrasi/`](docs/migrasi/).

## Stack
Next.js 15.5 (App Router) · React 19.1 · TypeScript strict · MySQL 8 + Drizzle ORM (`mysql2`) ·
Tailwind CSS 4 + shadcn (base-nova) · React Query · zod · Vitest · deploy Vercel `sin1`.

## Menjalankan secara lokal
```bash
npm install
cp .env.example .env.local   # isi DATABASE_URL dan AUTH_SECRET
npm run db:migrate           # terapkan mysql/migrations/*.sql
npm run dev                  # http://localhost:3000
```
`npm run db:migrate` membaca `.env.local` otomatis. Migrasi DDL MySQL tidak bisa di-rollback,
jadi **backup dulu** sebelum menjalankannya di production, dan gunakan akun ber-hak DDL yang
terpisah dari akun runtime aplikasi.

Akun pertama: isi `BOOTSTRAP_ADMIN_*` lalu `npm run bootstrap:admin`. Untuk pengembangan,
`npm run seed:dev` mengisi data contoh (menolak berjalan di database yang namanya tidak
mengandung `dev`/`test`; semua email contoh memakai `@example.com`).

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm test` | Vitest. Test database berjalan bila `TEST_DATABASE_URL` diset (database yang sudah dimigrasi). |
| `npm run db:migrate` | Terapkan migrasi SQL yang belum tercatat di `schema_migrations` |
| `npm run bootstrap:admin` | Buat / pulihkan Super Admin dari env `BOOTSTRAP_ADMIN_*` |
| `npm run seed:dev` | Data contoh untuk database dev/test |

## Role dan akses
| Role | Halaman bawaan | Data penawaran yang terlihat |
|---|---|---|
| Super Admin | Semua + User Management + Area Management | Semua |
| Admin | Semua + Area Management | Area ∈ akses area **dan** organisasi ∈ akses organisasi |
| Manager | Semua | Sama dengan Admin |
| Manager Admin (legacy) | Semua kecuali halaman approval | Sama dengan Admin |
| Sales | Semua kecuali halaman approval | Hanya pasangan (organisasi, nama sales) miliknya di master Sales |

- **Akses default:** user tanpa setelan tersimpan mendapat akses default role.
  - Manager: area yang kolom email approval-nya memuat emailnya, dan organisasi yang manager-nya dia.
  - Admin: semua.
  - Sales: organisasi dari master Sales.
- **Akses kustom:** menyimpan user di User Management menjadikan aksesnya persis seperti yang dipilih.
- **Penegakan:** semua aturan diperiksa di server — halaman lewat `requireHalaman`, aksi lewat `wajibRole` / `wajibHalaman`, data lewat `lib/cakupan.ts`.
- **Kecepatan berlaku:** penonaktifan akun atau perubahan role berlaku paling lambat 15 detik.

## Pekerjaan latar (PDF & email)
Pekerjaan lambat masuk tabel `jobs`:
- **Pemrosesan:** langsung setelah respons dikirim (`after()`), lalu disapu `GET /api/cron/jobs` dengan header `Authorization: Bearer $CRON_SECRET`.
- **Retry:** maksimal 3 percobaan. Job baru dianggap selesai bila benar-benar berhasil.
- **Password di payload:** password awal di email akun baru disimpan terenkripsi, dan dihapus dari payload setelah email terkirim.

## Environment variables
Lihat [`.env.example`](.env.example). **Repo ini publik** — jangan pernah commit `.env*`,
kredensial, ekspor data, atau screenshot berisi data asli.
