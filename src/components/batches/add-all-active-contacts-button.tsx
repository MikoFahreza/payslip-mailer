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
import { addAllActiveContactsToBatch } from "@/lib/actions/batch-contacts";
import { Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AddAllActiveContactsButton({
  batchId,
  currentCount,
  activeContactsCount,
}: {
  batchId: string;
  currentCount: number;
  activeContactsCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const remainingSlots = Math.max(0, 50 - currentCount);

  const handleAddAll = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await addAllActiveContactsToBatch(batchId);
      if (!res.success) {
        setError(res.error || "Gagal menambahkan semua kontak.");
      } else {
        let msg = `Berhasil menyalin ${res.addedCount} kontak aktif ke batch ini.`;
        if (res.skippedExistingCount > 0) {
          msg += ` (${res.skippedExistingCount} kontak dilewati karena sudah ada)`;
        }
        if (res.notFittingCount > 0) {
          msg += ` Catatan: ${res.notFittingCount} kontak tidak muat karena kapasitas 50 per batch.`;
        }
        setMessage(msg);
        router.refresh();
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  if (activeContactsCount === 0 || remainingSlots <= 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="font-medium text-neutral-700 dark:text-neutral-300"
        title="Salin seluruh kontak aktif ke batch ini"
      >
        <Users className="w-4 h-4 mr-1.5" />
        Tambah Semua Kontak Aktif
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Semua Kontak Aktif</DialogTitle>
            <DialogDescription>
              Salin seluruh kontak aktif dari buku kontak ke dalam batch ini secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
            <p>
              Terdapat <strong>{activeContactsCount}</strong> kontak aktif di buku kontak Anda. Sisa slot batch: <strong>{remainingSlots}</strong> penerima.
            </p>
            <p className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] leading-relaxed">
              * Kontak yang sudah ada di dalam batch ini tidak akan diduplikasi. Jika jumlah kontak aktif melebihi sisa kapasitas ({remainingSlots}), kontak selebihnya akan dilewati.
            </p>
          </div>

          {message && (
            <div className="p-3 text-xs rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
              {message}
            </div>
          )}

          {error && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 dark:bg-red-950/60 border border-red-200">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              {message ? "Tutup" : "Batal"}
            </Button>
            {!message && (
              <Button onClick={handleAddAll} disabled={isLoading} className="font-medium">
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Tambahkan Sekarang"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
