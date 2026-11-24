import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "./auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Masuk / Daftar — Payslip Mailer",
  description: "Masuk atau daftar ke sistem pengiriman slip gaji dan bukti transfer karyawan.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  const { error } = await searchParams;

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

      <Card className="w-full max-w-md mx-auto shadow-lg border-neutral-200 dark:border-neutral-800">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-1">
            <Mail className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Payslip Mailer</CardTitle>
          <CardDescription className="text-xs">
            Masuk dengan Google (langsung siap kirim) atau gunakan email Anda.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <AuthForm initialError={error} />
        </CardContent>
      </Card>
    </main>
  );
}
