"use client";

import { useState, useTransition } from "react";
import { deleteRecipient } from "@/lib/actions/recipient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteRecipientDialog({
  recipientId,
  recipientName,
  recipientEmail,
  batchId,
}: {
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  batchId: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteRecipient(recipientId, batchId);
      if (!res.success) {
        setError(res.error || "Gagal menghapus penerima.");
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0 text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
        title="Hapus Penerima"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle>Hapus Penerima Ini?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus penerima <strong>{recipientName}</strong> (
              {recipientEmail})? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div
              role="alert"
              className="p-3 text-sm rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900 mb-4"
            >
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
