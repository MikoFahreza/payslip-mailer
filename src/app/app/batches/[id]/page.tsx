import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBatchById } from "@/lib/actions/batch";
import { getDailySendQuota } from "@/lib/actions/send";
import { RecipientsTable } from "@/components/recipients/recipients-table";
import { EditBatchDialog } from "@/components/batches/edit-batch-dialog";
import { DeleteBatchDialog } from "@/components/batches/delete-batch-dialog";
import { BatchSendControls } from "@/components/recipients/batch-send-controls";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Mail,
} from "lucide-react";

interface BatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BatchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const batch = await getBatchById(id);

  return {
    title: batch ? `${batch.name} — Payslip Mailer` : "Batch Tidak Ditemukan",
  };
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { id } = await params;
  const batch = await getBatchById(id);

  if (!batch) {
    notFound();
  }

  const quota = await getDailySendQuota();
  const recipients = batch.recipients;
  const sentCount = recipients.filter((r) => r.status === "sent").length;
  const pendingCount = recipients.filter((r) => r.status === "pending").length;
  const failedCount = recipients.filter((r) => r.status === "failed").length;
  const unknownCount = recipients.filter((r) => r.status === "unknown").length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link
          href="/app"
          className="inline-flex items-center hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Daftar Batch
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate max-w-xs">
          {batch.name}
        </span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              {batch.name}
            </h1>
            <EditBatchDialog batchId={batch.id} currentName={batch.name} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Dibuat pada{" "}
                {new Date(batch.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-neutral-400" />
              <span>
                Kuota Harian:{" "}
                <strong className="text-neutral-800 dark:text-neutral-200">
                  {quota.used} / {quota.max}
                </strong>{" "}
                terkirim ({quota.remaining} tersisa)
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link href={`/app/batches/${batch.id}/import`}>
            <Button variant="outline" size="sm" className="font-medium">
              <UploadCloud className="w-4 h-4 mr-2" />
              Impor Massal (Fase 5)
            </Button>
          </Link>

          <BatchSendControls batchId={batch.id} recipients={recipients} />

          <DeleteBatchDialog batchId={batch.id} batchName={batch.name} redirectToApp />
        </div>
      </div>

      {/* Warning Banner for Unknown Status */}
      {unknownCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-900 dark:text-amber-200 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Perhatian: Terdapat {unknownCount} pengiriman dengan status &quot;Tidak Pasti&quot;.
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Koneksi mengalami batas waktu (timeout) setelah permintaan dikirim ke Gmail API. Email
              mungkin sudah diterima oleh penerima. Periksa kotak terkirim Gmail Anda terlebih
              dahulu, lalu klik tombol &quot;Selesaikan Status&quot; pada baris penerima yang
              bersangkutan untuk menandainya sebagai terkirim atau gagal sebelum mengirim ulang.
            </p>
          </div>
        </div>
      )}

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Menunggu</span>
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <p className="text-xl font-bold mt-1 text-neutral-700 dark:text-neutral-300">
            {pendingCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Terkirim</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {sentCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Gagal</span>
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <p className="text-xl font-bold mt-1 text-red-600 dark:text-red-400">{failedCount}</p>
        </div>

        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Tidak Pasti</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {unknownCount}
          </p>
        </div>
      </div>

      {/* Recipients Table */}
      <div className="pt-2">
        <RecipientsTable batchId={batch.id} recipients={recipients} />
      </div>
    </div>
  );
}
