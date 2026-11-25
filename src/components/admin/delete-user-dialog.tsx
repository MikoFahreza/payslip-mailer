"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteUserByAdmin, type AdminUserRow } from "@/lib/actions/admin-users";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteUserDialog({
  user,
  isCurrentAdmin,
}: {
  user: AdminUserRow;
  isCurrentAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteUserByAdmin(user.id);
      if (!res.success) {
        setError(res.error || "Gagal menghapus pengguna.");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Terjadi kesalahan.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isCurrentAdmin}
        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-40"
        title={
          isCurrentAdmin
            ? "Tidak bisa menghapus akun sendiri dari menu admin"
            : "Hapus akun pengguna secara permanen"
        }
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => !isDeleting && setOpen(false)}>
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Akun Pengguna</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun <strong>{user.name || user.email}</strong> (
              {user.email})?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
            <p>
              Tindakan ini permanen. Token Gmail milik pengguna tersebut akan dicabut, serta seluruh
              batch, penerima, buku kontak, log pengiriman, dan berkas lampirannya akan ikut
              terhapus.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 border border-red-200">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus Pengguna"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
