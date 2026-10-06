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

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm test` | Vitest. Test database berjalan bila `TEST_DATABASE_URL` diset (database yang sudah dimigrasi). |
| `npm run db:migrate` | Terapkan migrasi SQL yang belum tercatat di `schema_migrations` |

## Environment variables
Lihat [`.env.example`](.env.example). **Repo ini publik** — jangan pernah commit `.env*`,
kredensial, ekspor data, atau screenshot berisi data asli.
