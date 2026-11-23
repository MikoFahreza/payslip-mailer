"use client";

import { useState, useTransition } from "react";
import { updateRecipient } from "@/lib/actions/recipient";
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
import { Edit2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Recipient } from "@/lib/db/schema";

export function EditRecipientDialog({
  recipient,
  batchId,
}: {
  recipient: Recipient;
  batchId: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(recipient.name);
  const [email, setEmail] = useState(recipient.email);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleOpen = () => {
    setName(recipient.name);
    setEmail(recipient.email);
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
      const res = await updateRecipient(recipient.id, batchId, {
        name: validation.data.name,
        email: validation.data.email,
      });

      if (!res.success) {
        setError(res.error || "Gagal memperbarui penerima.");
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        title="Ubah Penerima"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Ubah Data Penerima</DialogTitle>
            <DialogDescription>Perbarui nama atau email penerima slip gaji.</DialogDescription>
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
              <Label htmlFor={`edit-name-${recipient.id}`}>Nama Penerima</Label>
              <Input
                id={`edit-name-${recipient.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-email-${recipient.id}`}>Alamat Email</Label>
              <Input
                id={`edit-email-${recipient.id}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                required
              />
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
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
