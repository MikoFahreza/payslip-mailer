import type { Metadata } from "next";
import Link from "next/link";
import { getContactCounts } from "@/lib/actions/contact";
import { BulkImportContactsForm } from "@/components/contacts/bulk-import-contacts-form";
import { ArrowLeft, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Impor Kontak — Payslip Mailer",
};

export default async function ImportContactsPage() {
  const counts = await getContactCounts();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link
          href="/app/contacts"
          className="inline-flex items-center hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Buku Kontak
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-medium">
          Impor CSV / Excel
        </span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Impor Massal Kontak
            </h1>
          </div>
          <p className="text-xs text-neutral-500">
            Unggah berkas spreadsheet CSV atau Excel untuk menyimpan kontak karyawan secara massal ke buku kontak Anda.
          </p>
        </div>
      </div>

      {/* Bulk Import Form */}
      <BulkImportContactsForm currentCount={counts.active} max={counts.max} />
    </div>
  );
}
