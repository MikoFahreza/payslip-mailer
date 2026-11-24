"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateContactDialog } from "./create-contact-dialog";
import { EditContactDialog } from "./edit-contact-dialog";
import { DeleteContactDialog } from "./delete-contact-dialog";
import { archiveContact, restoreContact } from "@/lib/actions/contact";
import {
  Search,
  UploadCloud,
  Archive,
  ArchiveRestore,
  Users,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/lib/db/schema";

interface ContactsViewProps {
  contacts: Contact[];
  counts: { active: number; archived: number; total: number; max: number };
}

export function ContactsView({ contacts, counts }: ContactsViewProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"active" | "archived" | "all">("active");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const filtered = contacts.filter((c) => {
    const query = search.toLowerCase();
    const matchQuery =
      c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query);

    if (!matchQuery) return false;

    if (tab === "active") return !c.archivedAt;
    if (tab === "archived") return !!c.archivedAt;
    return true;
  });

  const handleArchive = async (id: string) => {
    setActionLoadingId(id);
    try {
      await archiveContact(id);
      router.refresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async (id: string) => {
    setActionLoadingId(id);
    try {
      await restoreContact(id);
      router.refresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  const percentUsed = Math.min(100, Math.round((counts.active / counts.max) * 100));

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Buku Kontak
            </h1>
            <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              <span>{counts.active} aktif</span>
              <span>•</span>
              <span>{counts.max} maks</span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Kelola direktori kontak karyawan agar dapat digunakan kembali pada berbagai batch slip gaji.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/app/contacts/import">
            <Button variant="outline" size="sm" className="font-medium">
              <UploadCloud className="w-4 h-4 mr-1.5" />
              Impor CSV / Excel
            </Button>
          </Link>
          <CreateContactDialog currentTotal={counts.active} max={counts.max} />
        </div>
      </div>

      {/* Quota Progress Bar */}
      <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <span>Kapasitas Kontak Pengguna:</span>
          <strong className="text-neutral-900 dark:text-neutral-100">
            {counts.active} / {counts.max} kontak aktif ({counts.max - counts.active} tersisa)
          </strong>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-36 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                counts.active >= 180
                  ? "bg-red-500"
                  : counts.active >= 150
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">{percentUsed}%</span>
        </div>
      </div>

      {/* Filters: Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-lg text-xs font-medium self-start">
          <button
            onClick={() => setTab("active")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              tab === "active"
                ? "bg-white text-neutral-950 dark:bg-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            Aktif ({counts.active})
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              tab === "archived"
                ? "bg-white text-neutral-950 dark:bg-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            Diarsipkan ({counts.archived})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              tab === "all"
                ? "bg-white text-neutral-950 dark:bg-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            Semua ({counts.total})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base">Tidak Ada Kontak Ditemukan</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {search
                ? `Tidak ada kontak yang cocok dengan kata kunci "${search}".`
                : tab === "archived"
                  ? "Tidak ada kontak yang diarsipkan."
                  : "Mulai simpan daftar kontak Anda dengan tombol Tambah Kontak atau Impor CSV / Excel."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50">
              <TableRow>
                <TableHead className="w-[30%]">Nama Lengkap</TableHead>
                <TableHead className="w-[35%]">Alamat Email</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="text-right w-[20%]">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const isArchived = !!c.archivedAt;
                const isLoading = actionLoadingId === c.id;

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-neutral-600 dark:text-neutral-400 font-mono text-xs">
                      {c.email}
                    </TableCell>
                    <TableCell>
                      {isArchived ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                          <Archive className="w-3 h-3" />
                          Diarsipkan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditContactDialog contact={c} />

                        {isArchived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(c.id)}
                            disabled={isLoading}
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            title="Pulihkan kontak ke aktif"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(c.id)}
                            disabled={isLoading}
                            className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Arsipkan kontak"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}

                        <DeleteContactDialog contact={c} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
