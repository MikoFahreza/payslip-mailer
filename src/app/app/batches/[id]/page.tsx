import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBatchById } from "@/lib/actions/batch";
import { getDailySendQuota } from "@/lib/actions/send";
import { requireUser } from "@/lib/auth/session";
import { getUserGmailStatus } from "@/lib/email";
import { getContacts } from "@/lib/actions/contact";
import { RecipientsTable } from "@/components/recipients/recipients-table";
import { EditBatchDialog } from "@/components/batches/edit-batch-dialog";
import { DeleteBatchDialog } from "@/components/batches/delete-batch-dialog";
import { DuplicateBatchDialog } from "@/components/batches/duplicate-batch-dialog";
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
  ShieldAlert,
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

  const userId = await requireUser();
  const [quota, gmailStatus, userContacts] = await Promise.all([
    getDailySendQuota(),
    getUserGmailStatus(userId),
    getContacts({ includeArchived: false }),
  ]);

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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              {batch.name}
            </h1>
            <EditBatchDialog batchId={batch.id} currentName={batch.name} />

            {/* Connection Mode Indicator */}
            {gmailStatus.isSimulated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{gmailStatus.statusLabel}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Pengirim: {gmailStatus.senderEmail}</span>
              </span>
            )}
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
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/app/batches/${batch.id}/import`}>
            <Button variant="outline" size="sm" className="font-medium">
              <UploadCloud className="w-4 h-4 mr-1.5" />
              Impor Massal
            </Button>
          </Link>

          <DuplicateBatchDialog batchId={batch.id} batchName={batch.name} />

          <BatchSendControls
            batchId={batch.id}
            recipients={recipients}
            isSimulated={gmailStatus.isSimulated}
            statusLabel={gmailStatus.statusLabel}
            isRevoked={gmailStatus.status === "revoked"}
          />

          <DeleteBatchDialog batchId={batch.id} batchName={batch.name} redirectToApp />
        </div>
      </div>

      {/* Revoked Banner (Mandatory if token is revoked) */}
      {gmailStatus.status === "revoked" && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-900 dark:text-red-200 text-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">
                Koneksi Gmail Anda telah dicabut atau kedaluwarsa
              </p>
              <p className="text-xs text-red-700 dark:text-red-300/90 leading-relaxed">
                Pengiriman email dengan akun Gmail terhubung dihentikan. Silakan hubungkan ulang akun Gmail Anda di menu Pengaturan untuk dapat kembali mengirim email.
              </p>
            </div>
          </div>
          <Link href="/app/settings" className="self-end sm:self-auto shrink-0">
            <Button size="sm" variant="destructive" className="font-medium">
              Hubungkan Ulang Gmail
            </Button>
          </Link>
        </div>
      )}

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
        <RecipientsTable
          batchId={batch.id}
          recipients={recipients}
          isSimulated={gmailStatus.isSimulated}
          contacts={userContacts}
        />
      </div>
    </div>
  );
}
