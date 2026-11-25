import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getUsersForAdmin } from "@/lib/actions/admin-users";
import { UsersManagementView } from "@/components/admin/users-management-view";

export const metadata: Metadata = {
  title: "Kelola Pengguna (Admin) — Payslip Mailer",
  description: "Manajemen akun pengguna, peran, dan status koneksi Gmail.",
};

export default async function AdminUsersPage() {
  let adminUserId: string;
  try {
    const admin = await requireAdmin();
    adminUserId = admin.userId;
  } catch {
    redirect("/app");
  }

  let users: Awaited<ReturnType<typeof getUsersForAdmin>> = [];
  try {
    users = await getUsersForAdmin();
  } catch {
    redirect("/app");
  }

  return <UsersManagementView users={users} currentAdminId={adminUserId} />;
}
