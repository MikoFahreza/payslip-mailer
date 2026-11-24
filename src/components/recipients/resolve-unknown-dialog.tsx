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
import { AlertTriangle, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { resolveUnknownStatus } from "@/lib/actions/send";
import { useRouter } from "next/navigation";

interface ResolveUnknownDialogProps {
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  errorMessage?: string | null;
}

export function ResolveUnknownDialog({
  recipientId,
  recipientName,
  recipientEmail,
  errorMessage,
}: ResolveUnknownDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleResolve = async (resolution: "sent" | "failed") => {
    setIsLoading(true);
    try {
      const res = await resolveUnknownStatus(recipientId, resolution);
      if (!res.success) {
        alert(res.error || "Gagal memperbarui status.");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1.5"
        onClick={() => setOpen(true)}
        title="Klik untuk menyelesaikan status tidak pasti"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>Selesaikan Status</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => !isLoading && setOpen(false)}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle>Status Pengiriman Tidak Pasti</DialogTitle>
            </div>
            <DialogDescription>
              Pengiriman email ke <strong>{recipientName}</strong> ({recipientEmail}) mengalami
              batas waktu (timeout) setelah permintaan dikirim ke Gmail API.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs leading-relaxed">
              <p className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                Catatan Sistem:
              </p>
              <p className="text-amber-800 dark:text-amber-300">
                {errorMessage || "Koneksi timeout setelah permintaan dikirim ke Gmail API."}
              </p>
            </div>
            <p>
              Untuk mencegah pengiriman email ganda, sistem tidak mencoba mengirim ulang secara
              otomatis. Silakan periksa inbox/kotak keluar Gmail Anda terlebih dahulu, lalu pilih
              tindakan berikut:
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              disabled={isLoading}
              onClick={() => handleResolve("failed")}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Tandai Gagal (Kirim Ulang)</span>
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              disabled={isLoading}
              onClick={() => handleResolve("sent")}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Tandai Terkirim</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
