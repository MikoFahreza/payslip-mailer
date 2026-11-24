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
import { deleteContactPermanently } from "@/lib/actions/contact";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/lib/db/schema";

export function DeleteContactDialog({ contact }: { contact: Contact }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteContactPermanently(contact.id);
      if (!res.success) {
        setError(res.error || "Gagal menghapus kontak.");
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
        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
        title="Hapus kontak secara permanen"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Kontak Permanen</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus kontak <strong>{contact.name}</strong> ({contact.email})?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
            <p>
              Tindakan ini tidak dapat dibatalkan. Kontak akan dihapus dari buku kontak Anda.
            </p>
            <p className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] leading-relaxed">
              Catatan: Riwayat pengiriman dan data penerima pada batch terdahulu yang pernah menggunakan kontak ini <strong>tidak akan terpengaruh</strong>.
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
                "Hapus Permanen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
