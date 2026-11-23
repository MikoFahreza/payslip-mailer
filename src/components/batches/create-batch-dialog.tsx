"use client";

import { useState, useTransition } from "react";
import { createBatch } from "@/lib/actions/batch";
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
import { FolderPlus, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function CreateBatchDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleOpen = () => {
    setName("");
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
      const res = await createBatch({ name });
      if (!res.success) {
        setError(res.error || "Gagal membuat batch.");
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button onClick={handleOpen} className="font-semibold shadow-sm">
        <FolderPlus className="w-4 h-4 mr-2" />
        Buat Batch Baru
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Buat Batch Pengiriman Baru</DialogTitle>
            <DialogDescription>
              Tentukan nama periode pengiriman slip gaji (misalnya: &quot;Periode 1-7 Desember
              2026&quot;).
            </DialogDescription>
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
              <Label htmlFor="batch-name">Nama Batch / Periode</Label>
              <Input
                id="batch-name"
                placeholder="mis. Periode Gaji Desember 2026"
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
                {isPending ? "Menyimpan..." : "Buat Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
