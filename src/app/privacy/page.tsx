import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, ExternalLink, KeyRound, Mail, ShieldCheck, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Payslip Mailer",
  description:
    "Informasi transparan mengenai data yang disimpan, tujuan penggunaan, enkripsi token Gmail, serta cara memutuskan akses atau menghapus akun Anda.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg tracking-tight text-neutral-900 dark:text-neutral-50"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <span>Payslip Mailer</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button size="sm" variant="outline" className="font-medium">
                Masuk
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-10 sm:py-14 max-w-3xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Link>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
          <div className="space-y-2 border-b border-neutral-100 dark:border-neutral-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              <ShieldCheck className="w-3.5 h-3.5" />
              Privasi &amp; Transparansi Data
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white pt-1">
              Kebijakan Privasi Payslip Mailer
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Dokumen ini menjelaskan data apa saja yang kami simpan, bagaimana kami mengamankannya,
              serta hak penuh Anda untuk mencabut akses atau menghapus seluruh data Anda.
            </p>
          </div>

          {/* 1. Data yang Disimpan */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
              <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>1. Data yang Kami Simpan</span>
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Aplikasi hanya menyimpan data minimal yang diperlukan untuk menjalankan fungsi
              pengiriman slip gaji dan manajemen kontak Anda:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Identitas Akun Pengguna:
                </strong>{" "}
                Nama, alamat email, peran akun (<em>admin</em> atau <em>user</em>), serta hash kata
                sandi terenkripsi <em>bcrypt</em> untuk akun yang didaftarkan oleh administrator.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Token Otorisasi Gmail Terenkripsi:
                </strong>{" "}
                Bila Anda menghubungkan akun Gmail untuk pengiriman email, <em>refresh token</em>{" "}
                Google Anda dienkripsi menggunakan algoritma <strong>AES-256-GCM</strong> dengan IV
                acak sebelum disimpan di basis data. Token tidak pernah dikirim ke browser ataupun
                dicatat dalam log sistem.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Data Kontak, Batch &amp; Penerima:
                </strong>{" "}
                Daftar nama dan alamat email kontak/penerima, nama periode batch, status pengiriman,
                catatan ringkas riwayat pengiriman (<code>send_logs</code>), serta berkas lampiran
                sementara (PDF/gambar) yang diunggah ke penyimpanan aman (Vercel Blob).
              </li>
            </ul>
          </section>

          {/* 2. Tujuan Penggunaan Data */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
              <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>2. Tujuan Penggunaan Data &amp; Penghapusan Lampiran Otomatis</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Pengiriman Atas Nama Anda:
                </strong>{" "}
                Izin <code>https://www.googleapis.com/auth/gmail.send</code> hanya digunakan untuk
                mengirimkan email slip gaji/bukti transfer ke penerima yang Anda tentukan sendiri.
                Aplikasi <strong>tidak pernah membaca</strong> isi kotak masuk (inbox) Gmail Anda.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Isolasi Ketat Antar Pengguna:
                </strong>{" "}
                Seluruh data kontak, batch, penerima, dan lampiran terisolasi per akun pengguna dan
                tidak dapat diakses oleh pengguna lain.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Pembersihan Berkas Otomatis:
                </strong>{" "}
                Demi privasi dokumen sensitif, berkas lampiran yang diunggah akan otomatis dihapus
                dari penyimpanan awan (Vercel Blob) dan basis data segera setelah email berhasil
                terkirim.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Tanpa Pihak Ketiga / Iklan:
                </strong>{" "}
                Data Anda tidak pernah dijual, disewakan, atau digunakan untuk pelatihan AI maupun
                penayangan iklan.
              </li>
            </ul>
          </section>

          {/* 3. Cara Memutuskan Gmail & Menghapus Akun */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
              <Unlink className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>3. Cara Memutuskan Koneksi Gmail</span>
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Anda dapat mencabut izin pengiriman Gmail kapan saja melalui dua cara:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Dari Dalam Aplikasi:
                </strong>{" "}
                Masuk ke halaman{" "}
                <Link
                  href="/app/settings"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Pengaturan (/app/settings)
                </Link>
                , lalu klik tombol <strong>&ldquo;Putuskan Gmail&rdquo;</strong>. Aplikasi akan
                memanggil endpoint pencabutan token resmi Google dan menghapus baris token dari
                basis data kami.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">
                  Langsung Melalui Akun Google Anda:
                </strong>{" "}
                Buka halaman{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Pengelola Izin Akun Google
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                , temukan aplikasi <strong>Payslip Mailer</strong>, lalu pilih untuk menghapus
                semua akses.
              </li>
            </ol>
          </section>

          {/* 4. Cara Menghapus Akun Permanen */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5" />
              <span>4. Cara Menghapus Akun dan Semua Data Secara Permanen</span>
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Anda berhak menghapus seluruh data Anda kapan saja. Buka halaman{" "}
              <Link
                href="/app/settings"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Pengaturan (/app/settings)
              </Link>{" "}
              dan klik tombol <strong>&ldquo;Hapus Akun dan Semua Data&rdquo;</strong> di bagian
              Zona Bahaya. Sistem akan langsung:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              <li>Mencabut token OAuth Google Anda yang aktif.</li>
              <li>Menghapus seluruh berkas lampiran milik Anda di penyimpanan Vercel Blob.</li>
              <li>
                Menghapus permanen data pengguna beserta seluruh kontak, batch, penerima, dan log
                pengiriman terkait melalui relasi <em>cascade delete</em>.
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-500">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span>Payslip Mailer — Sistem Pengiriman Slip Gaji Karyawan</span>
          <span className="hidden sm:inline">•</span>
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-200 underline">
            Beranda
          </Link>
          <span>•</span>
          <Link
            href="/login"
            className="hover:text-neutral-900 dark:hover:text-neutral-200 underline"
          >
            Masuk
          </Link>
        </div>
      </footer>
    </div>
  );
}
