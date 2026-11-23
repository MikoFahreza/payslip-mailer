import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBatchById } from "@/lib/actions/batch";
import { RecipientsTable } from "@/components/recipients/recipients-table";
import { EditBatchDialog } from "@/components/batches/edit-batch-dialog";
import { DeleteBatchDialog } from "@/components/batches/delete-batch-dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Send,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
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
          <div className="flex items-center gap-2 text-xs text-neutral-500">
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
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link href={`/app/batches/${batch.id}/import`}>
            <Button variant="outline" size="sm" className="font-medium">
              <UploadCloud className="w-4 h-4 mr-2" />
              Impor Massal (Fase 5)
            </Button>
          </Link>

          <Button
            size="sm"
            disabled
            className="font-medium opacity-80"
            title="Pengiriman email bertahap akan diaktifkan pada Fase 4"
          >
            <Send className="w-4 h-4 mr-2" />
            Kirim Semua (Fase 4)
          </Button>

          <DeleteBatchDialog batchId={batch.id} batchName={batch.name} redirectToApp />
        </div>
      </div>

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
