import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Mail, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Masuk — Payslip Mailer",
  description: "Masuk dengan akun Google Anda ke sistem pengiriman slip gaji.",
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

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
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-1">
            <Mail className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Masuk ke Payslip Mailer</CardTitle>
          <CardDescription className="text-sm">
            Gunakan akun Google Anda untuk mengelola pengiriman slip gaji dan bukti transfer karyawan.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 p-3 text-sm rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>
                {error === "OAuthSignin" || error === "OAuthCallback"
                  ? "Gagal menghubungkan dengan Google. Silakan periksa koneksi dan coba kembali."
                  : error === "AccessDenied"
                  ? "Akses ditolak. Pastikan email Anda telah disetujui."
                  : "Terjadi kendala saat proses masuk. Silakan coba kembali."}
              </span>
            </div>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/app" });
            }}
          >
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 font-semibold text-base flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white border border-neutral-300 dark:border-neutral-700 shadow-sm transition-all"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>Masuk dengan Google</span>
            </Button>
          </form>

          <div className="flex items-center gap-2 pt-2 text-xs text-neutral-500 dark:text-neutral-400 justify-center text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Login hanya meminta akses identitas dasar (email & nama).</span>
          </div>
        </CardContent>

        <CardFooter className="border-t border-neutral-100 dark:border-neutral-800 pt-4 text-center justify-center">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Izin pengiriman email diminta terpisah saat Anda menghubungkan akun Gmail.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
