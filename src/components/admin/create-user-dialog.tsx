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
import { createUserByAdmin } from "@/lib/actions/admin-users";
import { UserPlus, Loader2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/db/schema";

function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGeneratePassword = () => {
    setPassword(generateRandomPassword());
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await createUserByAdmin({ name, email, password, role });
      if (!res.success) {
        setError(res.error || "Gagal menambahkan pengguna baru.");
      } else {
        setName("");
        setEmail("");
        setPassword("");
        setRole("user");
        setShowPassword(false);
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
        onClick={() => setOpen(true)}
        size="sm"
        className="font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
      >
        <UserPlus className="w-4 h-4 mr-1.5" />
        Tambah Pengguna
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => !isSubmitting && setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Buat akun baru untuk operator HR atau admin lain agar dapat masuk ke aplikasi.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="admin-create-name" className="text-xs font-semibold">
                Nama Lengkap
              </Label>
              <Input
                id="admin-create-name"
                placeholder="misal: Siti Rahma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-create-email" className="text-xs font-semibold">
                Alamat Email Login
              </Label>
              <Input
                id="admin-create-email"
                type="email"
                placeholder="misal: siti@perusahaan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-create-password" className="text-xs font-semibold">
                  Kata Sandi Awal (Minimal 6 karakter)
                </Label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  Acak
                </button>
              </div>
              <div className="relative">
                <Input
                  id="admin-create-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            <div className="space-y-1.5">
              <Label htmlFor="admin-create-role" className="text-xs font-semibold">
                Peran (Role)
              </Label>
              <select
                id="admin-create-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSubmitting}
                className="w-full h-9 px-3 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              >
                <option value="user">User (Operator Pengiriman)</option>
                <option value="admin">Admin (Kelola Pengguna &amp; Pengiriman)</option>
              </select>
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
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !email.trim() || password.length < 6}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Buat Akun"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
