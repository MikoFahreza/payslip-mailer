"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import type { AdminUserRow } from "@/lib/actions/admin-users";
import {
  Search,
  ShieldCheck,
  User as UserIcon,
  MailCheck,
  MailWarning,
  MailX,
  Users,
} from "lucide-react";

export function UsersManagementView({
  users,
  currentAdminId,
}: {
  users: AdminUserRow[];
  currentAdminId: string;
}) {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.gmailEmail || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const adminCount = users.filter((u) => u.role === "admin").length;
  const connectedCount = users.filter((u) => u.gmailStatus === "connected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
            <span>Kelola Pengguna (Admin)</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Tambahkan akun pengguna baru, atur peran, reset kata sandi, dan pantau status koneksi
            Gmail pengirim.
          </p>
        </div>

        <CreateUserDialog />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">Total Akun Terdaftar</p>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">Administrator</p>
          <p className="text-2xl font-bold mt-1">{adminCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">Gmail Pengirim Terhubung</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {connectedCount}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
        <Input
          placeholder="Cari nama atau email pengguna..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50/70 dark:bg-neutral-950/60">
              <TableHead>Pengguna</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Koneksi Gmail</TableHead>
              <TableHead>Dibuat Pada</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-neutral-500">
                  {search ? "Tidak ada pengguna yang cocok dengan pencarian." : "Belum ada pengguna."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const isSelf = user.id === currentAdminId;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>{user.name || "Pengguna"}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            Anda
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                          <ShieldCheck className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          <UserIcon className="w-3 h-3" />
                          User
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.gmailStatus === "connected" ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                          <MailCheck className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{user.gmailEmail}</span>
                        </div>
                      ) : user.gmailStatus === "revoked" ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <MailWarning className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Kedaluwarsa ({user.gmailEmail})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <MailX className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Belum terhubung (Simulasi)</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500">
                      {new Date(user.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <EditUserDialog user={user} isCurrentAdmin={isSelf} />
                        <DeleteUserDialog user={user} isCurrentAdmin={isSelf} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
