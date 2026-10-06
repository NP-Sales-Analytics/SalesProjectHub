# 00 — Inventaris Sales Hub (Apps Script + Supabase)

Dokumen ini adalah hasil audit langsung source Sales Hub lama (`Kode.js`, `DataAccess.js`,
`index.html`, `appsscript.json`) sebagai dasar migrasi ke Next.js + MySQL. Bagian yang
**mengoreksi** spesifikasi migrasi awal ditandai **[KOREKSI]**.

Nilai rahasia, ID template/folder Google, alamat email pribadi, dan alamat server sengaja
tidak dicantumkan.

## 1. Arsitektur lama

- **Halaman:** `doGet()` menyajikan satu halaman `index.html`, yaitu SPA buatan sendiri dengan Tailwind CDN, Chart.js + datalabels, SweetAlert2, Phosphor Icons, dan font Plus Jakarta Sans. Browser memanggil server lewat `google.script.run`.
- **Deployment:** web app `executeAs USER_DEPLOYING`, akses `ANYONE_ANONYMOUS`, zona waktu `Asia/Jakarta`. `doGet` mengizinkan iframe dari mana saja.
- **Data:** tersimpan di Supabase, diakses lewat PostgREST dengan **service_role key**. Flag `USE_SUPABASE` memilih antara Supabase dan Google Sheets (jalur legacy).
- **Antrean & kunci:** pekerjaan lambat (PDF, email) disimpan sebagai job di Script Properties dan diproses oleh trigger waktu tiap 1 menit. Kunci memakai `LockService`.
- **Repo `SalesProjectHub`:** hanya berisi `index.html` yang meng-iframe URL web app Apps Script, plus favicon.

## 2. Fungsi server per halaman

| Halaman | Fungsi server yang dipanggil klien |
|---|---|
| Login / sesi | `validateLogin`, `getUserSessionState` (heartbeat 60 detik), `logoutUserSession` **[KOREKSI: belum ada di spesifikasi]** |
| Bootstrap (semua halaman) | `getAllPenawaran`, `getBootstrapMaster`, `getAllProdukData`, `getAllSalesData`, `getAllAreaData`, `getSpecProjectOrgList`, `getSaflProjectOrgList` **[KOREKSI]** |
| Dashboard | data diambil dari bootstrap; KPI + grafik dihitung di klien |
| Buat Penawaran | `submitPenawaran`; edit mode: `updatePenawaran`, `getPenawaranById` (fallback `loadExistingOffer`) **[KOREKSI: `getPenawaranById` dipakai di form, bukan arsip]**, `verifyAdminPin` (membuka edit mode) |
| Dokumen Penawaran | `getPdfUrlById`, `adminEditPenawaran` |
| Approval Center | `processApproval`; `verifyApprovalPassword` (gerbang password bersama) |
| Buat Estimasi | `getEstimatorBootstrap`, `saveProjectEstimator` |
| Dokumen Estimator | `getProjectEstimatorDetailForUser`, `generateEstimatorExcel` |
| Approval Estimator | `processEstimatorApproval` |
| Setting → User Management | `getUserManagementData`, `createManagedUser`, `updateManagedUser` |
| Setting → Area Management | `getAreaManagementData`, `saveArea`, lalu `getBootstrapMaster` |
| Setting → Refresh Cache | `refreshAllCaches` (tidak diperlukan di arsitektur baru) |

**[KOREKSI]**
- `getDetailProduk` tidak dipanggil klien. Fungsi ini hanya dipakai server untuk tabel produk di PDF. Klien menghitung detail produk sendiri dari cache produk.
- `getOrganizationList`, `getAreaList`, `getKAMList` adalah kode mati.

## 3. Aturan bisnis

### 3.1 Nomor dokumen
- **Penawaran:** `N/NIP-PRJ/<bulan romawi>/<yyyy>/<SINGKATAN>`.
  - `N` = `max(counter)` + 1, diterbitkan di bawah lock dan dicatat ke `COUNTER`.
  - Singkatan diambil dari kolom `Singkatan` di master Area (huruf besar). Bila kosong, pakai 3 huruf pertama nama area; bila area kosong, pakai `GEN`.
