import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-100 dark:border-neutral-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Payslip Mailer
          </div>
          <Link href="/login">
            <Button size="sm" className="font-medium">
              Masuk
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center container mx-auto px-4 py-16 sm:py-24">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            Prototipe Pengiriman Slip Gaji Karyawan yang Andal & Aman
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Pengiriman Slip Gaji Terjadwal, Tepat Sasaran & Terpantau
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Kelola batch pengiriman slip gaji dan bukti transfer karyawan secara bertahap dengan
            pemantauan status langsung per baris serta pencegahan pengiriman ganda.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto font-semibold px-8">
                Masuk ke Aplikasi
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Custom SVG Illustration: Document flowing into a sent envelope */}
        <div className="w-full max-w-2xl mt-12 sm:mt-16 p-6 sm:p-8 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 backdrop-blur-sm">
          <svg
            viewBox="0 0 600 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
            aria-label="Ilustrasi dokumen slip gaji mengalir menjadi amplop terkirim"
            role="img"
          >
            {/* Background connection path */}
            <path
              d="M170 120 C 230 120, 270 70, 330 120 C 370 150, 400 120, 440 120"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              className="text-neutral-300 dark:text-neutral-700"
            />

            {/* Step 1: Payslip Document */}
            <g transform="translate(60, 40)">
              {/* Document shadow / background */}
              <rect
                x="4"
                y="6"
                width="100"
                height="136"
                rx="8"
                className="fill-neutral-200 dark:fill-neutral-800"
              />
              {/* Main Document Body */}
              <rect
                x="0"
                y="0"
                width="100"
                height="136"
                rx="8"
                className="fill-white dark:fill-neutral-900 stroke-neutral-300 dark:stroke-neutral-700"
                strokeWidth="2"
              />
              {/* Document fold corner */}
              <path
                d="M74 0 L100 26 L74 26 Z"
                className="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-700"
                strokeWidth="2"
              />
              {/* Document lines (Payslip content) */}
              <rect
                x="14"
                y="20"
                width="40"
                height="6"
                rx="3"
                className="fill-neutral-400 dark:fill-neutral-500"
              />
              <rect
                x="14"
                y="36"
                width="72"
                height="4"
                rx="2"
                className="fill-neutral-200 dark:fill-neutral-700"
              />
              <rect
                x="14"
                y="48"
                width="64"
                height="4"
                rx="2"
                className="fill-neutral-200 dark:fill-neutral-700"
              />
              <rect
                x="14"
                y="60"
                width="68"
                height="4"
                rx="2"
                className="fill-neutral-200 dark:fill-neutral-700"
              />
              {/* Total salary highlight bar */}
              <rect
                x="14"
                y="80"
                width="72"
                height="14"
                rx="4"
                className="fill-neutral-100 dark:fill-neutral-800"
              />
              <rect x="20" y="85" width="34" height="4" rx="2" className="fill-emerald-500" />
              {/* Verified check badge */}
              <circle cx="86" cy="116" r="10" className="fill-emerald-500" />
              <path
                d="M82 116 L85 119 L90 113"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Step 2: Animated Stream Flow Nodes */}
            <g transform="translate(260, 95)">
              <circle
                cx="20"
                cy="25"
                r="16"
                className="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-700"
                strokeWidth="2"
              />
              <path
                d="M16 25 L24 25 M20 21 L24 25 L20 29"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-600 dark:text-neutral-300"
              />
              <circle cx="56" cy="25" r="4" className="fill-emerald-400" />
              <circle cx="70" cy="25" r="4" className="fill-emerald-500" />
            </g>

            {/* Step 3: Delivered Envelope */}
            <g transform="translate(420, 50)">
              {/* Envelope base body */}
              <rect
                x="0"
                y="20"
                width="120"
                height="86"
                rx="8"
                className="fill-neutral-900 dark:fill-neutral-100 stroke-neutral-900 dark:stroke-neutral-100"
                strokeWidth="2"
              />
              {/* Flap lines */}
              <path
                d="M4 24 L60 68 L116 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dark:stroke-neutral-900"
              />
              {/* Bottom fold accents */}
              <path
                d="M4 102 L44 64 M116 102 L76 64"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
                className="dark:stroke-neutral-900"
              />
              {/* Delivery Sent Badge */}
              <g transform="translate(90, 8)">
                <circle cx="16" cy="16" r="16" className="fill-emerald-500 shadow-lg" />
                <path
                  d="M10 16 L14 20 L22 12"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </g>

            {/* Captions */}
            <text
              x="110"
              y="200"
              textAnchor="middle"
              className="fill-neutral-500 dark:fill-neutral-400 text-xs font-medium"
            >
              1. Slip Gaji & Bukti
            </text>
            <text
              x="305"
              y="200"
              textAnchor="middle"
              className="fill-neutral-500 dark:fill-neutral-400 text-xs font-medium"
            >
              2. Pengiriman Bertahap
            </text>
            <text
              x="480"
              y="200"
              textAnchor="middle"
              className="fill-neutral-500 dark:fill-neutral-400 text-xs font-medium"
            >
              3. Terkirim & Tervalidasi
            </text>
          </svg>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mt-16 text-left">
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm">Pengiriman Bertahap</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Loop berurutan dari peramban dengan jeda teratur untuk keandalan maksimal di
              serverless.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm">Anti Pengiriman Ganda</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Transisi status atomik pada basis data memastikan email tidak pernah terkirim dua
              kali.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm">Privasi & Keamanan</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Pemeriksaan sesi di setiap aksi server, pembatasan upload, serta penghapusan otomatis
              setelah terkirim.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-100 dark:border-neutral-800 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <p>Payslip Mailer — Sistem Pengiriman Slip Gaji Karyawan</p>
          <span className="hidden sm:inline">•</span>
          <Link
            href="/privacy"
            className="hover:text-neutral-900 dark:hover:text-neutral-200 underline underline-offset-4 transition-colors"
          >
            Kebijakan Privasi
          </Link>
        </div>
      </footer>
    </div>
  );
}
