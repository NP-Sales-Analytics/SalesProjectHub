set names utf8mb4;
set time_zone = '+00:00';

-- Skema awal Sales Hub. Pemetaan dari tabel Supabase lama: docs/migrasi/01-skema.md.
-- Semua waktu disimpan UTC (datetime(3)); ditampilkan WIB di aplikasi.

-- ─── MASTER ─────────────────────────────────────────────────────────────

create table if not exists organisasi (
  id varchar(36) primary key,
  nama varchar(150) not null,
  singkatan varchar(10),
  -- Bisa lebih dari satu email (dipisah koma/titik koma), sama seperti data lama.
  manager_email varchar(500),
  -- Pengganti konstanta SPEC_PROJECT_ORGS / SAFL_PROJECT_ORGS di Kode.js:
  -- menentukan kolom email/CC/sapaan area & varian email KAM yang dipakai.
  kategori enum('reguler', 'spec', 'safl') not null default 'reguler',
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint organisasi_nama_unique unique (nama)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists area (
  id varchar(36) primary key,
  nama varchar(100) not null,
  -- Dipakai di nomor penawaran (…/JKT). NULL = fallback 3 huruf nama area.
  singkatan varchar(5),
  urutan int,
  email_approval varchar(500),
  email_approval_spec varchar(500),
  email_approval_safl varchar(500),
  email_cc varchar(1000),
  cc_pdf varchar(500),
  cc_pdf_spec varchar(500),
  cc_pdf_safl varchar(500),
  dear_email varchar(200),
  dear_email_spec varchar(200),
  dear_email_safl varchar(200),
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint area_nama_unique unique (nama),
  constraint area_singkatan_unique unique (singkatan)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists kam (
  id varchar(36) primary key,
  nama varchar(150) not null,
  manager varchar(200),
  email varchar(500),
  email_spec varchar(500),
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint kam_nama_unique unique (nama)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists sales (
  id varchar(36) primary key,
  nama varchar(150) not null,
  email varchar(255),
  -- Teks, bukan FK: data lama memuat nama area yang tidak selalu ada di master.
  area varchar(100),
  sap_code varchar(50),
  manager varchar(200),
  no_urut int,
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint sales_nama_unique unique (nama),
  index sales_email_idx (email)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- Satu sales bisa bertugas di lebih dari satu organisasi (lama: dipisah koma).
create table if not exists sales_organisasi (
  sales_id varchar(36) not null,
  organisasi_id varchar(36) not null,
  primary key (sales_id, organisasi_id),
  constraint sales_organisasi_sales_fk foreign key (sales_id) references sales(id) on delete cascade,
  constraint sales_organisasi_org_fk foreign key (organisasi_id) references organisasi(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists produk (
  id varchar(36) primary key,
  nama varchar(200) not null,
  jenis_rm varchar(50) not null default '',
  warna varchar(100) not null default '',
  kemasan varchar(50) not null default '',
  fp1 bigint not null default 0,
  fp2 bigint not null default 0,
  fp3 bigint not null default 0,
  fp4 bigint not null default 0,
  sg decimal(10, 4),
  dft int,
  coverage varchar(50),
  harga_default bigint,
  harga_retail bigint,
  coverage_teoritis decimal(10, 4),
  satuan varchar(20),
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  -- Kombinasi inilah yang dicek isStandardOffer ("kombinasi kemasan ada di master").
  constraint produk_kombinasi_unique unique (nama, jenis_rm, warna, kemasan)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists material_estimator (
  id varchar(36) primary key,
  matl_group varchar(50),
  matl_group_nama varchar(200),
  material varchar(50) not null,
  deskripsi varchar(300),
  mv_avg_price bigint,
  plnd_price1 bigint,
  plnd_price2 bigint,
  asp_2025 bigint,
  asp_2026 bigint,
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint material_estimator_material_unique unique (material)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- ─── USER & AKSES ───────────────────────────────────────────────────────

create table if not exists users (
  id varchar(36) primary key,
  -- Disimpan lowercase; login menerima username ATAU email.
  username varchar(150) not null,
  nama_lengkap varchar(200) not null,
  email varchar(255) not null,
  role enum('super admin', 'admin', 'manager', 'manager admin', 'sales') not null default 'sales',
  -- scrypt (baru) atau hash legacy hmac256$/sha256$ yang di-rehash saat login berhasil.
  -- NULL = belum punya password yang sah (mis. legacy plaintext) -> wajib reset.
  password_hash varchar(255),
  wajib_ganti_password boolean not null default false,
  is_active boolean not null default true,
  -- false = akses mengikuti default role (dinamis, termasuk area/organisasi baru);
  -- true  = akses persis isi tabel user_*_access. Sama dengan "ada setelan tersimpan" di sistem lama.
  akses_kustom boolean not null default false,
  last_login_at datetime(3),
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint users_username_unique unique (username),
  constraint users_email_unique unique (email)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists user_page_access (
  user_id varchar(36) not null,
  halaman varchar(80) not null,
  primary key (user_id, halaman),
  constraint user_page_access_user_fk foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists user_area_access (
  user_id varchar(36) not null,
  area_id varchar(36) not null,
  primary key (user_id, area_id),
  constraint user_area_access_user_fk foreign key (user_id) references users(id) on delete cascade,
  constraint user_area_access_area_fk foreign key (area_id) references area(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists user_organization_access (
  user_id varchar(36) not null,
  organisasi_id varchar(36) not null,
  primary key (user_id, organisasi_id),
  constraint user_org_access_user_fk foreign key (user_id) references users(id) on delete cascade,
  constraint user_org_access_org_fk foreign key (organisasi_id) references organisasi(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- ─── PENAWARAN ──────────────────────────────────────────────────────────

create table if not exists penawaran (
  id varchar(36) primary key,
  nomor varchar(60) not null,
  tanggal date not null,
  status enum('Pending Admin', 'Pending Approve', 'Approved', 'Approved (Revisi)', 'Ditolak') not null,
  -- Snapshot teks seperti data lama: dokumen historis tidak ikut berubah bila master diubah.
  organisasi varchar(150),
  kam varchar(150),
  nama_sales varchar(150),
  area varchar(100),
  franco varchar(255),
  perusahaan varchar(255),
  pic varchar(200),
  telepon varchar(100),
  email varchar(255),
  nama_proyek varchar(500),
  alamat text,
  catatan_approval text,
  approver varchar(200),
  approved_at datetime(3),
  dibuat_oleh_user_id varchar(36),
  dibuat_oleh_email varchar(255),
  pdf_file_id varchar(100),
  pdf_url varchar(500),
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint penawaran_nomor_unique unique (nomor),
  constraint penawaran_dibuat_oleh_fk foreign key (dibuat_oleh_user_id) references users(id) on delete set null,
  index penawaran_status_idx (status),
  index penawaran_area_org_idx (area, organisasi),
  index penawaran_sales_idx (nama_sales),
  index penawaran_tanggal_idx (tanggal)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists penawaran_item (
  penawaran_id varchar(36) not null,
  no_item int not null,
  jenis_produk varchar(100),
  tier varchar(20),
  nama_produk varchar(255),
  jenis_rm varchar(50),
  warna varchar(100),
  kemasan varchar(50),
  kode_warna varchar(255),
  catatan_admin text,
  harga_satuan bigint not null default 0,
  harga_edit bigint not null default 0,
  primary key (penawaran_id, no_item),
  constraint penawaran_item_penawaran_fk foreign key (penawaran_id) references penawaran(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- ─── ESTIMATOR ──────────────────────────────────────────────────────────

create table if not exists project_estimator (
  id varchar(36) primary key,
  nomor varchar(40) not null,
  nama_kontrak varchar(300),
  tanggal_mulai date,
  tanggal_akhir date,
  deskripsi text,
  cost_basis enum('mvAvgPrice', 'plndPrice1', 'plndPrice2') not null default 'mvAvgPrice',
  target_cost_pct decimal(12, 2) not null default 0,
  total_revenue bigint not null default 0,
  total_cost bigint not null default 0,
  gross_profit bigint not null default 0,
  gp_pct decimal(12, 2) not null default 0,
  cost_pct decimal(12, 2) not null default 0,
  total_sku int not null default 0,
  total_quantity decimal(18, 2) not null default 0,
  status enum('Pending Approve', 'Disetujui', 'Ditolak') not null default 'Pending Approve',
  organisasi varchar(150),
  nama_sales varchar(150),
  kam varchar(150),
  dibuat_oleh_user_id varchar(36),
  dibuat_oleh_email varchar(255),
  approver varchar(200),
  catatan_approval text,
  approved_at datetime(3),
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint project_estimator_nomor_unique unique (nomor),
  constraint project_estimator_dibuat_oleh_fk foreign key (dibuat_oleh_user_id) references users(id) on delete set null,
  index project_estimator_status_idx (status),
  index project_estimator_org_sales_idx (organisasi, nama_sales)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists project_estimator_item (
  estimator_id varchar(36) not null,
  no_item int not null,
  matl_group varchar(50),
  matl_group_nama varchar(200),
  material varchar(50),
  deskripsi varchar(300),
  asp_2025 bigint,
  asp_2026 bigint,
  cost_reference bigint not null default 0,
  quantity decimal(18, 2) not null default 0,
  selling_price bigint not null default 0,
  total_revenue bigint not null default 0,
  total_cost bigint not null default 0,
  cost_pct decimal(12, 2) not null default 0,
  gross_profit bigint not null default 0,
  gp_pct decimal(12, 2) not null default 0,
  primary key (estimator_id, no_item),
  constraint project_estimator_item_estimator_fk foreign key (estimator_id) references project_estimator(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- ─── PENOMORAN ──────────────────────────────────────────────────────────

-- Satu baris per jenis, di-lock dengan SELECT … FOR UPDATE saat menerbitkan nomor.
-- Menggantikan max(counter)+1 (penawaran) dan count(EST-*)+1 (estimator) di sistem lama.
create table if not exists nomor_urut (
  jenis enum('penawaran', 'estimator') primary key,
  nilai int not null default 0
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

insert ignore into nomor_urut (jenis, nilai) values ('penawaran', 0), ('estimator', 0);

-- Jejak setiap nomor yang pernah diterbitkan (pengganti tabel COUNTER).
create table if not exists counter_log (
  jenis enum('penawaran', 'estimator') not null,
  nomor int not null,
  id_dokumen varchar(60) not null,
  created_at datetime(3) not null default current_timestamp(3),
  primary key (jenis, nomor),
  constraint counter_log_id_dokumen_unique unique (id_dokumen)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- ─── INFRASTRUKTUR ──────────────────────────────────────────────────────

-- Pekerjaan lambat (PDF, email). Pengganti antrean docqueue_/approvalqueue_ di Script Properties.
create table if not exists jobs (
  id varchar(36) primary key,
  jenis varchar(40) not null,
  payload json not null,
  status enum('menunggu', 'berjalan', 'selesai', 'gagal') not null default 'menunggu',
  percobaan int not null default 0,
  error_terakhir text,
  -- Pengganti _kirimSekali: satu job per (dokumen, jenis aksi).
  kunci_idempoten varchar(150) not null,
  jalan_setelah datetime(3) not null default current_timestamp(3),
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint jobs_kunci_idempoten_unique unique (kunci_idempoten),
  index jobs_antrean_idx (status, jalan_setelah)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists audit_log (
  id bigint auto_increment primary key,
  user_id varchar(36),
  aksi varchar(60) not null,
  entitas varchar(40) not null,
  entitas_id varchar(60),
  detail json,
  created_at datetime(3) not null default current_timestamp(3),
  index audit_log_entitas_idx (entitas, entitas_id),
  index audit_log_created_idx (created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- Konfigurasi non-rahasia yang dulu hardcode di Kode.js: 12 ID template Google Docs,
-- folder output PDF, file gambar tanda tangan email.
create table if not exists app_config (
  kunci varchar(80) primary key,
  nilai text not null,
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
