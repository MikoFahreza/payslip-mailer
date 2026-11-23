import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderPlus, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard Batch — Payslip Mailer",
  description: "Daftar batch pengiriman slip gaji karyawan.",
};

export default function AppDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Batch Pengiriman</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Kelola periode pengiriman, daftar penerima, dan proses pengiriman slip gaji.
          </p>
        </div>

        <div>
          <Button disabled className="opacity-80">
            <FolderPlus className="w-4 h-4 mr-2" />
            Buat Batch Baru
          </Button>
        </div>
      </div>

      <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-800 bg-transparent">
        <CardHeader className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <Layers className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
          </div>
          <CardTitle className="text-lg">Belum Ada Batch Aktif</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2">
            Fondasi sistem (Fase 1) telah siap. Fitur pembuatan batch, manajemen penerima, dan
            upload dokumen akan diaktifkan pada fase berikutnya.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-8">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Cek Status Sesi
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
