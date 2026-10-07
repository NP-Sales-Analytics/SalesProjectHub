# 01 — Skema MySQL & pemetaan dari Supabase

Skema ada di `mysql/migrations/0001_init.sql` (sumber kebenaran) dan dicerminkan oleh
`lib/db/schema/*` (Drizzle). `tests/mysql-schema.test.ts` memastikan keduanya identik,
sampai tingkat kolom dan nullability, terhadap database yang sudah dimigrasi.

## Konvensi
- **Engine:** InnoDB, `utf8mb4_unicode_ci`.
- **ID & nama:** ID `varchar(36)` UUID dibuat aplikasi; nama kolom snake_case.
- **Waktu:** `datetime(3)` **UTC**, ditampilkan WIB di aplikasi. Tanggal dokumen memakai `date`.
- **Angka:** uang `bigint` rupiah (data lama tidak punya nilai desimal); persen `decimal(12,2)`; quantity `decimal(18,2)`.
- **Teks:** kosong → `NULL`, kecuali kolom kunci kombinasi produk (`''`).
- **Konversi tipe saat migrasi data (tahap 6):** baris yang gagal dikonversi dilaporkan, tidak ditebak.
  - teks angka → angka
  - `Tanggal` `dd MMM yyyy` → `date`
  - `Timestamp` `dd/MM/yyyy HH:mm:ss` (WIB) → `datetime` UTC

## Pemetaan tabel

| Supabase (lama) | MySQL (baru) | Catatan |
|---|---|---|
| `ORGANISASI` | `organisasi` | `nama_organisasi`→`nama`, `manager_organisasi`→`manager_email`, `Singkatan (3 Huruf)`→`singkatan`. **Baru:** `kategori` (reguler/spec/safl) menggantikan konstanta `SPEC_PROJECT_ORGS`/`SAFL_PROJECT_ORGS` di kode. |
| `AREA` | `area` | `Area`→`nama`, `Singkatan`→`singkatan`, `area_sort`→`urutan`; kolom `email_*`, `cc_pdf*`, `dear_email*` tetap. |
| `KAM` | `kam` | `KAM`→`nama`, `manager_kam`→`manager`, `email_kam`→`email`, `email_kam_spec`→`email_spec`. |
| `SALES` | `sales` + `sales_organisasi` | `nama_sales`→`nama`, `Email`→`email`, `area`, `SAP Code/Field Force`→`sap_code`, `Manager`→`manager`, `No.`→`no_urut`. Kolom `organisasi` (bisa beberapa nilai dipisah koma; 9 sales) dipecah ke tabel relasi `sales_organisasi`. |
| `PRODUK` | `produk` | `nama_produk`→`nama`, `FP-1..4`→`fp1..fp4`, `SG`, `DFT`, `Coverage`, `harga_default`, `Harga Retail (exc. PPN)`→`harga_retail`, `Theoritical Coverage`→`coverage_teoritis`, `Satuan`. Unik per (nama, jenis_rm, warna, kemasan); data lama 0 duplikat. |
| `ESTIMATOR` | `material_estimator` | `Matl Group`, `Material Group Name`→`matl_group_nama`, `Material` (unik), `Material Description`→`deskripsi`, `MvAvgPrice`/`PlndPrice1`/`PlndPrice2`, `ASP 2025/2026`. |
| `USER` + Script Properties `UM_USER_V1_*` | `users` + `user_page_access` / `user_area_access` / `user_organization_access` | `username` (lowercase), `nama_lengkap`, `email`, `role`, `password`→`password_hash`. Setelan JSON per user dipecah ke tabel akses; `akses_kustom = true` bila user punya setelan tersimpan (selain itu akses mengikuti default role, sama dengan perilaku lama). `is_active` dari setelan. |
| `PENAWARAN` (1 baris per item, header berulang) | `penawaran` + `penawaran_item` | Dinormalisasi: header diambil dari baris item mana pun dengan ID yang sama (`ID Penawaran`→`nomor`). Item: `No. Item`→`no_item`, harga teks → `bigint`. `Dibuat Oleh`→`dibuat_oleh_email`. **Baru:** `approved_at`, `dibuat_oleh_user_id`, `pdf_file_id`, `pdf_url`. |
| `PROJECT_ESTIMATOR` | `project_estimator` | `Project ID`→`nomor`, angka teks → numerik, `Email`→`dibuat_oleh_email`, `Tanggal Approval`→`approved_at`. Status lama `Disetujui`/`Ditolak`; status baru `Pending Approve` untuk yang belum diputuskan. |
| `PROJECT_ESTIMATOR_DETAIL` | `project_estimator_item` | Kunci (`estimator_id`, `no_item`); angka teks → numerik. |
| `COUNTER` | `nomor_urut` + `counter_log` | `nomor_urut` = sequence per jenis yang di-lock baris. Setelah migrasi data: `penawaran = max(counter penawaran)`, `estimator = max(N dari EST-N)`. `counter_log` menyimpan jejak nomor per jenis (unik per jenis + nomor). |
| Script Properties `docqueue_*`, `approvalqueue_*` | `jobs` | Kunci idempoten unik menggantikan `_kirimSekali`. Job selesai hanya bila sukses. |
| — | `audit_log` | Baru: jejak siapa mengubah apa. |
| Konstanta di `Kode.js` | `app_config` | 12 ID template Google Docs, folder output PDF, file tanda tangan email. Nilai diisi saat deploy, tidak di repo. |

## Temuan data yang harus dibereskan sebelum cutover (tahap 6)
- **Username kembar:** 1 pasang username sama di tabel `USER` bila huruf besar/kecil diabaikan. `users.username` unik, jadi salah satunya perlu dibedakan dulu.
- **Penomoran estimator lama:** nomor lama berbasis jumlah baris dan berbagi kolom `counter` dengan penawaran. Di skema baru, setiap jenis dokumen punya urutan sendiri.
- **Status counter (saat audit):** `max(counter)` = 2533; ada 3 nomor `EST-`.
