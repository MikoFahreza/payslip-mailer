"use client";

import { useState, useTransition } from "react";
import { addRecipient } from "@/lib/actions/recipient";
import { recipientSchema } from "@/lib/validations/recipient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function AddRecipientDialog({
  batchId,
  currentCount,
}: {
  batchId: string;
  currentCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saveToContacts, setSaveToContacts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isLimitReached = currentCount >= 50;

  const handleOpen = () => {
    if (isLimitReached) return;
    setName("");
    setEmail("");
    setError(null);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = recipientSchema.safeParse({ name, email });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Data penerima tidak valid.");
      return;
    }

    startTransition(async () => {
      const res = await addRecipient(batchId, {
        name: validation.data.name,
        email: validation.data.email,
        saveToContacts,
      });

      if (!res.success) {
        setError(res.error || "Gagal menambahkan penerima.");
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={isLimitReached}
        size="sm"
        className="font-medium shadow-sm"
        title={isLimitReached ? "Batas maksimal 50 penerima telah tercapai" : "Tambah Penerima"}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Tambah Penerima
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Tambah Penerima Baru</DialogTitle>
            <DialogDescription>
              Masukkan nama lengkap dan alamat email penerima slip gaji ({currentCount}/50
              terdaftar).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 text-sm rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipient-name">Nama Penerima</Label>
              <Input
                id="recipient-name"
                placeholder="mis. Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-email">Alamat Email</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="mis. budi.santoso@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="saveToContacts"
                type="checkbox"
                checked={saveToContacts}
                onChange={(e) => setSaveToContacts(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <Label htmlFor="saveToContacts" className="text-xs font-normal text-neutral-600 dark:text-neutral-400 cursor-pointer">
                Simpan ke daftar kontak (aktif secara default)
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending || !name.trim() || !email.trim()}>
                {isPending ? "Menyimpan..." : "Simpan Penerima"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
