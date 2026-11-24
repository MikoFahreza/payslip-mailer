import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBatchById } from "@/lib/actions/batch";
import { BulkImportForm } from "@/components/import/bulk-import-form";
import { ArrowLeft, UploadCloud } from "lucide-react";

interface ImportPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ImportPageProps): Promise<Metadata> {
  const { id } = await params;
  const batch = await getBatchById(id);

  return {
    title: batch ? `Impor Penerima — ${batch.name}` : "Batch Tidak Ditemukan",
  };
}

export default async function BatchImportPage({ params }: ImportPageProps) {
  const { id } = await params;
  const batch = await getBatchById(id);

  if (!batch) {
    notFound();
  }

  const existingEmails = batch.recipients.map((r) => r.email);
  const currentCount = batch.recipients.length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link
          href={`/app/batches/${batch.id}`}
          className="inline-flex items-center hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Kembali ke {batch.name}
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-medium">
          Impor Massal Penerima
        </span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Impor Massal CSV / Excel
            </h1>
          </div>
          <p className="text-xs text-neutral-500">
            Unggah file CSV atau lembar kerja Excel berisi daftar nama dan alamat email penerima
            slip gaji.
          </p>
        </div>
      </div>

      {/* Main Import Form */}
      <BulkImportForm
        batchId={batch.id}
        batchName={batch.name}
        existingEmails={existingEmails}
        currentCount={currentCount}
      />
    </div>
  );
}
