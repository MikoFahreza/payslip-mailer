"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { duplicateBatchAction } from "@/lib/actions/batch-contacts";
import { Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DuplicateBatchDialog({
  batchId,
  batchName,
}: {
  batchId: string;
  batchName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${batchName} (Salinan)`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await duplicateBatchAction(batchId, name);
      if (!res.success) {
        setError(res.error || "Gagal menduplikat batch.");
      } else if (res.newBatchId) {
        setOpen(false);
        router.push(`/app/batches/${res.newBatchId}`);
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
        variant="outline"
        size="sm"
        onClick={() => {
          setName(`${batchName} (Salinan)`);
          setOpen(true);
        }}
        className="font-medium"
        title="Duplikat daftar penerima ke batch baru"
      >
        <Copy className="w-4 h-4 mr-1.5" />
        Duplikat Batch
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplikat Batch</DialogTitle>
            <DialogDescription>
              Buat batch baru dengan menyalin seluruh penerima dari batch ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDuplicate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Nama Batch Baru
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: Periode Februari 2026"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-1 leading-relaxed">
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">Rincian Duplikasi:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Daftar nama dan email penerima disalin sepenuhnya.</li>
                <li>Status pengiriman seluruh penerima direset ke <strong>Menunggu (Pending)</strong>.</li>
                <li>File lampiran <strong>tidak disalin</strong> untuk menjaga kerahasiaan dokumen antar periode.</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 dark:bg-red-950/60 border border-red-200">
                {error}
              </div>
            )}

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
                    Menduplikasi...
                  </>
                ) : (
                  "Buat Batch Duplikat"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
