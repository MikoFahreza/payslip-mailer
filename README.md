# Payslip Mailer

> **Aplikasi Web Pengiriman Slip Gaji & Bukti Transfer Karyawan**  
> Dibuat dengan arsitektur serverless modern: Next.js (App Router), TypeScript Strict, Drizzle ORM, Neon Postgres, Vercel Blob, Auth.js, dan Gmail REST API. Fokus utama adalah kualitas kode, UX, dan keamanan dasar.

---

## Daftar Isi

1. [Tujuan & Cakupan Proyek](#tujuan--cakupan-proyek)
2. [Arsitektur & Tech Stack](#arsitektur--tech-stack)
3. [Catatan Keputusan Arsitektur Penting](#catatan-keputusan-arsitektur-penting)
4. [Pratinjau & Model Data Fiktif](#pratinjau--model-data-fiktif)
5. [Panduan Menjalankan Secara Lokal](#panduan-menjalankan-secara-lokal)
6. [Langkah Setup Gmail API & Mendapatkan Refresh Token](#langkah-setup-gmail-api--mendapatkan-refresh-token)
7. [Daftar Environment Variables](#daftar-environment-variables)
8. [Panduan Deploy ke Vercel](#panduan-deploy-ke-vercel)
9. [Checklist Pengujian Akhir (End-to-End QA)](#checklist-pengujian-akhir-end-to-end-qa)

---

## Tujuan & Cakupan Proyek

Aplikasi **Payslip Mailer** dirancang untuk memudahkan admin perusahaan mengelola pengiriman slip gaji dan bukti transfer karyawan:

- **Termasuk**:
  - Autentikasi admin tunggal via Auth.js (Credentials, bcrypt hash, proteksi rate limiting).
  - Manajemen batch periode gaji (CRUD batch).
  - Tabel penerima per batch (tambah, edit, hapus, validasi Zod klien & server, batas 50 penerima/batch).
  - Unggah dokumen (slip gaji, bukti transfer) per baris langsung ke Vercel Blob dari peramban.
  - Impor massal CSV / Excel dengan deteksi header, pemetaan kolom, deteksi salah ketik domain (`gmial.com`, dll.), dan pratinjau interaktif.
  - Pengiriman email bertahap via Gmail REST API dengan pesan MIME multipart dan lampiran base64url.
  - Pemantauan status per baris secara real-time (`pending`, `sending`, `sent`, `failed`, `unknown`).
  - Mekanisme pengiriman ulang khusus penerima berstatus gagal.
  - Beranda publik dengan ilustrasi SVG kustom.
- **Tidak Termasuk**: WhatsApp, AI, sistem pembayaran, multi-tenant, enkripsi password PDF, perhitungan gaji.

---

## Arsitektur & Tech Stack

| Lapisan          | Teknologi                          | Deskripsi                                                        |
| :--------------- | :--------------------------------- | :--------------------------------------------------------------- |
| **Framework**    | Next.js 16 (App Router) + React 19 | Server Actions, Server Components, dan route handlers            |
| **Bahasa**       | TypeScript (Strict mode)           | Tipisasi ketat di seluruh klien dan server                       |
| **Styling**      | Tailwind CSS v4 + shadcn/ui        | Desain bersih, aksesibel, dan mendukung mode gelap               |
| **Basis Data**   | Postgres (Neon Serverless)         | Driver `@neondatabase/serverless` dengan connection pooling      |
| **ORM**          | Drizzle ORM                        | Skema terpusat, migrasi terkelola, dan relasi tabel              |
| **File Storage** | Vercel Blob (`@vercel/blob`)       | Unggah langsung dari browser via Client Token                    |
| **Autentikasi**  | Auth.js v5 (NextAuth)              | Sesi JWT, Credentials provider, guard `requireSession()`         |
| **Validasi**     | Zod v4                             | Skema validasi tunggal yang dipakai di klien dan server          |
| **Email**        | Gmail REST API + `mimetext`        | Antarmuka `EmailProvider` (`GmailProvider` & `SimulateProvider`) |
| **Impor Berkas** | PapaParse (CSV) + SheetJS/xlsx     | Parsing langsung di sisi klien browser                           |
| **Pengujian**    | Vitest                             | 12 berkas pengujian dengan 81 unit test otomatis                 |

---

## Catatan Keputusan Arsitektur Penting

### 1. Pola Pengiriman Bertahap di Browser (Client Loop)

- **Konteks**: Platform serverless seperti Vercel memiliki batas durasi eksekusi function (Hobby tier: 300 detik) dan tidak memiliki background daemon yang berjalan terus-menerus.
- **Keputusan**: Tombol "Kirim Semua" menggerakkan loop berurutan di sisi browser. Browser memanggil server action `sendRecipient(recipientId)` satu per satu dengan jeda ~1 detik antar panggilan.
- **Keuntungan**:
  - Tidak membebani fungsi serverless dengan satu timeout panjang.
  - Progress bar dan persentase di UI diperbarui secara langsung untuk tiap penerima.
  - Pengguna dapat menghentikan pengiriman kapan saja melalui tombol **"Batalkan Pengiriman"**.

### 2. Unggah Langsung dari Browser ke Vercel Blob (Client Upload)

- **Konteks**: Serverless functions memiliki batas ukuran body request maksimum sebesar 4,5 MB. Mengunggah file besar melalui server action akan menyebabkan error `Payload Too Large`.
- **Keputusan**: Browser meminta token sekali pakai ke route handler `/api/blob/upload` (yang memverifikasi sesi admin dan jenis/ukuran file), lalu browser mengunggah file langsung ke Vercel Blob CDN. Server hanya menyimpan URL metadata di basis data.

### 3. Transisi Status Atomik (Anti-Kirim Ganda)

- **Konteks**: Jika admin menekan tombol "Kirim" dua kali berturut-turut atau dua tab membuka batch yang sama, risiko email terkirim ganda harus dicegah 100%.
- **Keputusan**: Penguncian status dilakukan secara atomik langsung di database:
  ```sql
  UPDATE recipients
  SET status = 'sending', error_message = NULL
  WHERE id = ? AND status IN ('pending', 'failed')
  RETURNING id;
  ```
  Jika tidak ada baris yang berubah (0 row returned), eksekusi langsung dibatalkan (`skipped`) dan email tidak akan dikirim ulang.

### 4. Pembersihan File Otomatis untuk Menjaga Privasi

- Begitu email slip gaji berhasil terkirim (`status: sent`), sistem otomatis memanggil fungsi pembersihan file di storage Blob dan menghapus baris metadata lampiran terkait. Dokumen sensitif karyawan tidak disimpan lebih lama dari yang dibutuhkan.

### 5. Penanganan Hasil Tidak Pasti (`status: unknown`)

- Jika panggilan ke Gmail API mengalami timeout setelah permintaan dikirim (misal koneksi jaringan terputus saat menunggu balasan HTTP), status penerima ditandai sebagai `unknown`. Sistem **sengaja tidak melakukan retry otomatis** untuk menghindari kirim ganda. Antarmuka menampilkan peringatan dan opsi manual bagi admin untuk menandai terkirim atau gagal setelah mengecek kotak keluar Gmail.

---

## Pratinjau & Model Data Fiktif

Contoh struktur data penerima:

| Nama Penerima    | Alamat Email               | Status     | Lampiran                             |
| :--------------- | :------------------------- | :--------- | :----------------------------------- |
| **Budi Santoso** | `budi.santoso@example.com` | `Terkirim` | `slip_gaji_budi.pdf`                 |
| **Siti Rahma**   | `siti.rahma@example.com`   | `Menunggu` | `slip_gaji_siti.pdf`, `bukti_tf.jpg` |
| **Ahmad Fauzi**  | `ahmad.fauzi@example.com`  | `Gagal`    | `slip_gaji_ahmad.pdf`                |

_Catatan: Seluruh data contoh yang digunakan dalam repositori dan pengujian menggunakan identitas fiktif dan domain aman `@example.com`._

---

## Panduan Menjalankan Secara Lokal

### Prasyarat

- **Node.js**: versi 20.x, 22.x, atau 24.x
- **npm**: versi 10+ atau 11+
- Koneksi internet untuk mengakses database Postgres Neon

### Langkah Instalasi

1. **Clone repositori dan masuk ke direktori**:

   ```bash
   git clone <url-repo-anda>
   cd email-payslip
   ```

2. **Pasang dependensi**:

   ```bash
   npm install
   ```

3. **Salin file environment variable**:

   ```bash
   cp .env.example .env.local
   ```

   _Buka `.env.local` dan sesuaikan nilainya (lihat bagian [Daftar Environment Variables](#daftar-environment-variables))._

4. **Jalankan migrasi dan seed data**:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Jalankan server pengembangan**:

   ```bash
   npm run dev
   ```

   Buka peramban di [http://localhost:3000](http://localhost:3000).

6. **Jalankan unit test**:
   ```bash
   npm test
   ```

---

## Langkah Setup Gmail API & Mendapatkan Refresh Token

Aplikasi menggunakan akun pengirim Gmail tunggal melalui OAuth2 (scope `gmail.send`). Pengguna akhir tidak perlu login Google; server menggunakan `GMAIL_REFRESH_TOKEN` untuk mendapatkan access token secara otomatis.

### Langkah demi Langkah di Google Cloud Console:

1. **Buka Google Cloud Console**:
   Kunjungi [console.cloud.google.com](https://console.cloud.google.com/) dan buat project baru (misal: `payslip-mailer`).
2. **Aktifkan Gmail API**:
   - Masuk ke menu **APIs & Services** > **Library**.
   - Cari **Gmail API**, lalu klik tombol **Enable**.
3. **Konfigurasi OAuth Consent Screen**:
   - Masuk ke **APIs & Services** > **OAuth consent screen**.
   - Pilih **User Type: External**, lalu klik **Create**.
   - Isi nama aplikasi (misal `Payslip Mailer`) dan email dukungan pengembang.
   - Pada bagian **Test users** (Pengguna Uji Coba), klik **+ ADD USERS** dan masukkan alamat email Gmail yang akan dipakai sebagai pengirim (misal `emailanda@gmail.com`). Klik **Save**.
4. **Buat Kredensial OAuth 2.0 Client ID**:
   - Masuk ke **APIs & Services** > **Credentials**.
   - Klik **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - Pilih **Application type: Web application**.
   - Di bagian **Authorized redirect URIs** (URI Pengalihan Resmi), tambahkan:
     ```text
     http://localhost:3333/oauth2callback
     ```
   - Klik **Create**. Salin **Client ID** dan **Client Secret** yang muncul.
5. **Simpan ke `.env.local`**:
   ```env
   GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
   GMAIL_SENDER="emailanda@gmail.com"
   ```
6. **Jalankan Skrip Pembantu Token**:
   ```bash
   npm run get-gmail-token
   ```
   - Skrip akan membuka server lokal di port 3333 dan menampilkan URL otorisasi di terminal.
   - Buka tautan tersebut di peramban, masuk dengan akun pengirim, dan berikan izin pengiriman email.
   - Jika muncul peringatan _"Google hasn't verified this app"_, klik **Advanced** > **Go to payslip-mailer (unsafe)** > **Continue**.
   - Terminal akan otomatis mencetak nilai `GMAIL_REFRESH_TOKEN`.
7. **Perbarui `.env.local`**:
   Masukkan refresh token tersebut dan ubah mode email ke `live`:
   ```env
   GMAIL_REFRESH_TOKEN="1//04xxx"
   EMAIL_MODE="live"
   ```

---

## Daftar Environment Variables

Simpan nilai-nilai berikut di `.env.local` (untuk lokal) dan di pengaturan Vercel (untuk produksi):

| Variabel                | Contoh Nilai                                                   | Keterangan                                                        |
| :---------------------- | :------------------------------------------------------------- | :---------------------------------------------------------------- |
| `DATABASE_URL`          | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | Connection string Postgres Neon Serverless                        |
| `AUTH_SECRET`           | `openssl rand -base64 32`                                      | Kunci rahasia enkripsi JWT Auth.js                                |
| `ADMIN_EMAIL`           | `admin@example.com`                                            | Email akun admin untuk login ke `/login`                          |
| `ADMIN_PASSWORD_HASH`   | `\$2b\$10\$...`                                                | Hash bcrypt kata sandi admin (tanda `$` wajib di-escape `\$`)     |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_...`                                           | Token akses read/write Vercel Blob                                |
| `GOOGLE_CLIENT_ID`      | `xxx.apps.googleusercontent.com`                               | Client ID OAuth2 Google Cloud                                     |
| `GOOGLE_CLIENT_SECRET`  | `GOCSPX-xxx`                                                   | Client Secret OAuth2 Google Cloud                                 |
| `GMAIL_REFRESH_TOKEN`   | `1//04xxx`                                                     | Refresh token untuk pertukaran access token Gmail                 |
| `GMAIL_SENDER`          | `pengirim@gmail.com`                                           | Alamat email Gmail yang bertindak sebagai pengirim                |
| `EMAIL_MODE`            | `live` atau `simulate`                                         | Mode pengiriman (`live` kirim sungguhan, `simulate` simulasi log) |
| `NEXT_PUBLIC_APP_NAME`  | `Payslip Mailer`                                               | Nama aplikasi yang ditampilkan di header dan email                |

> **PENTING (Next.js Env Interpolation)**: Di Next.js, tanda `$` pada hash password bcrypt (`$2b$10$...`) di file `.env` akan dianggap sebagai variabel ekspansi. Anda **wajib** menambahkan backslash (`\$2b\$10\$...`) agar hash tidak terpotong.

---

## Panduan Deploy ke Vercel

1. **Push Proyek ke Git Remote (GitHub/GitLab)**:
   Pastikan tidak ada file rahasia (`.env`, `.env.local`) yang ikut ter-commit.
2. **Import Proyek di Vercel**:
   - Buka [vercel.com](https://vercel.com) > **Add New** > **Project** > Pilih repositori Anda.
3. **Tambahkan Integrasi Vercel Marketplace**:
   - **Neon Postgres**: Tambahkan integrasi Neon dari Marketplace pada project Anda. Vercel akan otomatis menyuntikkan `DATABASE_URL`.
   - **Vercel Blob**: Tambahkan Vercel Blob dari tab **Storage**. Vercel akan otomatis menyuntikkan `BLOB_READ_WRITE_TOKEN`.
4. **Konfigurasi Environment Variables**:
   Tambahkan variabel yang tersisa di menu **Project Settings** > **Environment Variables**:
   - `AUTH_SECRET`
   - `ADMIN_EMAIL` & `ADMIN_PASSWORD_HASH`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`
   - `EMAIL_MODE=live`
   - `NEXT_PUBLIC_APP_NAME=Payslip Mailer`
5. **Jalankan Migrasi Database di Produksi**:
   Jalankan `npm run db:migrate` dengan menyambungkan `DATABASE_URL` produksi melalui terminal lokal Anda atau melalui build script.
6. **Deploy**:
   Klik tombol **Deploy**. Aplikasi akan dibangun dan tersedia di URL produksi `https://<nama-app>.vercel.app`.

---

## Checklist Pengujian Akhir (End-to-End QA)

- [x] **Login Admin**:
  - Percobaan kata sandi salah menghasilkan pesan error umum tanpa membocorkan detail.
  - Percobaan lebih dari 5x memicu rate limiting.
  - Sesi login admin valid mengizinkan akses ke `/app`.
- [x] **Manajemen Batch**:
  - Membuat batch baru berhasil dan muncul di daftar.
  - Mengubah nama batch berhasil diperbarui.
  - Menghapus batch berhasil membersihkan seluruh penerima dan lampiran terkait.
- [x] **Impor Massal (CSV & Excel)**:
  - Mengunggah file CSV/Excel valid membaca seluruh baris dengan tepat.
  - Salah ketik domain umum (`gmial.com`) memberikan rekomendasi peringatan visual.
  - Email duplikat dalam file atau duplikat dalam batch ditolak dengan jelas.
  - Batas maksimal 50 penerima ditegakkan.
- [x] **Unggah Lampiran File**:
  - Menerima file PDF, PNG, JPG (maksimal 4 MB, maksimal 3 file per penerima).
  - File executable atau jenis terlarang ditolak dengan pesan yang jelas.
  - File tersimpan dengan aman dan dapat dihapus secara individual.
- [x] **Pengiriman Email**:
  - Menekan tombol kirim dua kali tidak menyebabkan pengiriman ganda (proteksi transisi atomik).
  - Mode `simulate` mencatat pengiriman tanpa mengirim email nyata.
  - Mode `live` mengirim pesan MIME berlampiran langsung ke inbox Gmail tujuan.
  - Tombol "Kirim Ulang yang Gagal" hanya memproses penerima berstatus gagal.
  - Batas harian 100 email per hari dipantau dan dicegah saat terlampaui.
  - Status tidak pasti (`unknown`) memunculkan dialog resolusi manual untuk admin.
- [x] **Keamanan**:
  - Seluruh server action memverifikasi sesi admin secara ketat.
  - Tidak ada kredensial atau rahasia yang tersimpan di dalam repositori git.
