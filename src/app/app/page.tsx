import type { Metadata } from "next";
import Link from "next/link";
import { getBatches } from "@/lib/actions/batch";
import { CreateBatchDialog } from "@/components/batches/create-batch-dialog";
import { DeleteBatchDialog } from "@/components/batches/delete-batch-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Layers,
  ArrowRight,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Database,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Daftar Batch — Payslip Mailer",
  description: "Kelola batch pengiriman slip gaji karyawan.",
};

export default async function AppDashboardPage() {
  const batches = await getBatches();
  const isDbPlaceholder = process.env.DATABASE_URL?.includes("ep-sample-pooler");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Batch Pengiriman</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Kelola periode pengiriman, daftar penerima, dan proses pengiriman slip gaji.
          </p>
        </div>

        <div>
          <CreateBatchDialog />
        </div>
      </div>

      {/* Database Connection Notice if still placeholder */}
      {isDbPlaceholder && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-sm">
          <Database className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold">DATABASE_URL Masih Berupa Placeholder</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Untuk menyimpan data batch dan penerima secara permanen ke Neon Postgres, silakan
              perbarui variabel{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-[11px]">
                DATABASE_URL
              </code>{" "}
              di file{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-[11px]">
                .env.local
              </code>{" "}
              dengan connection string Neon Anda, lalu jalankan{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-[11px]">
                npm run db:migrate
              </code>
              .
            </p>
          </div>
        </div>
      )}

      {/* Batch Cards Grid or Empty State */}
      {batches.length === 0 ? (
        <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-800 bg-transparent">
          <CardHeader className="text-center py-16">
            <div className="mx-auto w-14 h-14 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
              <Layers className="w-7 h-7 text-neutral-400" />
            </div>
            <CardTitle className="text-xl">Belum Ada Batch Pengiriman</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2">
              Mulai dengan membuat batch baru untuk mengelompokkan pengiriman slip gaji karyawan
              berdasarkan periode tertentu.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-12">
            <CreateBatchDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((batch) => (
            <Card
              key={batch.id}
              className="flex flex-col justify-between hover:shadow-md transition-shadow border-neutral-200 dark:border-neutral-800"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-bold hover:text-emerald-600 transition-colors">
                    <Link href={`/app/batches/${batch.id}`}>{batch.name}</Link>
                  </CardTitle>
                  <DeleteBatchDialog batchId={batch.id} batchName={batch.name} />
                </div>
                <CardDescription className="flex items-center gap-1.5 text-xs text-neutral-400 pt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(batch.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Total Penerima</span>
                  </div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {batch.totalRecipients} / 50
                  </span>
                </div>

                {/* Status Summary Pills */}
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    {batch.sentCount}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <Clock className="w-3 h-3" />
                    {batch.pendingCount}
                  </span>
                  {batch.failedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      <XCircle className="w-3 h-3" />
                      {batch.failedCount}
                    </span>
                  )}
                </div>
              </CardContent>

              <div className="p-4 pt-0 mt-auto border-t border-neutral-50 dark:border-neutral-900/50">
                <Link href={`/app/batches/${batch.id}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full font-medium mt-3">
                    Buka Batch
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
