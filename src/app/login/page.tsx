import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Masuk Admin — Payslip Mailer",
  description: "Halaman masuk administrator sistem pengiriman slip gaji.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-900">
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Link>
      </div>

      <LoginForm />
    </main>
  );
}
