# Payslip Mailer

> **Aplikasi Web Multi-User Pengiriman Slip Gaji & Bukti Transfer Karyawan**  
> Dibangun dengan arsitektur serverless modern: Next.js 16 (App Router), TypeScript Strict, Drizzle ORM, Neon Postgres, Vercel Blob, Auth.js v5, Enkripsi AES-256-GCM, dan Gmail REST API per pengguna.

---

## Daftar Isi

1. [Tujuan & Cakupan Proyek](#tujuan--cakupan-proyek)
2. [Arsitektur & Tech Stack](#arsitektur--tech-stack)
3. [Arsitektur Autentikasi Dua Langkah (Hybrid)](#arsitektur-autentikasi-dua-langkah-hybrid)
4. [Model Data Baru (Multi-User v2)](#model-data-baru-multi-user-v2)
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

Aplikasi **Payslip Mailer** dirancang agar setiap pengguna (HR / admin keuangan) memiliki ruang kerja yang terisolasi untuk mengelola kontak karyawan, menyusun batch periode gaji, mengunggah dokumen lampiran, dan mengirimkan email langsung dari akun Gmail masing-masing:

- **Termasuk**:
  - **Autentikasi Hybrid Multi-User**: Masuk langsung dengan Google (otomatis terhubung ke Gmail) atau daftar/masuk menggunakan email & kata sandi (`bcryptjs`) lalu menghubungkan Gmail secara terpisah.
  - **Koneksi Gmail per Pengguna**: Otorisasi OAuth2 terpisah (`/api/gmail/connect` & `/api/gmail/callback`) dengan PKCE + `state` terikat sesi, dan penyimpanan *refresh token* terenkripsi **AES-256-GCM**.
  - **Buku Kontak (`/app/contacts`)**: Manajemen kontak terpusat (tambah, ubah, cari, arsip/pulihkan, hapus permanen, batas 200 kontak aktif per pengguna) beserta impor massal CSV/Excel dengan *upsert* otomatis.
  - **Manajemen Batch & Penerima (`/app/batches/[id]`)**: Tambah penerima manual (opsi simpan ke buku kontak), pilih multi-kontak dari daftar, tombol *"Tambah Semua Kontak Aktif"*, impor massal jalan pintas, serta duplikasi batch.
  - **Unggah Lampiran Aman**: Direct upload dari peramban ke Vercel Blob dengan prefix `${userId}/...` (maks. 3 file/penerima, maks. 4 MB/file, format PDF/PNG/JPG).
  - **Pengiriman Bertahap & Anti-Kirim Ganda**: Pengiriman berurutan via Gmail REST API dengan MIME multipart, transisi status atomik di database, kuota harian per pengguna, dan pembersihan file Blob otomatis setelah terkirim.
  - **Pengaturan & Privasi (`/app/settings` & `/privacy`)**: Putuskan koneksi Gmail (cabut token di Google + hapus DB), hapus akun permanen beserta seluruh data dan file Blob, serta halaman Kebijakan Privasi publik.
- **Tidak Termasuk**: WhatsApp, AI, sistem pembayaran, enkripsi password PDF, perhitungan nominal gaji.

---

## Arsitektur & Tech Stack

| Lapisan          | Teknologi                          | Deskripsi                                                        |
| :--------------- | :--------------------------------- | :--------------------------------------------------------------- |
| **Framework**    | Next.js 16 (App Router) + React 19 | Server Actions, Server Components, Route Handlers, Proxy/Middleware |
| **Bahasa**       | TypeScript (Strict mode)           | Tipisasi ketat di seluruh klien dan server                       |
| **Styling**      | Tailwind CSS v4 + shadcn/ui        | Desain bersih, responsif, dan mendukung mode gelap               |
| **Basis Data**   | Postgres (Neon Serverless)         | Driver `@neondatabase/serverless` dengan connection pooling      |
| **ORM**          | Drizzle ORM                        | Skema terpusat multi-user, migrasi terkelola, dan relasi cascade |
| **File Storage** | Vercel Blob (`@vercel/blob`)       | Unggah langsung dari browser via Client Token berisolasi `userId` |
| **Autentikasi**  | Auth.js v5 (`next-auth`)           | Sesi JWT stateless, Google Provider & Credentials (`bcryptjs`)   |
| **Kriptografi**  | Node.js `crypto` (AES-256-GCM)     | Enkripsi *refresh token* dengan IV acak per nilai & auth tag     |
| **Validasi**     | Zod v4                             | Skema validasi tunggal untuk klien dan server                    |
| **Email**        | Gmail REST API + `mimetext`        | Antarmuka `EmailProvider` (`GmailProvider` & `SimulateProvider`) |
| **Impor Berkas** | PapaParse (CSV) + SheetJS (`xlsx`) | Parsing di browser beserta deteksi salah ketik domain            |
| **Pengujian**    | Vitest                             | 18 berkas pengujian dengan 144 unit & isolasi test otomatis      |

---

## Arsitektur Autentikasi Dua Langkah (Hybrid)

Aplikasi memisahkan atau menyatukan login akun dan otorisasi kirim Gmail sesuai metode masuk yang dipilih pengguna:

1. **Jalur 1 — Masuk dengan Google (Otomatis Terhubung)**:
   - Pengguna menekan tombol **"Masuk dengan Google"** di `/login`.
   - Auth.js meminta scope `openid email profile https://www.googleapis.com/auth/gmail.send` dengan `access_type=offline` dan `prompt=consent`.
   - Callback `signIn` melakukan *upsert* ke tabel `users` dan, bila `refresh_token` diterima dari Google, langsung mengenkripsi dan menyimpannya ke tabel `gmail_connections` dengan status `connected`. Pengguna langsung siap mengirim email tanpa langkah tambahan.

2. **Jalur 2 — Daftar / Masuk via Email & Kata Sandi + Hubungkan Gmail Terpisah**:
   - Pengguna mendaftar atau masuk di `/login` menggunakan email & kata sandi (hash `bcryptjs` disimpan di `users.passwordHash`).
   - Selama belum menghubungkan akun Google, pengguna tetap dapat memakai seluruh fitur kontak, batch, dan unggah dokumen dalam **Mode Simulasi**.
   - Untuk mengirim email nyata, pengguna menuju `/app/settings` lalu menekan **"Hubungkan Gmail"**:
     1. `/api/gmail/connect` memverifikasi sesi (`requireUser()`), membuat nilai `state` acak (32-byte hex) dan PKCE (`code_verifier` & `code_challenge` SHA-256), menyimpannya di cookie HTTP-only terikat `userId`, lalu mengarahkan ke Google OAuth dengan scope `openid email https://www.googleapis.com/auth/gmail.send`.
     2. `/api/gmail/callback` memverifikasi kecocokan `state` dan `userId` (anti-CSRF), menukar `code` dengan token memakai `code_verifier`, membaca alamat email Gmail dari endpoint `userinfo` Google, mengenkripsi *refresh token* dengan **AES-256-GCM**, lalu menyimpannya ke `gmail_connections`.

---

## Model Data Baru (Multi-User v2)

Skema database (`src/lib/db/schema.ts`) dirancang dengan isolasi penuh terhadap `users.id`:

| Tabel | Relasi & Fungsi Utama |
| :--- | :--- |
| **`users`** | Menyimpan `id` (UUID), `email` (unik), `name`, `image`, dan `passwordHash` (opsional untuk login Credentials). Penghapusan baris memicu *cascade delete* ke seluruh data milik pengguna. |
| **`gmail_connections`** | Relasi 1-ke-1 dengan `users` (`userId` unik). Menyimpan `gmailEmail`, `refreshTokenEncrypted` (AES-256-GCM), `scope`, dan `status` (`connected` \| `revoked`). |
| **`contacts`** | Buku kontak milik pengguna (`userId`, `name`, `email` ternormalisasi unik per pengguna, `archivedAt` untuk soft delete). |
| **`batches`** | Periode pengiriman milik pengguna (`userId`, `name`, `createdAt`). |
| **`recipients`** | Daftar penerima dalam batch (`batchId`, `contactId` opsional dengan `onDelete: "set null"`). Menyimpan **snapshot** `name` & `email` sehingga perubahan atau penghapusan kontak tidak merusak riwayat batch lama. Status: `pending`, `sending`, `sent`, `failed`, `unknown`. |
| **`attachments`** | Metadata lampiran milik penerima (`recipientId`, `blobUrl`, `blobPathname` berawalan `${userId}/`, `filename`, `contentType`, `sizeBytes`, `kind`). |
| **`send_logs`** | Catatan peristiwa pengiriman (`attempt`, `sent`, `failed`) terikat `userId` dan `recipientId`, digunakan juga untuk menghitung kuota harian per pengguna. |

---

## Catatan Keputusan Arsitektur & Keamanan

1. **Isolasi Data Ketat Antar Pengguna**:
   - Seluruh Server Actions dan Route Handlers memanggil `requireUser()` dari sesi JWT dan memverifikasi kepemilikan melalui helper `assertOwnsBatch()`, `assertOwnsRecipient()`, serta `assertOwnsContact()` (`src/lib/auth/isolation.ts`).
   - Route `/api/blob/upload` memaksa pathname berkas dimulai dengan `${userId}/${batchId}/${recipientId}/...` agar tidak ada pengguna yang bisa menimpa atau mengakses berkas pengguna lain.
2. **Enkripsi Token AES-256-GCM (`src/lib/crypto/encryption.ts`)**:
   - Setiap token dienkripsi menggunakan `TOKEN_ENCRYPTION_KEY` (32-byte Base64) dengan **IV acak 12-byte** per nilai dan menghasilkan payload `iv.authTag.ciphertext`.
   - Token hanya didekripsi di memori server sesaat sebelum menukar access token untuk panggilan `GmailProvider`. Token tidak pernah dikirim ke browser atau dicatat di log.
3. **Transisi Status Atomik (Anti-Kirim Ganda)**:
   - Sebelum mengirim, sistem mengeksekusi `UPDATE recipients SET status = 'sending' WHERE id = ? AND status IN ('pending', 'failed') RETURNING id`. Jika 0 baris terpengaruh, pengiriman dibatalkan (`skipped`).
4. **Pemetaan Error Gmail & Status `unknown`**:
   - Error `invalid_grant` atau `401` otomatis menandai koneksi di `gmail_connections` sebagai `revoked` dan menghentikan pengiriman dengan pesan *"Hubungkan ulang Gmail"*.
   - Error `429` / `5xx` dicatat sebagai `failed` dan bisa dikirim ulang.
   - Timeout jaringan setelah permintaan dikirim ditandai `unknown` (tidak di-retry otomatis untuk mencegah kirim ganda; admin menyelesaikan manual via dialog).
5. **Pembersihan File Otomatis**:
   - Begitu email berstatus `sent` (atau diselesaikan manual sebagai terkirim), file di Vercel Blob dan baris di `attachments` otomatis dihapus.

---

## Catatan Mode Simulasi

Aplikasi secara otomatis menggunakan `SimulateProvider` (tidak mengirim email sungguhan) pada dua kondisi berikut:

1. Environment variable **`EMAIL_MODE=simulate`** aktif.
2. Pengguna masuk tanpa akun Google dan **belum menghubungkan Gmail** di `/app/settings` (atau koneksi berstatus **`revoked`**), meskipun `EMAIL_MODE=live`.

Pada kondisi simulasi:
- Antarmuka halaman batch dan tombol kirim menampilkan label yang jelas: **"Simulasi (EMAIL_MODE=simulate)"** atau **"Simulasi (Gmail belum terhubung)"**.
- `SimulateProvider` menunda eksekusi secara singkat, lalu mencatat pengiriman sukses di `send_logs`.
- Untuk keperluan pengujian error tanpa mengirim ke alamat riil, `SimulateProvider` mendukung pola email khusus:
  - Email diawali `fail@` atau mengandung `force-fail` -> menyimulasikan kegagalan (`failed`).
  - Email diawali `timeout@` atau mengandung `force-timeout` -> menyimulasikan hasil tidak pasti (`unknown`).

---

## Batas Pengguna Google & Batas Sistem

| Kategori | Batas | Keterangan |
| :--- | :--- | :--- |
| **Google Cloud Mode Testing** | Maks. **100 Test Users** | Selama aplikasi di Google Cloud Console berstatus *Testing*, hanya email yang didaftarkan pada tab *Audience -> Test users* yang diizinkan melakukan OAuth. |
| **Masa Berlaku Token Testing** | **7 Hari** | Pada aplikasi Google OAuth yang berstatus *Testing*, *refresh token* kedaluwarsa setelah 7 hari. Bila terjadi, status koneksi berubah ke `revoked` dan pengguna cukup menekan **"Hubungkan Ulang Gmail"**. |
| **Kuota Harian Aplikasi** | **100 email / 24 jam / user** | Dihitung per pengguna dari tabel `send_logs` (`event = 'sent'`) dalam 24 jam terakhir. |
| **Kuota Google Gmail API** | ~500 (gratis) / ~2.000 (Workspace) per hari | Mengikuti kebijakan batas pengiriman harian akun Gmail masing-masing pengguna. |
| **Buku Kontak** | Maks. **200 kontak** / pengguna | Termasuk kontak aktif dan arsip; dihitung per pengguna (`MAX_CONTACTS_PER_USER = 200`). |
| **Penerima per Batch** | Maks. **50 penerima** / batch | Menjaga kestabilan pengiriman bertahap di lingkungan serverless (`MAX_RECIPIENTS_PER_BATCH = 50`). |
| **Lampiran Berkas** | Maks. **3 file** / penerima | Maks. **4 MB per file** (format `.pdf`, `.png`, `.jpg`) dan total ukuran lampiran **< 24 MB** per email. |

---

## Panduan Menjalankan Secara Lokal

### Prasyarat
- **Node.js**: versi `20.x`, `22.x`, atau `24.x`
- **npm**: versi `10+` atau `11+`
- Database Postgres (misal Neon Postgres)

### Langkah Instalasi

1. **Clone repositori dan pasang dependensi**:
   ```bash
   git clone <url-repo-anda>
   cd email-payslip
   npm install
   ```

2. **Salin template environment variable**:
   ```bash
   cp .env.example .env.local
   ```
   Lalu isi nilai variabel di `.env.local` (lihat bagian [Daftar Environment Variables](#daftar-environment-variables)).

3. **Generate `AUTH_SECRET` dan `TOKEN_ENCRYPTION_KEY`**:
   ```bash
   # AUTH_SECRET
   openssl rand -base64 32

   # TOKEN_ENCRYPTION_KEY (32-byte Base64)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Jalankan migrasi database (dan seed contoh fiktif jika perlu)**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   _Catatan: `db:seed` hanya mengisi data contoh fiktif (`@example.com`)._

5. **Jalankan server pengembangan**:
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000).

6. **Jalankan seluruh unit test & linting**:
   ```bash
   npm test
   npm run lint
   ```

---

## Daftar Environment Variables

| Variabel | Contoh Nilai | Wajib | Keterangan |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | Ya | Connection string Postgres Neon Serverless |
| `AUTH_SECRET` | `openssl rand -base64 32` | Ya | Kunci rahasia penandatangan JWT sesi Auth.js |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (lokal) atau `https://app.vercel.app` | Ya | Origin URL aplikasi untuk membentuk `redirect_uri` OAuth Gmail |
| `GOOGLE_CLIENT_ID` | `12345-abc.apps.googleusercontent.com` | Ya | Client ID OAuth 2.0 Web Application dari Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxxxxx` | Ya | Client Secret OAuth 2.0 Google Cloud Console |
| `TOKEN_ENCRYPTION_KEY` | `32-byte base64 string` | Ya | Kunci simetris enkripsi AES-256-GCM untuk refresh token Gmail |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_...` | Ya (Prod) | Token read/write Vercel Blob (lokal otomatis fallback ke mock store) |
| `EMAIL_MODE` | `simulate` atau `live` | Ya | `simulate` untuk mock log; `live` untuk kirim email riil via Gmail |
| `NEXT_PUBLIC_APP_NAME` | `Payslip Mailer` | Tidak | Nama aplikasi yang tampil di header dan subjek/isi email |

> **Migrasi dari v1?** Variabel lama `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `GMAIL_REFRESH_TOKEN`, dan `GMAIL_SENDER` sudah **dihapus sepenuhnya** dan tidak lagi dipakai.

---

## Checklist & Panduan Deploy ke Vercel

### 1. Persiapan Repositori & Database
- [ ] Pastikan file `.env` dan `.env.local` **tidak** ter-commit ke Git (sudah diabaikan oleh `.gitignore`).
- [ ] Pastikan `git grep` tidak menemukan kunci rahasia atau token apa pun di dalam repositori.
- [ ] Import proyek ke [Vercel](https://vercel.com) (**Add New -> Project**).
- [ ] Pasang integrasi **Neon Postgres** (otomatis mengisi `DATABASE_URL`) dan **Vercel Blob** (otomatis mengisi `BLOB_READ_WRITE_TOKEN`).

### 2. Environment Variables Produksi di Vercel
Tambahkan variabel berikut di **Project Settings -> Environment Variables**:
- [ ] `DATABASE_URL` (dari integrasi Neon)
- [ ] `BLOB_READ_WRITE_TOKEN` (dari integrasi Vercel Blob)
- [ ] `AUTH_SECRET` (nilai acak baru khusus produksi)
- [ ] `TOKEN_ENCRYPTION_KEY` (nilai 32-byte Base64 baru khusus produksi)
- [ ] `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- [ ] `EMAIL_MODE` = `live`
- [ ] `NEXT_PUBLIC_APP_NAME` = `Payslip Mailer`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://<domain-anda>.vercel.app` _(tanpa garis miring di akhir)_

### 3. Redirect URI Produksi di Google Cloud Console
Tambahkan URL produksi Vercel Anda ke **OAuth 2.0 Client ID** di Google Cloud Console:
- [ ] **Authorized JavaScript origins**:
  - `https://<domain-anda>.vercel.app`
- [ ] **Authorized redirect URIs** (kedua path ini wajib ada):
  - `https://<domain-anda>.vercel.app/api/auth/callback/google`
  - `https://<domain-anda>.vercel.app/api/gmail/callback`

### 4. Migrasi & Deploy
- [ ] Jalankan migrasi ke database produksi dari lokal atau CI:
  ```bash
  # Pastikan DATABASE_URL menunjuk ke DB produksi Neon sebelum menjalankan:
  npm run db:migrate
  ```
- [ ] Trigger deploy di Vercel hingga status *Ready*.

---

## Lampiran: Langkah Setup Google Cloud Console

Ikuti panduan ini untuk menyiapkan kredensial Google OAuth yang dipakai oleh Login Google maupun tombol **"Hubungkan Gmail"**:

1. **Buat Project Baru**:
   - Buka [Google Cloud Console](https://console.cloud.google.com/).
   - Buat project baru (misal `payslip-mailer`).
2. **Aktifkan Gmail API**:
   - Masuk ke **APIs & Services -> Library**.
   - Cari **Gmail API**, lalu klik **Enable**.
3. **Konfigurasi Google Auth Platform (OAuth Consent Screen)**:
   - Masuk ke **Google Auth Platform -> Overview** (atau *APIs & Services -> OAuth consent screen*).
   - **Branding**:
     - Isi *App name* (misal `Payslip Mailer`) dan *User support email*.
     - Isi *Developer contact information*.
     - _(Jika hendak dipublikasikan ke **In Production**)_, isi juga:
       - *Application home page*: `https://<domain-anda>.vercel.app`
       - *Application privacy policy link*: `https://<domain-anda>.vercel.app/privacy`
       - *Authorized domains*: domain Anda (harus terverifikasi di Google Search Console).
   - **Audience**:
     - Pilih tipe pengguna **External**.
     - Untuk pengujian/internal tanpa verifikasi Google, biarkan status di **Testing** lalu tambahkan email Anda dan email penguji di bagian **Test users** (maks. 100 email).
   - **Data Access (Scopes)**:
     - Tambahkan scope:
       - `openid`
       - `email`
       - `profile`
       - `https://www.googleapis.com/auth/gmail.send`
4. **Buat OAuth 2.0 Client ID**:
   - Masuk ke menu **Clients** (atau *APIs & Services -> Credentials -> Create Credentials -> OAuth client ID*).
   - Pilih Application type: **Web application**.
   - Pada **Authorized JavaScript origins**, masukkan:
     - `http://localhost:3000`
     - `https://<domain-anda>.vercel.app` _(saat deploy)_
   - Pada **Authorized redirect URIs**, masukkan **keempat** URI berikut (2 lokal, 2 produksi):
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3000/api/gmail/callback`
     - `https://<domain-anda>.vercel.app/api/auth/callback/google`
     - `https://<domain-anda>.vercel.app/api/gmail/callback`
   - Klik **Create**, lalu salin **Client ID** ke `GOOGLE_CLIENT_ID` dan **Client Secret** ke `GOOGLE_CLIENT_SECRET`.

---

## Checklist Pengujian Akhir (End-to-End QA)

Verifikasi alur lengkap berikut pada URL produksi Vercel Anda:

- [ ] **Halaman Publik & Privasi**:
  - Beranda (`/`) dan `/privacy` dapat diakses tanpa login.
  - Link **Kebijakan Privasi** muncul di footer beranda, footer dashboard (`/app`), dan layar `/login`.
- [ ] **Autentikasi Dua Langkah**:
  - Daftar/login menggunakan email & kata sandi berhasil masuk ke `/app` (status awal: *Simulasi - Gmail belum terhubung*).
  - Masuk menggunakan **Google** berhasil masuk ke `/app` dan otomatis menghubungkan Gmail (tampil di `/app/settings`).
  - Tombol **"Hubungkan Gmail"** di `/app/settings` untuk akun Credentials berhasil mengarahkan ke consent Google dan menyimpan token terenkripsi.
- [ ] **Buku Kontak (`/app/contacts`)**:
  - Tambah, ubah, cari, arsip, pulihkan, dan hapus permanen kontak berfungsi dengan batas maksimal 200 kontak.
  - Impor massal CSV/Excel ke kontak berhasil melakukan *upsert* tanpa menduplikasi email yang sama.
- [ ] **Batch, Lampiran & Pengiriman (`/app/batches/[id]`)**:
  - Buat batch baru, tambah penerima dari **"Tambah dari Daftar"** (kontak yang sudah ada di batch tidak bisa dipilih ulang) dan **"Tambah Semua Kontak Aktif"** (menghormati batas 50 penerima).
  - Unggah lampiran PDF/PNG/JPG (maks. 4 MB, maks. 3 file/penerima) berhasil masuk ke Vercel Blob dengan prefix `userId`.
  - Pengiriman bertahap mengirim email nyata ke kotak masuk penerima dengan pengirim (`From`) sesuai alamat Gmail pengguna yang login.
  - Lampiran di Vercel Blob otomatis terhapus setelah pengiriman berstatus `sent`.
  - Duplikat batch menyalin daftar penerima tanpa file dan mereset status menjadi `pending`.
- [ ] **Isolasi & Kontrol Privasi**:
  - Pengguna A tidak dapat melihat, mengedit, mengunggah, atau mengirim data milik Pengguna B.
  - Tombol **"Putuskan Gmail"** mencabut izin di Google dan menghapus token di DB.
  - Tombol **"Hapus Akun dan Semua Data"** mencabut token, menghapus file Blob, dan menghapus seluruh data akun secara permanen.
