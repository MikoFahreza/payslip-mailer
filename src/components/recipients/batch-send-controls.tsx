"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Send,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  StopCircle,
} from "lucide-react";
import { sendRecipient } from "@/lib/actions/send";
import { useRouter } from "next/navigation";
import type { RecipientRow } from "./recipients-table";

interface BatchSendControlsProps {
  batchId: string;
  recipients: RecipientRow[];
}

export function BatchSendControls({ recipients }: BatchSendControlsProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"all" | "failed_only">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentRecipientName, setCurrentRecipientName] = useState("");

  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

  const cancelRequestedRef = useRef(false);
  const router = useRouter();

  // Targets based on current list
  const pendingOrFailed = recipients.filter((r) => r.status === "pending" || r.status === "failed");
  const failedOnly = recipients.filter((r) => r.status === "failed");

  const startSending = async (targetMode: "all" | "failed_only") => {
    const targets = targetMode === "all" ? pendingOrFailed : failedOnly;

    if (targets.length === 0) {
      alert("Tidak ada penerima yang perlu dikirim.");
      return;
    }

    setMode(targetMode);
    setOpen(true);
    setIsProcessing(true);
    setIsFinished(false);
    setIsCancelled(false);
    cancelRequestedRef.current = false;

    setCurrentIndex(0);
    setTotalCount(targets.length);
    setSentCount(0);
    setFailedCount(0);
    setUnknownCount(0);

    let sent = 0;
    let failed = 0;
    let unknown = 0;

    for (let i = 0; i < targets.length; i++) {
      if (cancelRequestedRef.current) {
        setIsCancelled(true);
        break;
      }

      const item = targets[i];
      setCurrentIndex(i + 1);
      setCurrentRecipientName(`${item.name} (${item.email})`);

      try {
        const result = await sendRecipient(item.id);

        if (result.status === "sent") {
          sent++;
          setSentCount(sent);
        } else if (result.status === "failed") {
          failed++;
          setFailedCount(failed);
        } else if (result.status === "unknown") {
          unknown++;
          setUnknownCount(unknown);
        }
      } catch (err) {
        console.error("Error sending recipient in loop:", err);
        failed++;
        setFailedCount(failed);
      }

      // Check if cancelled before pausing
      if (cancelRequestedRef.current) {
        setIsCancelled(true);
        break;
      }

      // 1-second pause between sends (only if not the last item)
      if (i < targets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setIsProcessing(false);
    setIsFinished(true);
  };

  const handleCancel = () => {
    cancelRequestedRef.current = true;
  };

  const handleClose = () => {
    if (isProcessing) return;
    setOpen(false);
    router.refresh();
  };

  const progressPercentage = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Kirim Ulang yang Gagal */}
        {failedOnly.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => startSending("failed_only")}
            className="font-medium border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
            title={`Kirim ulang ${failedOnly.length} penerima yang gagal`}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Kirim Ulang yang Gagal ({failedOnly.length})
          </Button>
        )}

        {/* Kirim Semua */}
        <Button
          size="sm"
          onClick={() => startSending("all")}
          disabled={pendingOrFailed.length === 0}
          className="font-medium bg-blue-600 hover:bg-blue-700 text-white"
          title={
            pendingOrFailed.length === 0
              ? "Semua email sudah terkirim"
              : `Kirim email ke ${pendingOrFailed.length} penerima`
          }
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Kirim Semua ({pendingOrFailed.length})
        </Button>
      </div>

      {/* Progress Modal */}
      <Dialog open={open} onOpenChange={isProcessing ? () => {} : setOpen}>
        <DialogContent className="max-w-md" onClose={isProcessing ? undefined : handleClose}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isProcessing && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              {isFinished && isCancelled && <StopCircle className="w-5 h-5 text-amber-500" />}
              {isFinished && !isCancelled && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              <span>
                {isProcessing
                  ? mode === "all"
                    ? "Mengirim Email Bertahap..."
                    : "Mengirim Ulang Penerima Gagal..."
                  : isCancelled
                    ? "Pengiriman Dibatalkan"
                    : "Pengiriman Selesai"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isProcessing
                ? "Sistem mengirimkan email satu-persatu dengan jeda 1 detik untuk menjaga reputasi pengirim."
                : isCancelled
                  ? "Proses pengiriman telah dihentikan oleh pengguna."
                  : "Semua antrean email telah selesai diproses."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span>
                  Progres: {currentIndex} dari {totalCount}
                </span>
                <span className="font-semibold">{progressPercentage}%</span>
              </div>
              <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Current Recipient Status */}
            {isProcessing && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs space-y-1">
                <span className="text-neutral-500">Sedang memproses:</span>
                <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {currentRecipientName}
                </p>
              </div>
            )}

            {/* Counters */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20">
                <div className="flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sukses</span>
                </div>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {sentCount}
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-red-200 bg-red-50/50 dark:border-red-950 dark:bg-red-950/20">
                <div className="flex items-center justify-center gap-1 text-red-700 dark:text-red-400 font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Gagal</span>
                </div>
                <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-0.5">
                  {failedCount}
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-950 dark:bg-amber-950/20">
                <div className="flex items-center justify-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Tidak Pasti</span>
                </div>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                  {unknownCount}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            {isProcessing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancel}
                className="w-full sm:w-auto gap-1.5"
              >
                <StopCircle className="w-4 h-4" />
                <span>Batalkan Pengiriman</span>
              </Button>
            ) : (
              <Button type="button" onClick={handleClose} className="w-full sm:w-auto">
                Tutup & Perbarui
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
