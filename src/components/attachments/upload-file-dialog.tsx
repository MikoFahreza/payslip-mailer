"use client";

import { useState, useRef, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { saveAttachment } from "@/lib/actions/attachment";
import {
  validateAttachmentFile,
  generateSecureBlobPathname,
  MAX_ATTACHMENTS_PER_RECIPIENT,
  type AttachmentInput,
} from "@/lib/validations/attachment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadCloud, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function UploadFileDialog({
  batchId,
  recipientId,
  recipientName,
  currentFileCount,
}: {
  batchId: string;
  recipientId: string;
  recipientName: string;
  currentFileCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"payslip" | "transfer_proof" | "other">("payslip");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isLimitReached = currentFileCount >= MAX_ATTACHMENTS_PER_RECIPIENT;

  const handleOpen = () => {
    if (isLimitReached) return;
    setSelectedFile(null);
    setKind("payslip");
    setError(null);
    setOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      setError(validation.error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Silakan pilih file terlebih dahulu.");
      return;
    }

    const validation = validateAttachmentFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      let blobResult: { url: string; pathname: string; contentType: string };

      // Check if running in mock/sample mode
      const tokenCheck = await fetch("/api/blob/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "blob.generate-client-token" }),
      });

      const tokenData = await tokenCheck.json();
      const pathname = generateSecureBlobPathname(recipientId, selectedFile.name, tokenData.userId);

      if (tokenData.isMock) {
        // Upload the actual file to local mock store during development
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("pathname", pathname);
        const uploadRes = await fetch("/api/blob/mock", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Gagal menyimpan file ke penyimpanan lokal.");
        }

        const mockData = await uploadRes.json();
        blobResult = {
          url: mockData.url,
          pathname: mockData.pathname || pathname,
          contentType: selectedFile.type || "application/octet-stream",
        };
      } else {
        // Live client upload directly to Vercel Blob from browser
        const uploadedBlob = await upload(pathname, selectedFile, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          clientPayload: JSON.stringify({ recipientId, kind }),
        });

        blobResult = {
          url: uploadedBlob.url,
          pathname: uploadedBlob.pathname,
          contentType: uploadedBlob.contentType || selectedFile.type || "application/pdf",
        };
      }

      // Save metadata to attachments table in database
      const attachmentData: AttachmentInput = {
        filename: selectedFile.name,
        blobUrl: blobResult.url,
        blobPathname: blobResult.pathname,
        contentType: blobResult.contentType,
        sizeBytes: selectedFile.size,
        kind,
      };

      startTransition(async () => {
        const res = await saveAttachment(batchId, recipientId, attachmentData);
        setIsUploading(false);

        if (!res.success) {
          setError(res.error || "Gagal menyimpan file lampiran.");
        } else {
          setOpen(false);
          router.refresh();
        }
      });
    } catch (err: unknown) {
      setIsUploading(false);
      const uploadError = err as Error;
      console.error("[Upload Error]:", uploadError);
      setError(uploadError.message || "Terjadi kesalahan saat mengunggah file.");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        disabled={isLimitReached}
        className="h-7 px-2.5 text-xs font-medium"
        title={
          isLimitReached
            ? "Maksimal 3 file tercapai"
            : `Upload lampiran untuk ${recipientName} (${currentFileCount}/3)`
        }
      >
        <UploadCloud className="w-3.5 h-3.5 mr-1" />
        Upload File
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => !isUploading && setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Upload Lampiran Slip Gaji</DialogTitle>
            <DialogDescription>
              Unggah file slip gaji atau bukti transfer untuk <strong>{recipientName}</strong>{" "}
              (maks. 4 MB per file, PDF/PNG/JPG).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 text-sm rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Kind Selector */}
            <div className="space-y-2">
              <Label>Jenis Lampiran</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setKind("payslip")}
                  className={`p-2.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                    kind === "payslip"
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  }`}
                >
                  Slip Gaji
                </button>
                <button
                  type="button"
                  onClick={() => setKind("transfer_proof")}
                  className={`p-2.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                    kind === "transfer_proof"
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  }`}
                >
                  Bukti Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setKind("other")}
                  className={`p-2.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                    kind === "other"
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  }`}
                >
                  Lainnya
                </button>
              </div>
            </div>

            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="file-input">Pilih File (PDF, PNG, JPG)</Label>
              <input
                id="file-input"
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,.png,image/png,.jpg,.jpeg,image/jpeg"
                onChange={handleFileChange}
                disabled={isUploading || isPending}
                className="w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-700 dark:file:text-neutral-200 hover:file:bg-neutral-200 cursor-pointer border border-neutral-200 dark:border-neutral-800 rounded-md p-1.5"
                required
              />
            </div>

            {/* Selected File Details */}
            {selectedFile && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium truncate flex-1">{selectedFile.name}</span>
                <span className="text-neutral-400">{(selectedFile.size / 1024).toFixed(0)} KB</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isUploading || isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={!selectedFile || isUploading || isPending}>
                {isUploading || isPending ? "Mengunggah..." : "Unggah File"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
