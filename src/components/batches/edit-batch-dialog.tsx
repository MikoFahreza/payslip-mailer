"use client";

import { useState, useTransition } from "react";
import { updateBatchName } from "@/lib/actions/batch";
import { batchSchema } from "@/lib/validations/batch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function EditBatchDialog({
  batchId,
  currentName,
}: {
  batchId: string;
  currentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleOpen = () => {
    setName(currentName);
    setError(null);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = batchSchema.safeParse({ name });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Nama batch tidak valid.");
      return;
    }

    startTransition(async () => {
      const res = await updateBatchName(batchId, name);
      if (!res.success) {
        setError(res.error || "Gagal mengubah nama batch.");
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
        onClick={handleOpen}
        className="h-8 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        title="Ubah Nama Batch"
      >
        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
        <span className="text-xs">Ubah Nama</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Ubah Nama Batch</DialogTitle>
            <DialogDescription>Perbarui nama periode pengiriman slip gaji ini.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 text-sm rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={`edit-batch-${batchId}`}>Nama Batch</Label>
              <Input
                id={`edit-batch-${batchId}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                required
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
