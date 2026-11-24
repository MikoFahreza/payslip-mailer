import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Mail, ShieldCheck } from "lucide-react";

export default async function AppProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/app"
              className="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-50"
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <span>Payslip Mailer</span>
            </Link>

            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <Link
                href="/app"
                className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                Daftar Batch
              </Link>
              <Link
                href="/app/contacts"
                className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                Daftar Kontak
              </Link>
              <Link
                href="/app/settings"
                className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                Pengaturan
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-full px-3 py-1 bg-neutral-100/50 dark:bg-neutral-800/50">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name || "Foto Profil"}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {session.user.name || session.user.email}
              </span>
            </div>

            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-500">
        <p>Payslip Mailer — Sistem Pengiriman Slip Gaji Karyawan</p>
      </footer>
    </div>
  );
}
