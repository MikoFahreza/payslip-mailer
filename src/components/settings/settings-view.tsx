"use client";

import { useTransition, useState } from "react";
import { disconnectGmailAction, deleteAccountAction, type GmailConnectionInfo } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  RefreshCw,
  Trash2,
  Unlink,
  ExternalLink,
} from "lucide-react";

export function SettingsView({
  connection,
  userEmail,
  userName,
  queryConnected,
  queryError,
}: {
  connection: GmailConnectionInfo;
  userEmail?: string | null;
  userName?: string | null;
  queryConnected?: boolean;
  queryError?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(queryError || null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(
    queryConnected ? "Akun Gmail berhasil dihubungkan!" : null
  );

  const handleDisconnect = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await disconnectGmailAction();
      if (!res.success) {
        setActionError(res.error || "Gagal memutuskan Gmail.");
      } else {
        setShowDisconnectModal(false);
        setActionSuccess("Koneksi Gmail berhasil diputuskan.");
      }
    });
  };

  const handleDeleteAccount = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await deleteAccountAction();
      if (!res.success) {
        setActionError(res.error || "Gagal menghapus akun.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Pengaturan Akun & Layanan
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Kelola profil pengguna, integrasi pengiriman Gmail, dan privasi akun Anda.
        </p>
      </div>

      {actionSuccess && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 text-sm rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 text-sm rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Profil Pengguna */}
      <Card className="border-neutral-200 dark:border-neutral-800">
        <CardHeader>
          <CardTitle className="text-lg">Profil Pengguna</CardTitle>
          <CardDescription>Informasi akun yang saat ini aktif.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 text-sm">
            <span className="text-neutral-500">Nama Pengguna</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{userName || "Pengguna"}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 text-sm">
            <span className="text-neutral-500">Alamat Email</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{userEmail || "-"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Integrasi Gmail */}
      <Card className="border-neutral-200 dark:border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                <span>Koneksi Gmail Pengirim</span>
              </CardTitle>
              <CardDescription>
                Hubungkan akun Gmail untuk mengirimkan slip gaji langsung dari email pribadi atau kantor Anda.
              </CardDescription>
            </div>
            {connection.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Terhubung
              </span>
            ) : connection.status === "revoked" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Otorisasi Kedaluwarsa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                Belum Terhubung
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {connection.connected ? (
            <div className="rounded-lg p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm">
                <span className="text-neutral-500">Email Gmail Pengirim:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {connection.gmailEmail}
                </span>
              </div>
              {connection.connectedAt && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-500">
                  <span>Terhubung sejak:</span>
                  <span>{new Date(connection.connectedAt).toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>
          ) : connection.status === "revoked" ? (
            <div className="p-4 rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900 space-y-2 text-sm">
              <p className="font-semibold flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                Akses Gmail telah dicabut atau kedaluwarsa.
              </p>
              <p className="text-xs">
                Email pengirim sebelumnya: <strong>{connection.gmailEmail}</strong>. Harap hubungkan ulang akun Gmail Anda agar pengiriman email dapat dilanjutkan.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm">
              <p>
                Akun Gmail Anda belum terhubung. Anda tetap dapat menggunakan aplikasi dalam <strong>mode simulasi</strong>, atau hubungkan akun Gmail untuk mengirim email riil.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
          {connection.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnectModal(true)}
              disabled={isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Unlink className="w-4 h-4 mr-2" />
              Putuskan Gmail
            </Button>
          ) : (
            <a href="/api/gmail/connect">
              <Button size="sm" className="font-semibold flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {connection.status === "revoked" ? "Hubungkan Ulang Gmail" : "Hubungkan Gmail"}
              </Button>
            </a>
          )}
        </CardFooter>
      </Card>

      {/* Zona Bahaya / Hapus Akun */}
      <Card className="border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            <span>Zona Bahaya: Hapus Akun</span>
          </CardTitle>
          <CardDescription>
            Menghapus akun Anda beserta seluruh data batch, penerima, lampiran, dan token Gmail secara permanen. Tindakan ini tidak dapat dibatalkan.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            disabled={isPending}
          >
            Hapus Akun dan Semua Data
          </Button>
        </CardFooter>
      </Card>

      {/* Modal Konfirmasi Putuskan Gmail */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Putuskan Koneksi Gmail?</DialogTitle>
            <DialogDescription>
              Aplikasi akan mencabut otorisasi pengiriman email dari akun Gmail ({connection.gmailEmail}). Anda dapat menghubungkannya kembali kapan saja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDisconnectModal(false)} disabled={isPending}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={isPending}>
              {isPending ? "Memutuskan..." : "Ya, Putuskan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Akun */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Konfirmasi Hapus Akun Permanen</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun Anda ({userEmail})? Semua batch, daftar penerima, berkas lampiran di penyimpanan, dan koneksi Gmail akan dihapus seutuhnya.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isPending}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isPending}>
              {isPending ? "Menghapus Akun..." : "Hapus Akun Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
