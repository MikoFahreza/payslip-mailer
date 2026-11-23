"use client";

import { useState, useTransition } from "react";
import type { Attachment } from "@/lib/db/schema";
import { deleteAttachment } from "@/lib/actions/attachment";
import { UploadFileDialog } from "./upload-file-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Image as ImageIcon, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export function RecipientAttachmentsCell({
  batchId,
  recipientId,
  recipientName,
  attachments = [],
}: {
  batchId: string;
  recipientId: string;
  recipientName: string;
  attachments?: Attachment[];
}) {
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!deleteTarget) return;
    setError(null);

    startTransition(async () => {
      const res = await deleteAttachment(deleteTarget.id, recipientId, batchId);
      if (!res.success) {
        setError(res.error || "Gagal menghapus file.");
      } else {
        setDeleteTarget(null);
        router.refresh();
      }
    });
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case "payslip":
        return "Slip Gaji";
      case "transfer_proof":
        return "Bukti Transfer";
      default:
        return "Lainnya";
    }
  };

  return (
    <div className="space-y-2">
      {/* List of uploaded files */}
      {attachments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {attachments.map((file) => {
            const isPdf = file.contentType === "application/pdf";
            return (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs group"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isPdf ? (
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                  )}
                  <span className="truncate max-w-[140px] font-medium" title={file.filename}>
                    {file.filename}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    {getKindLabel(file.kind)}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {(file.sizeBytes / 1024).toFixed(0)} KB
                  </span>
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <a
                    href={file.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                    title="Buka / Unduh File"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDeleteTarget(file);
                    }}
                    className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                    title="Hapus File"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload button or max reached notice */}
      <div className="flex items-center gap-2">
        <UploadFileDialog
          batchId={batchId}
          recipientId={recipientId}
          recipientName={recipientName}
          currentFileCount={attachments.length}
        />
        {attachments.length >= 3 && (
          <span className="text-[11px] text-neutral-400 font-medium">(Maks. 3/3 file)</span>
        )}
      </div>

      {/* Delete File Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent onClose={() => setDeleteTarget(null)}>
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle>Hapus File Lampiran?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus file <strong>{deleteTarget?.filename}</strong>? File
              ini akan dihapus permanen dari Vercel Blob dan database.
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
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Menghapus..." : "Ya, Hapus File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
