"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateUserByAdmin, type AdminUserRow } from "@/lib/actions/admin-users";
import { Pencil, Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/db/schema";

export function EditUserDialog({
  user,
  isCurrentAdmin,
}: {
  user: AdminUserRow;
  isCurrentAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [role, setRole] = useState<UserRole>(user.role);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleOpen = () => {
    setName(user.name || "");
    setRole(user.role);
    setNewPassword("");
    setShowPassword(false);
    setError(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await updateUserByAdmin(user.id, {
        name,
        role,
        newPassword,
      });

      if (!res.success) {
        setError(res.error || "Gagal memperbarui pengguna.");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="h-8 w-8 p-0 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        title="Ubah pengguna atau reset kata sandi"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => !isSubmitting && setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Ubah Data Pengguna</DialogTitle>
            <DialogDescription>
              Perbarui nama, peran, atau reset kata sandi untuk <strong>{user.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`edit-name-${user.id}`} className="text-xs font-semibold">
                Nama Lengkap
              </Label>
              <Input
                id={`edit-name-${user.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-role-${user.id}`} className="text-xs font-semibold">
                Peran (Role)
              </Label>
              <select
                id={`edit-role-${user.id}`}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSubmitting || isCurrentAdmin}
                className="w-full h-9 px-3 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 disabled:opacity-60"
              >
                <option value="user">User (Operator Pengiriman)</option>
                <option value="admin">Admin (Kelola Pengguna &amp; Pengiriman)</option>
              </select>
              {isCurrentAdmin && (
                <p className="text-[11px] text-neutral-500">
                  Anda tidak dapat menurunkan peran admin akun Anda sendiri.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-password-${user.id}`} className="text-xs font-semibold">
                Reset Kata Sandi (Opsional)
              </Label>
              <div className="relative">
                <Input
                  id={`edit-password-${user.id}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="Kosongkan jika tidak ingin mengubah"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  disabled={isSubmitting}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