- **Estimasi:** `EST-N/<romawi>/<yyyy>`. **[KOREKSI]**
  - `N` = jumlah baris COUNTER berawalan `EST-` + 1 (berbasis *count*, bukan max).
  - Nilainya ditulis ke kolom `counter` yang sama dengan penawaran.
  - Akibatnya, nomor bisa terbit ganda bila ada baris yang dihapus, dan di mode Sheets bisa bentrok dengan nomor penawaran.
  - **Keputusan migrasi:** sequence terpisah per jenis dokumen; format tetap sama.

### 3.2 Penawaran standar vs non-standar (`isStandardOffer`)
Penawaran masuk **`Pending Admin`** bila *ada satu saja* produk yang memenuhi aturan berikut (dicek berurutan):
1. `jenis_rm` = `CCM` (tidak peka huruf besar/kecil)
2. tier = `Others` (tidak peka huruf besar/kecil)
3. `Catatan Admin` diisi
4. nama produk tidak ada di master (cocok persis)
5. kombinasi nama + RM + warna + kemasan tidak ada di master
6. harga ≤ 0

Selain itu → **`Pending Approve`**, dan job pembuatan dokumen + email permintaan approval dijadwalkan.

### 3.3 Alur status penawaran
- **Submit:** `Pending Approve` (standar) atau `Pending Admin` (non-standar).
- **Approval** (`processApproval`): `approve` → `Approved`, `approve_revisi` → `Approved (Revisi)`, selain itu → `Ditolak`.
  - Hanya berlaku bila status masih `Pending Approve` (PATCH bersyarat, atomik).
  - Setelahnya, email konfirmasi dijadwalkan.
- **Edit Penawaran** (`updatePenawaran`, khusus admin): semua baris dihapus lalu ditulis ulang. `isStandardOffer` **tidak** dicek ulang.
  - Status lama `Approved (Revisi)` → status baru `Approved`; catatan "Dokumen telah direvisi oleh Admin…" dan approver lama dipulihkan; email konfirmasi "disetujui" dikirim.
  - Status lama `Pending Approve` → tetap `Pending Approve`; hanya PDF yang dibuat ulang, tanpa email.
  - Status lama lainnya (`Pending Admin` / `Ditolak` / `Approved`) → `Pending Approve`, dan email permintaan approval dikirim ulang.
- **Edit langsung admin** (`adminEditPenawaran`): baris di-patch di tempat. Status, tanggal, catatan approval, approver, dan pembuat tetap. PDF dibuat ulang tanpa email, kecuali status `Pending Admin`.

### 3.4 Estimator
- **Status** **[KOREKSI]:** `Pending Approve` → `Disetujui` / `Ditolak`. Saat disimpan, server menulis status apa pun yang dikirim klien; aplikasi baru harus menentukannya di server.
- **Profil wajib saat diajukan:** organisasi, nama sales, KAM.
- **Hitungan per material** (di klien; hanya item dengan quantity > 0 yang disimpan):
  - `revenue` = quantity × harga jual
  - `costRef` = nilai cost basis yang dipilih (`mvAvgPrice` default, `plndPrice1`, atau `plndPrice2`)
  - `cost` = quantity × costRef
  - `cost%` = cost / revenue × 100
  - `GP` = revenue − cost
  - `GP%` = GP / revenue × 100
  - kedua persen = 0 bila revenue 0
  - `targetCostPct` selalu dikirim 0
- **Total header** (di server; dijumlahkan dari nilai yang dikirim klien, tidak dihitung ulang dari master): total revenue, total cost, GP, GP%, cost%, total quantity, total SKU.
- **Excel:** hanya bila status `Disetujui`. Sheet "Estimasi":
  - A1: judul
  - A2–A7: ID, periode, deskripsi, cost basis, target cost %, status
  - baris 9–10: ringkasan total (persen dibagi 100, format 0.00%)
  - baris 12 dan seterusnya: 15 kolom detail
  - nama file `EST_<nomor>_<nama kontrak>.xlsx`

