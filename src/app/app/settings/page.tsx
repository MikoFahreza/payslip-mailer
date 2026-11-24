import type { Metadata } from "next";
import { auth } from "@/auth";
import { getGmailConnection } from "@/lib/actions/settings";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = {
  title: "Pengaturan Akun & Gmail — Payslip Mailer",
  description: "Kelola akun pengguna dan koneksi Gmail pengirim email.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  const connection = await getGmailConnection();
  const params = await searchParams;

  return (
    <SettingsView
      connection={connection}
      userEmail={session?.user?.email}
      userName={session?.user?.name}
      queryConnected={params.connected === "true"}
      queryError={params.error}
    />
  );
}
