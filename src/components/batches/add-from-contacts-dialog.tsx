"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { addRecipientsFromContacts } from "@/lib/actions/batch-contacts";
import { Users, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/lib/db/schema";
import type { RecipientRow } from "@/components/recipients/recipients-table";

interface AddFromContactsDialogProps {
  batchId: string;
  recipients: RecipientRow[];
  contacts: Contact[];
}

export function AddFromContactsDialog({
  batchId,
  recipients,
  contacts,
}: AddFromContactsDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const router = useRouter();

  // Set of emails already in this batch
  const existingEmails = useMemo(
    () => new Set(recipients.map((r) => r.email.toLowerCase())),
    [recipients]
  );

  const currentCount = recipients.length;
  const remainingSlots = Math.max(0, 50 - currentCount);

  // Filter contacts by search query (only active contacts)
  const activeContacts = useMemo(
    () => contacts.filter((c) => !c.archivedAt),
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeContacts;
    return activeContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [activeContacts, search]);

  const handleToggle = (id: string, email: string) => {
    if (existingEmails.has(email.toLowerCase())) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= remainingSlots) {
          alert(`Maksimal ${remainingSlots} penerima lagi yang dapat ditambahkan ke batch ini.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const available = filteredContacts.filter(
      (c) => !existingEmails.has(c.email.toLowerCase())
    );

    const next = new Set(selectedIds);
    for (const c of available) {
      if (next.size >= remainingSlots) break;
      next.add(c.id);
    }
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    setError(null);
    setResultMessage(null);

    try {
      const res = await addRecipientsFromContacts(batchId, Array.from(selectedIds));
      if (!res.success) {
        setError(res.error || "Gagal menambahkan kontak.");
      } else {
        let msg = `Berhasil menambahkan ${res.addedCount} penerima dari buku kontak.`;
        if (res.skippedExistingCount > 0) {
          msg += ` (${res.skippedExistingCount} kontak dilewati karena sudah ada)`;
        }
        if (res.notFittingCount > 0) {
          msg += ` Catatan: ${res.notFittingCount} kontak tidak muat karena batas 50 per batch.`;
        }
        setResultMessage(msg);
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedIds(new Set());
    setSearch("");
    setError(null);
    setResultMessage(null);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={remainingSlots <= 0}
        className="font-medium"
        title={remainingSlots <= 0 ? "Batas 50 penerima tercapai" : "Pilih dari buku kontak"}
      >
        <Users className="w-4 h-4 mr-1.5" />
        Tambah dari Daftar
      </Button>

      <Dialog open={open} onOpenChange={(val) => (val ? setOpen(true) : handleClose())}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Tambah Penerima dari Buku Kontak</span>
            </DialogTitle>
            <DialogDescription>
              Pilih satu atau beberapa kontak aktif untuk disalin ke dalam batch ini. Sisa slot:{" "}
              <strong>{remainingSlots}</strong> penerima.
            </DialogDescription>
          </DialogHeader>

          {/* Search and Selection Counter */}
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Cari nama atau email kontak..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <span>
                  Dipilih: <strong>{selectedIds.size}</strong> kontak
                </span>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-100 underline"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              <button
                onClick={handleSelectAllFiltered}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 underline font-medium"
              >
                Pilih Semua yang Cocok
              </button>
            </div>
          </div>

          {resultMessage && (
            <div className="p-3 text-xs rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
              {resultMessage}
            </div>
          )}

          {error && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200">
              {error}
            </div>
          )}

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-100 dark:divide-neutral-900 max-h-72">
            {filteredContacts.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400">
                {search ? "Tidak ada kontak yang cocok." : "Belum ada kontak aktif tersimpan."}
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isAlreadyInBatch = existingEmails.has(c.email.toLowerCase());
                const isSelected = selectedIds.has(c.id);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggle(c.id, c.email)}
                    className={`flex items-center justify-between p-3 text-xs transition-colors cursor-pointer select-none ${
                      isAlreadyInBatch
                        ? "bg-neutral-50/70 dark:bg-neutral-900/40 opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-blue-50/60 dark:bg-blue-950/30"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isAlreadyInBatch}
                        onChange={() => {}} // handled by row click
                        className="h-4 w-4 rounded border-neutral-300 text-blue-600 pointer-events-none"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {c.name}
                        </p>
                        <p className="text-neutral-500 font-mono text-[11px] truncate">{c.email}</p>
                      </div>
                    </div>

                    {isAlreadyInBatch && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        Sudah ada di batch
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Tutup
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.size === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menambahkan...
                </>
              ) : (
                `Tambahkan (${selectedIds.size}) ke Batch`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