### 3.5 Dokumen PDF penawaran
- **Template:** 12 template Google Docs = 4 grup KAM × 3 grup organisasi.
  - **Grup KAM:** cocok substring, tidak peka huruf besar/kecil, entri pertama yang cocok menang:
    1. high rise / special building / swasta
    2. housing / landed / military
    3. pemerintah / bumn / pemerintahan
    4. maintenance / repainting / building maintenance
    - KAM kosong atau tidak cocok → grup 1
  - **Grup organisasi:** `safl` (nama sama persis dengan organisasi SAFL), `sumatera` (nama memuat "sumatera"), selain itu `jawa`.
  - ID template disimpan di tabel `app_config`, tidak di kode.
- **Placeholder:** `{{ID_Penawaran}}`, `{{Area}}`, `{{Tanggal}}`, `{{PERUSAHAAN}}`, `{{ADDRESS}}`, `{{PIC}}`, `{{CC}}`, `{{Nama Proyek}}`, `{{FRANCO}}`, `{{KAM}}`, `{{SALES}}`, `{{ORGANISASI}}`.
  - `{{CC}}` diambil dari Area: `cc_pdf_safl` / `cc_pdf_spec` / `cc_pdf` sesuai kategori organisasi.
- **Tabel produk:**
  - Tabel yang dipakai: tabel pertama yang sel (0,0)-nya berawalan "NO"; bila tidak ada, tabel pertama dengan ≥ 5 kolom. Semua baris selain header dihapus.
  - 8 kolom: No | Jenis Produk | Nama Produk `nama  (kode warna, atau warna bila kosong)` | Kemasan | SG | DFT | Coverage | Harga (format id-ID, `-` bila 0).
  - SG/DFT/Coverage dicari berdasarkan nama produk saja.
  - Font Calibri 8pt hitam.
- **Nama file:** Doc dan PDF bernama `<N> - <perusahaan> - <nama sales>` (PDF + `.pdf`). PDF dibagikan view-by-link.
- **Pencarian PDF:** nama file harus berawalan `"<N> - "`; jika ada beberapa, yang terbaru dipakai.

### 3.6 Email (Microsoft Graph `sendMail`, nama pengirim "Sales Support Project")

| Email | To | CC | Reply-To | Subjek | Lampiran |
|---|---|---|---|---|---|
| Permintaan approval | `email_approval` Area (varian `_safl` → `_spec` → reguler sesuai kategori organisasi); bila kosong, gagal | `email_cc` Area + email KAM (`email_kam`, atau `email_kam_spec` untuk organisasi Spec) + email pengaju (dari master Sales) + manager organisasi (bila belum ada di To); tanpa duplikat | pengaju (fallback To) | `[APPROVAL PENAWARAN] - <N> \| <perusahaan> \| <sales>` | **tidak ada** **[KOREKSI]** |
| Konfirmasi approval | pengaju saja | — | — | `[DISETUJUI\|DISETUJUI (REVISI)\|DITOLAK] - <N> \| <perusahaan> \| <sales>` | PDF, hanya bila `approve` |
| Akun baru | user baru | — | — | `Akun SalesHub - <nama lengkap>` | gambar tanda tangan inline (`cid:`) |

**[KOREKSI] Email gagal tidak pernah di-retry:** `kirimEmailOutlook` mengembalikan `{success:false}` alih-alih melempar error, sehingga penanda "kirim sekali" sudah tercatat walau email gagal. Di aplikasi baru, job baru dianggap selesai bila Graph membalas HTTP 202.

### 3.7 Visibilitas data (difilter di server)
- **Sumber role:** role dibaca dari tabel user, tidak dipercaya dari klien. User nonaktif, atau user tanpa email, tidak melihat data apa pun.
- **Akses default** (bila setelan user kosong):

| Role | Organisasi default | Area default |
|---|---|---|
| super admin / admin / manager admin | semua | semua |
| manager | organisasi yang `manager_organisasi`-nya memuat emailnya | area yang kolom `email_approval*`-nya memuat emailnya |
| sales | organisasi dari baris master Sales miliknya | tidak ada |

- **Penawaran:**
  - super admin: semua
  - admin / manager / manager admin: area ∈ akses area **dan** organisasi ∈ akses organisasi
  - sales: pasangan (organisasi, nama sales) harus cocok dengan salah satu penugasannya di master Sales, dalam organisasi yang diizinkan
