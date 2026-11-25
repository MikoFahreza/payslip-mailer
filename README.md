# Payslip Mailer

> **Aplikasi Web Terkelola Pengiriman Slip Gaji & Bukti Transfer Karyawan**  
> Dibangun dengan arsitektur serverless modern: Next.js 16 (App Router), TypeScript Strict, Drizzle ORM, Neon Postgres, Vercel Blob, Auth.js v5, Enkripsi AES-256-GCM, dan Gmail REST API per pengguna dengan kontrol peran Administrator.

---

## Daftar Isi

1. [Tujuan & Cakupan Proyek](#tujuan--cakupan-proyek)
2. [Arsitektur & Tech Stack](#arsitektur--tech-stack)
3. [Arsitektur Autentikasi & Peran Admin](#arsitektur-autentikasi--peran-admin)
4. [Model Data (Multi-User & Role)](#model-data-multi-user--role)
5. [Catatan Keputusan Arsitektur & Keamanan](#catatan-keputusan-arsitektur--keamanan)
6. [Catatan Mode Simulasi](#catatan-mode-simulasi)
7. [Batas Pengguna Google & Batas Sistem](#batas-pengguna-google--batas-sistem)
8. [Panduan Menjalankan Secara Lokal](#panduan-menjalankan-secara-lokal)
9. [Daftar Environment Variables](#daftar-environment-variables)
10. [Checklist & Panduan Deploy ke Vercel](#checklist--panduan-deploy-ke-vercel)
11. [Lampiran: Langkah Setup Google Cloud Console](#lampiran-langkah-setup-google-cloud-console)
12. [Checklist Pengujian Akhir (End-to-End QA)](#checklist-pengujian-akhir-end-to-end-qa)

---

## Tujuan & Cakupan Proyek

Aplikasi **Payslip Mailer** dirancang agar organisasi dapat mengontrol siapa saja yang memiliki akses pengiriman slip gaji (dikelola oleh **Admin**), sambil tetap memberi ruang kerja terisolasi bagi setiap operator untuk mengelola kontak karyawan, menyusun batch periode gaji, mengunggah dokumen lampiran, dan mengirim email melalui akun Gmail terhubung:

- **Termasuk**:
  - **Autentikasi Terkelola Berbasis Peran (`admin` & `user`)**: Login menggunakan email & kata sandi (`bcryptjs`) tanpa pendaftaran mandiri maupun tombol *Login with Google* publik.
  - **Panel Manajemen Pengguna (`/app/admin/users`)**: Khusus role `admin` untuk menambah akun pengguna baru, mengubah peran, mereset kata sandi, memantau status Gmail, dan menghapus pengguna.
  - **Koneksi Gmail per Pengguna (`/app/settings`)**: Otorisasi OAuth2 terpisah (`/api/gmail/connect` & `/api/gmail/callback`) dengan PKCE + `state` terikat sesi, serta penyimpanan *refresh token* terenkripsi **AES-256-GCM**.
  - **Buku Kontak (`/app/contacts`)**: Manajemen kontak terpusat (tambah, ubah, cari, arsip/pulihkan, hapus permanen, batas 200 kontak per pengguna) beserta impor massal CSV/Excel dengan *upsert* otomatis.
  - **Manajemen Batch & Penerima (`/app/batches/[id]`)**: Tambah penerima manual (opsi simpan ke buku kontak), pilih multi-kontak dari daftar, tombol *"Tambah Semua Kontak Aktif"*, impor massal jalan pintas, serta duplikasi batch.
  - **Unggah Lampiran Aman**: Direct upload dari peramban ke Vercel Blob dengan prefix `${userId}/...` (maks. 3 file/penerima, maks. 4 MB/file, format PDF/PNG/JPG).
  - **Pengiriman Bertahap & Anti-Kirim Ganda**: Pengiriman berurutan via Gmail REST API dengan MIME multipart (base64 wrapped 76-char RFC 2045), transisi status atomik di database, kuota harian per pengguna, dan pembersihan file Blob otomatis setelah terkirim.
  - **Pengaturan & Privasi (`/app/settings` & `/privacy`)**: Putuskan koneksi Gmail (cabut token di Google + hapus DB), hapus akun sendiri beserta seluruh data & Blob, dan halaman Kebijakan Privasi publik.
- **Tidak Termasuk**: WhatsApp, AI, sistem pembayaran, enkripsi password PDF, perhitungan nominal gaji, pendaftaran mandiri publik.

---

## Arsitektur & Tech Stack

| Lapisan          | Teknologi                          | Deskripsi                                                        |
| :--------------- | :--------------------------------- | :--------------------------------------------------------------- |
| **Framework**    | Next.js 16 (App Router) + React 19 | Server Actions, Server Components, Route Handlers, Proxy/Middleware |
| **Bahasa**       | TypeScript (Strict mode)           | Tipisasi ketat di seluruh klien dan server                       |
| **Styling**      | Tailwind CSS v4 + shadcn/ui        | Desain bersih, responsif, dan mendukung mode gelap               |
| **Basis Data**   | Postgres (Neon Serverless)         | Driver `@neondatabase/serverless` dengan connection pooling      |
| **ORM**          | Drizzle ORM                        | Skema terpusat dengan enum `user_role`, migrasi, dan cascade     |
| **File Storage** | Vercel Blob (`@vercel/blob`)       | Unggah langsung dari browser via Client Token berisolasi `userId` |
| **Autentikasi**  | Auth.js v5 (`next-auth`)           | Sesi JWT dengan Credentials Provider (`bcryptjs`) & Role RBAC    |
| **Kriptografi**  | Node.js `crypto` (AES-256-GCM)     | Enkripsi *refresh token* dengan IV acak per nilai & auth tag     |
| **Validasi**     | Zod v4                             | Skema validasi tunggal untuk klien dan server                    |
| **Email**        | Gmail REST API + `mimetext`        | Antarmuka `EmailProvider` (`GmailProvider` & `SimulateProvider`) |
| **Impor Berkas** | PapaParse (CSV) + SheetJS (`xlsx`) | Parsing di browser beserta deteksi salah ketik domain            |
| **Pengujian**    | Vitest                             | Unit, enkripsi, state machine, RBAC admin, dan isolasi antar-user |

---

## Arsitektur Autentikasi & Peran Admin

Aplikasi memisahkan pembuatan akun login (dikelola Admin) dan otorisasi akun Gmail pengirim:

1. **Login Akun Internal (Email & Kata Sandi)**:
   - Layar `/login` hanya menerima email dan kata sandi yang telah didaftarkan oleh **Administrator**.
   - Dilindungi oleh *rate limiting* (maksimal 5 kali gagal per email sebelum jeda tunggu 15 menit) dan verifikasi hash `bcryptjs`.
   - Sesi JWT menyimpan `userId` dan `role` (`admin` | `user`). Callback JWT menyinkronkan peran terbaru dari database serta otomatis mencabut sesi jika user telah dihapus.

2. **Bootstrap Admin Pertama (`npm run db:create-admin`)**:
   - Karena tidak ada pendaftaran mandiri di UI, admin pertama dibuat melalui skrip CLI:
     ```bash
     npm run db:create-admin -- --email=admin@perusahaan.com --password=KataSandiKuat --name="Admin HR"
     ```
   - Setelah masuk sebagai `admin`, Anda dapat membuat akun operator lain langsung dari menu **Kelola Pengguna** (`/app/admin/users`).

3. **Hubungkan Gmail Pengirim secara Opsional (`/app/settings`)**:
   - Setiap akun (`admin` maupun `user`) dapat bekerja di **Mode Simulasi** tanpa Gmail, atau menghubungkan alamat Gmail pengirimnya melalui `/app/settings` -> **"Hubungkan Gmail"**:
     1. `/api/gmail/connect` memverifikasi sesi (`requireUser()`), membuat `state` acak (32-byte hex) + PKCE SHA-256 (`code_verifier`/`code_challenge`), lalu mengarahkan ke Google OAuth dengan scope `openid email https://www.googleapis.com/auth/gmail.send`.
     2. `/api/gmail/callback` memverifikasi kecocokan `state` dan `userId`, menukar `code` dengan token, membaca alamat email Gmail, mengenkripsi *refresh token* dengan **AES-256-GCM**, dan menyimpannya ke `gmail_connections`.

---

## Model Data (Multi-User & Role)

Skema database (`src/lib/db/schema.ts`) terdiri dari 7 tabel utama dengan isolasi terhadap `users.id`:

| Tabel | Relasi & Fungsi Utama |
| :--- | :--- |
| **`users`** | Menyimpan `id` (UUID), `email` (unik), `name`, `image`, `passwordHash`, dan `role` (`admin` \| `user`). Penghapusan baris memicu *cascade delete* ke seluruh data milik pengguna. |
| **`gmail_connections`** | Relasi 1-ke-1 dengan `users` (`userId` unik). Menyimpan `gmailEmail`, `refreshTokenEncrypted` (AES-256-GCM), `scope`, dan `status` (`connected` \| `revoked`). |
| **`contacts`** | Buku kontak milik pengguna (`userId`, `name`, `email` ternormalisasi unik per pengguna, `archivedAt` untuk soft delete). |
| **`batches`** | Periode pengiriman milik pengguna (`userId`, `name`, `createdAt`). |
| **`recipients`** | Daftar penerima dalam batch (`batchId`, `contactId` opsional dengan `onDelete: "set null"`). Menyimpan **snapshot** `name` & `email` sehingga perubahan atau penghapusan kontak tidak merusak riwayat batch lama. Status: `pending`, `sending`, `sent`, `failed`, `unknown`. |
| **`attachments`** | Metadata lampiran milik penerima (`recipientId`, `blobUrl`, `blobPathname` berawalan `${userId}/`, `filename`, `contentType`, `sizeBytes`, `kind`). |
| **`send_logs`** | Catatan peristiwa pengiriman (`attempt`, `sent`, `failed`) terikat `userId` dan `recipientId`, digunakan juga untuk menghitung kuota harian per pengguna. |

---

## Catatan Keputusan Arsitektur & Keamanan

1. **Kontrol Peran & Isolasi Data Ketat**:
   - Semua rute `/app/admin/*` dilindungi di layer Proxy (`src/proxy.ts`) dan halaman server (`requireAdmin()`).
   - Setiap Server Action admin (`src/lib/actions/admin-users.ts`) memverifikasi ulang peran `admin` langsung ke database (`assertLiveAdmin`), menolak *self-demotion* dan *self-deletion* dari panel admin, serta membersihkan token Google + file Blob sebelum menghapus user.
   - Seluruh aksi data batch, penerima, kontak, dan lampiran memanggil `requireUser()`, `assertOwnsBatch()`, `assertOwnsRecipient()`, `assertOwnsContact()`, serta memaksa prefix pathname Blob `${userId}/...`.
2. **Enkripsi Token AES-256-GCM (`src/lib/crypto/encryption.ts`)**:
   - Token Gmail dienkripsi dengan `TOKEN_ENCRYPTION_KEY` (32-byte Base64) + **IV acak 12-byte** per nilai dan hanya didekripsi di memori server saat mengirim email.
3. **Transisi Status Atomik (Anti-Kirim Ganda) & RFC 2045 MIME**:
   - Penguncian baris penerima dilakukan atomik (`UPDATE recipients SET status = 'sending' WHERE id = ? AND status IN ('pending', 'failed') RETURNING id`).
   - Lampiran base64 dibungkus per **76 karakter** (`\r\n`) sesuai RFC 2045 dan tidak pernah mengirim file placeholder palsu saat pengiriman riil aktif.
4. **Pembersihan File Otomatis**:
   - Begitu email berstatus `sent` (atau diselesaikan manual sebagai terkirim), file di Vercel Blob dan baris di `attachments` otomatis dihapus.

---

## Catatan Mode Simulasi

Aplikasi secara otomatis menggunakan `SimulateProvider` (tidak mengirim email nyata) pada dua kondisi:
1. Environment variable **`EMAIL_MODE=simulate`** aktif.
2. Pengguna **belum menghubungkan Gmail** di `/app/settings` (atau koneksi berstatus **`revoked`**).

Label **"Simulasi (EMAIL_MODE=simulate)"** atau **"Simulasi (Gmail belum terhubung)"** tampil jelas pada halaman batch dan tombol kirim. Untuk uji skenario error di mode simulasi, `SimulateProvider` mendukung email diawali `fail@` / `force-fail` (simulasi gagal) dan `timeout@` / `force-timeout` (simulasi status `unknown`).

---

## Batas Pengguna Google & Batas Sistem

| Kategori | Batas | Keterangan |
| :--- | :--- | :--- |
| **Google Cloud Mode Testing** | Maks. **100 Test Users** | Selama aplikasi di Google Cloud Console berstatus *Testing*, alamat Gmail yang akan dihubungkan di `/app/settings` harus didaftarkan pada tab *Audience -> Test users*. |
| **Masa Berlaku Token Testing** | **7 Hari** | Pada aplikasi berstatus *Testing*, *refresh token* Gmail kedaluwarsa setelah 7 hari. Jika terjadi, status berubah ke `revoked` dan pengguna cukup klik **"Hubungkan Ulang Gmail"**. |
| **Kuota Harian Aplikasi** | **100 email / 24 jam / user** | Dihitung per pengguna dari `send_logs` (`event = 'sent'`) dalam 24 jam terakhir. |
| **Kuota Google Gmail API** | ~500 (gratis) / ~2.000 (Workspace) per hari | Mengikuti kebijakan kuota harian akun Gmail pengirim. |
| **Buku Kontak** | Maks. **200 kontak** / pengguna | Termasuk kontak aktif dan arsip (`MAX_CONTACTS_PER_USER = 200`). |
| **Penerima per Batch** | Maks. **50 penerima** / batch | Menjaga kestabilan pengiriman bertahap di lingkungan serverless. |
| **Lampiran Berkas** | Maks. **3 file** / penerima | Maks. **4 MB per file** (`.pdf`, `.png`, `.jpg`) dan total **< 24 MB** per email. |

---

## Panduan Menjalankan Secara Lokal

### Prasyarat
- **Node.js** `20.x` / `22.x` / `24.x` dan **npm** `10+`
- Database Postgres (misal Neon Postgres)

### Langkah Instalasi

1. **Clone repositori dan pasang dependensi**:
   ```bash
   git clone <url-repo-anda>
   cd email-payslip
   npm install
   ```

2. **Salin template environment variable & lengkapi `.env.local`**:
   ```bash
   cp .env.example .env.local
   ```
   Generate kunci rahasia:
   ```bash
   # AUTH_SECRET & TOKEN_ENCRYPTION_KEY (jalankan 2 kali untuk 2 kunci berbeda)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Jalankan migrasi database & buat akun admin pertama**:
   ```bash
   npm run db:migrate
   npm run db:create-admin -- --email=admin@perusahaan.com --password=KataSandiKuat --name="Admin HR"
   ```

4. **Jalankan server pengembangan & pengujian**:
   ```bash
   npm run dev
   npm test
   npm run lint
   ```

---

## Daftar Environment Variables

| Variabel | Contoh Nilai | Wajib | Keterangan |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | Ya | Connection string Postgres Neon Serverless |
| `AUTH_SECRET` | `32-byte base64 string` | Ya | Kunci rahasia penandatangan JWT sesi Auth.js |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` atau `https://email-payslip.vercel.app` | Ya | Origin URL aplikasi untuk membentuk `redirect_uri` OAuth Gmail |
| `GOOGLE_CLIENT_ID` | `12345-abc.apps.googleusercontent.com` | Ya (Gmail) | Client ID OAuth 2.0 Web Application (untuk `/api/gmail/connect`) |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxxxxx` | Ya (Gmail) | Client Secret OAuth 2.0 Google Cloud Console |
| `TOKEN_ENCRYPTION_KEY` | `32-byte base64 string` | Ya | Kunci simetris enkripsi AES-256-GCM refresh token Gmail |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_...` | Ya (Prod) | Token read/write Vercel Blob (lokal otomatis fallback ke mock store) |
| `EMAIL_MODE` | `simulate` atau `live` | Ya | `simulate` untuk mock log; `live` untuk kirim email riil via Gmail |
| `NEXT_PUBLIC_APP_NAME` | `Payslip Mailer` | Tidak | Nama aplikasi yang tampil di header dan email |

---

## Checklist & Panduan Deploy ke Vercel

### 1. Persiapan Repositori & Storage
- [ ] Pastikan file `.env` dan `.env.local` **tidak** ter-commit ke Git.
- [ ] Import proyek ke [Vercel](https://vercel.com) (**Add New -> Project**).
- [ ] Tambahkan integrasi **Neon Postgres** (`DATABASE_URL`) dan **Vercel Blob (Access: Public)** (`BLOB_READ_WRITE_TOKEN` — pastikan tidak ada token placeholder `sample` lama di Settings).

### 2. Environment Variables Produksi di Vercel
Tambahkan variabel berikut di **Project Settings -> Environment Variables** dan centang **`Production`** serta **`Preview`** (jika deploy dari branch selain production branch):
- [ ] `DATABASE_URL`
- [ ] `BLOB_READ_WRITE_TOKEN`
- [ ] `AUTH_SECRET`
- [ ] `TOKEN_ENCRYPTION_KEY`
- [ ] `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- [ ] `EMAIL_MODE` = `live`
- [ ] `NEXT_PUBLIC_APP_NAME` = `Payslip Mailer`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://<domain-anda>.vercel.app` _(wajib pakai `https://`, tanpa `/` di akhir; **hapus** `AUTH_URL`/`NEXTAUTH_URL` di Vercel)_

### 3. Redirect URI Produksi di Google Cloud Console
Karena login menggunakan Credentials dan Google OAuth hanya dipakai untuk tombol **"Hubungkan Gmail"** di `/app/settings`, pastikan URI berikut terdaftar di **Authorized redirect URIs**:
- [ ] `https://<domain-anda>.vercel.app/api/gmail/callback`

### 4. Migrasi & Akun Admin Pertama di Produksi
- [ ] Jalankan migrasi dan pembuatan akun admin pertama dengan `DATABASE_URL` menunjuk ke Neon produksi:
  ```bash
  npm run db:migrate
  npm run db:create-admin -- --email=admin@perusahaan.com --password=KataSandiKuat --name="Admin HR"
  ```
- [ ] Lakukan **Redeploy** di Vercel setelah semua Environment Variables disimpan.

---

## Lampiran: Langkah Setup Google Cloud Console

1. **Buat Project & Aktifkan Gmail API**: Buka [Google Cloud Console](https://console.cloud.google.com/), buat project, lalu aktifkan **Gmail API** di *APIs & Services -> Library*.
2. **Konfigurasi Google Auth Platform (OAuth Consent Screen)**:
   - **Branding**: Isi *App name* (`Payslip Mailer`), *User support email*, dan *Developer contact information*.
   - **Audience**: Pilih **External**. Untuk penggunaan internal/pribadi, biarkan status **Testing** dan tambahkan email Gmail yang akan dihubungkan pada bagian **Test users** (maks. 100 email).
   - **Data Access (Scopes)**: Tambahkan `openid`, `email`, dan `https://www.googleapis.com/auth/gmail.send`.
3. **Buat OAuth 2.0 Client ID (Web Application)**:
   - **Authorized JavaScript origins**: `http://localhost:3000` dan `https://<domain-anda>.vercel.app`.
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/gmail/callback`
     - `https://<domain-anda>.vercel.app/api/gmail/callback`
   - Salin **Client ID** & **Client Secret** ke `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`.

---

## Checklist Pengujian Akhir (End-to-End QA)

- [ ] **Halaman Publik & Autentikasi**:
  - Beranda (`/`) dan `/privacy` tampil tanpa tombol Login Google atau daftar mandiri.
  - Login di `/login` menolak kredensial salah, memicu rate limit setelah 5 kali gagal, dan menerima akun yang dibuat oleh admin.
- [ ] **Manajemen Pengguna Admin (`/app/admin/users`)**:
  - Pengguna ber-role `user` tidak melihat menu *Kelola Pengguna* dan otomatis diarahkan ke `/app` jika mengakses `/app/admin/users`.
  - Admin dapat menambah user baru, mengubah role, mereset password, dan menghapus user lain.
- [ ] **Koneksi Gmail, Kontak, Batch & Pengiriman**:
  - User dapat menghubungkan & memutuskan Gmail pengirimnya di `/app/settings`.
  - Fitur `/app/contacts`, impor CSV/Excel, batch, tambah dari daftar, unggah file ke Vercel Blob, dan kirim email Gmail (lampiran PDF/JPG terbuka utuh) berjalan normal.
