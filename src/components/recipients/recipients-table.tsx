"use client";

import { useState } from "react";
import type { Recipient, Attachment } from "@/lib/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { RecipientStatusBadge } from "./recipient-status-badge";
import { EditRecipientDialog } from "./edit-recipient-dialog";
import { DeleteRecipientDialog } from "./delete-recipient-dialog";
import { AddRecipientDialog } from "./add-recipient-dialog";
import { SendSingleButton } from "./send-single-button";
import { ResolveUnknownDialog } from "./resolve-unknown-dialog";
import { RecipientAttachmentsCell } from "@/components/attachments/recipient-attachments-cell";
import { Search, Users, AlertCircle } from "lucide-react";

export type RecipientRow = Recipient & { attachments?: Attachment[] };

export function RecipientsTable({
  batchId,
  recipients,
}: {
  batchId: string;
  recipients: RecipientRow[];
}) {
  const [search, setSearch] = useState("");

  const filtered = recipients.filter((r) => {
    const query = search.toLowerCase();
    return r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query);
  });

  const totalCount = recipients.length;
  const maxLimit = 50;
  const percentFilled = Math.min(100, Math.round((totalCount / maxLimit) * 100));

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Quota, Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          {/* Quota Counter */}
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span>Kuota:</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {totalCount} / {maxLimit}
            </span>
            <div className="w-16 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalCount >= 45
                    ? "bg-amber-500"
                    : totalCount >= 50
                      ? "bg-red-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>
          </div>

          <AddRecipientDialog batchId={batchId} currentCount={totalCount} />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm overflow-hidden">
        {recipients.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base">Belum Ada Penerima</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
              Tambahkan penerima satu-persatu dengan tombol di atas atau melalui impor massal.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-sm">
            Tidak ada penerima yang cocok dengan pencarian &quot;{search}&quot;.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Penerima</TableHead>
                <TableHead>Alamat Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lampiran</TableHead>
                <TableHead>Catatan / Waktu</TableHead>
                <TableHead className="w-36 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((recipient, index) => (
                <TableRow key={recipient.id}>
                  <TableCell className="text-center text-neutral-400 text-xs font-mono">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                    {recipient.name}
                  </TableCell>
                  <TableCell className="text-neutral-600 dark:text-neutral-400 font-mono text-xs">
                    {recipient.email}
                  </TableCell>
                  <TableCell>
                    <RecipientStatusBadge status={recipient.status} />
                  </TableCell>
                  <TableCell>
                    <RecipientAttachmentsCell
                      batchId={batchId}
                      recipientId={recipient.id}
                      recipientName={recipient.name}
                      attachments={recipient.attachments}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-neutral-500">
                    {recipient.sentAt ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {new Date(recipient.sentAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    ) : recipient.errorMessage ? (
                      <span
                        className="text-red-600 dark:text-red-400 flex items-center gap-1.5 max-w-xs cursor-help"
                        title={recipient.errorMessage}
                      >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                        <span className="truncate">{recipient.errorMessage}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {recipient.status === "unknown" ? (
                        <ResolveUnknownDialog
                          recipientId={recipient.id}
                          recipientName={recipient.name}
                          recipientEmail={recipient.email}
                          errorMessage={recipient.errorMessage}
                        />
                      ) : (
                        <SendSingleButton
                          recipientId={recipient.id}
                          recipientName={recipient.name}
                          status={recipient.status}
                        />
                      )}
                      <EditRecipientDialog recipient={recipient} batchId={batchId} />
                      <DeleteRecipientDialog
                        recipientId={recipient.id}
                        recipientName={recipient.name}
                        recipientEmail={recipient.email}
                        batchId={batchId}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