- **Estimator:**
  - super admin: semua
  - admin / manager / manager admin: organisasi diizinkan, dan ada baris Sales dengan organisasi + nama sales yang sama yang areanya kosong atau diizinkan
  - sales: organisasi diizinkan, dan (email pembuat = emailnya, atau nama sales cocok dengan penugasannya)
- **Biaya disembunyikan dari role sales:**
  - header: `totalCost`, `grossProfit`, `gpPct`, `costPct`
  - item: `costReference`, `totalCost`, `costPct`, `grossProfit`, `gpPct`
- **Halaman default:** super admin / admin / manager mendapat ketujuh halaman. Role lain, termasuk manager admin, mendapat semua kecuali dua halaman approval.
- **`manager admin`** hanya didukung sebagai role legacy. Form user hanya menerima super admin / admin / manager / sales.

## 4. Data di luar database
- **Script Properties (nama kunci saja):**
  - Microsoft Graph: `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_SENDER_MAILBOX`
  - Password: `USER_PASSWORD_PEPPER`
  - Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `USE_SUPABASE`
  - Antrean: `docqueue_<id>`, `approvalqueue_<id>`
  - Setelan akses per user: `UM_USER_V1_<sha256(username lowercase)>` (JSON `page_access`, `area_access`, `organization_access`, `is_active`)
- **Format hash password:**
  - baru: `hmac256$<salt hex>$<HMAC-SHA256(key = pepper, msg = salt + ":" + password)>`
  - legacy: `sha256$<salt>$<SHA256(salt + ":" + password)>`
  - selain dua format itu dibandingkan sebagai **plaintext**
- **Konstanta di kode:** 12 ID template, ID folder output, ID file tanda tangan email, daftar organisasi Spec (4) dan SAFL (1), ID spreadsheet legacy. Semuanya dipindah ke `app_config` / tabel `organisasi.kategori`.

## 5. Celah keamanan yang ditutup di aplikasi baru
1. **Rahasia tertanam di source:** service_role key Supabase, client secret Azure, PIN admin, password approval bersama (juga tampil sebagai "demo password" di UI). Semuanya **wajib di-rotate**; tidak ada yang dibawa ke repo.
2. **Fungsi tanpa cek sesi/role:** `submitPenawaran`, `updatePenawaran`, `processApproval`, `processEstimatorApproval`, `saveProjectEstimator`, `generateEstimatorExcel`, `getBootstrapMaster`, `getAll*Data`.
   - Semua fungsi top-level tanpa awalan `_` bisa dipanggil anonim, termasuk `setupOutlookCredentials`, `testSupabaseWriteRoundTrip`, `compareLegacyVsSupabase`, `getBootstrapData`, `getEstimatorDashboardStats`, `getProjectEstimatorById`.
3. **Approval memakai password bersama dan nama approver dari input klien.** Diganti otorisasi role, dan nama approver diambil dari sesi.
4. **Kebocoran biaya ke role sales:** `getEstimatorBootstrap` mengirim master material lengkap (`mvAvgPrice`, `plndPrice1/2`) ke sales, dan `generateEstimatorExcel` tidak memeriksa sesi maupun kepemilikan.
5. **`Dibuat Oleh`** diisi `Session.getActiveUser()`, yang tidak andal untuk akses anonim. Diganti dengan user dari sesi.
6. **Status estimasi** ditentukan klien. Diganti agar ditentukan server.
7. **Password plaintext legacy:** ditandai wajib ganti; tidak pernah disimpan ulang sebagai plaintext.

## 6. Dashboard
- **KPI:** total, Pending Admin, Pending Approve, Approved, Ditolak, Approved (Revisi).
- **Grafik batang tren pengajuan:** interval minggu (7 hari), bulan ini, dan tahun ini; label angka di atas batang; batang bernilai 0 diberi warna redup.
- **Grafik pie:** distribusi status.
- **Tabel:** pengajuan terbaru (ID, proyek, perusahaan/PIC, tanggal, badge status).
- **Filter global:** tanggal, organisasi, sales, KAM, area, status.
