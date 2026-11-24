"use client";

import { useState, useRef, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  validateImportRows,
  SAMPLE_CSV_CONTENT,
  type ValidatedImportRow,
} from "@/lib/validations/import";
import { upsertContactsBatch } from "@/lib/actions/contact";
import type { ContactUpsertReport } from "@/lib/validations/contact";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

export function BulkImportContactsForm({ currentCount, max }: { currentCount: number; max: number }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [filename, setFilename] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRawData, setParsedRawData] = useState<Record<string, string>[]>([]);
  const [nameColumn, setNameColumn] = useState<string>("");
  const [emailColumn, setEmailColumn] = useState<string>("");

  const [filterTab, setFilterTab] = useState<"all" | "valid" | "invalid">("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<ContactUpsertReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // Download Sample CSV
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "contoh_kontak.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMessage(null);
    if (!file) return;

    setFilename(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          if (results.data.length === 0) {
            setErrorMessage("File CSV kosong.");
            return;
          }
          const detectedHeaders = results.meta.fields || Object.keys(results.data[0] || {});
          applyHeadersAndData(detectedHeaders, results.data);
        },
        error: (err) => {
          setErrorMessage(`Gagal membaca file CSV: ${err.message}`);
        },
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target?.result;
          const workbook = XLSX.read(buffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
            defval: "",
          });

          if (jsonData.length === 0) {
            setErrorMessage("Lembar kerja Excel kosong.");
            return;
          }

          const detectedHeaders = Object.keys(jsonData[0] || {});
          applyHeadersAndData(detectedHeaders, jsonData);
        } catch (err: unknown) {
          const error = err as Error;
          setErrorMessage(`Gagal membaca file Excel: ${error.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setErrorMessage("Format file tidak didukung. Harap unggah file .csv, .xlsx, atau .xls.");
    }
  };

  const applyHeadersAndData = (detectedHeaders: string[], data: Record<string, string>[]) => {
    setHeaders(detectedHeaders);
    setParsedRawData(data);

    // Smart auto-detection for column headers
    let foundName = "";
    let foundEmail = "";

    for (const h of detectedHeaders) {
      const norm = h.trim().toLowerCase();
      if (!foundName && (norm === "nama" || norm === "name" || norm.includes("nama") || norm.includes("name"))) {
        foundName = h;
      }
      if (!foundEmail && (norm === "email" || norm === "surel" || norm.includes("email") || norm.includes("mail"))) {
        foundEmail = h;
      }
    }

    setNameColumn(foundName || detectedHeaders[0] || "");
    setEmailColumn(foundEmail || detectedHeaders[1] || detectedHeaders[0] || "");
  };

  const validationResult = useMemo(() => {
    if (!nameColumn || !emailColumn || parsedRawData.length === 0) {
      return null;
    }

    const rawRows = parsedRawData.map((row, idx) => ({
      rowNumber: idx + 1,
      name: String(row[nameColumn] || "").trim(),
      email: String(row[emailColumn] || "").trim(),
    }));

    // Contacts table doesn't block existing emails because it upserts them!
    return validateImportRows(rawRows, []);
  }, [parsedRawData, nameColumn, emailColumn]);

  const displayedRows = useMemo(() => {
    if (!validationResult) return [];
    if (filterTab === "valid") {
      return validationResult.validatedRows.filter((r) => r.isValid);
    }
    if (filterTab === "invalid") {
      return validationResult.validatedRows.filter((r) => !r.isValid);
    }
    return validationResult.validatedRows;
  }, [validationResult, filterTab]);

  const handleReset = () => {
    setFilename(null);
    setHeaders([]);
    setParsedRawData([]);
    setNameColumn("");
    setEmailColumn("");
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportSubmit = () => {
    if (!validationResult) return;

    const validItems = validationResult.validatedRows
      .filter((r) => r.isValid)
      .map((r) => ({
        name: r.name,
        email: r.email,
      }));

    if (validItems.length === 0) {
      setErrorMessage("Tidak ada baris valid untuk diimpor.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await upsertContactsBatch(validItems);
        setReport(res);
        setReportOpen(true);
      } catch (err: unknown) {
        setErrorMessage((err as Error).message || "Terjadi kesalahan saat menyimpan kontak.");
      }
    });
  };

  const handleFinish = () => {
    setReportOpen(false);
    router.push("/app/contacts");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone & Download Sample */}
      {!filename ? (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-10 text-center cursor-pointer bg-white/50 dark:bg-neutral-900/40 hover:bg-neutral-50 dark:hover:bg-neutral-900/70 transition-all flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Pilih atau seret file CSV / Excel ke sini
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Mendukung format .csv, .xlsx, dan .xls dengan kolom Nama dan Email
              </p>
            </div>
            <Button size="sm" variant="outline" className="text-xs pointer-events-none mt-2 font-medium">
              Telusuri Berkas
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-neutral-400" />
              <span>
                Kapasitas: {currentCount} / {max} kontak aktif
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Contoh Template CSV</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active File Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{filename}</p>
                <p className="text-xs text-neutral-500">
                  {parsedRawData.length} baris data ditemukan
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="self-end sm:self-auto text-xs gap-1.5 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Ganti File
            </Button>
          </div>

          {/* Column Mapping Section */}
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Pemetaan Kolom
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Kolom Nama Lengkap
                </label>
                <select
                  value={nameColumn}
                  onChange={(e) => setNameColumn(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-neutral-100"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Kolom Alamat Email
                </label>
                <select
                  value={emailColumn}
                  onChange={(e) => setEmailColumn(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-neutral-100"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Validation Metrics */}
          {validationResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <span className="text-xs text-neutral-500">Total Baris</span>
                <p className="text-xl font-bold mt-1 text-neutral-800 dark:text-neutral-200">
                  {validationResult.summary.totalRows}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Valid / Siap Impor
                </span>
                <p className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                  {validationResult.summary.validRows}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20">
                <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                  Format Bermasalah
                </span>
                <p className="text-xl font-bold mt-1 text-red-700 dark:text-red-300">
                  {validationResult.summary.invalidRows}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-950 bg-amber-50/50 dark:bg-amber-950/20">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Duplikat / Typo
                </span>
                <p className="text-xl font-bold mt-1 text-amber-700 dark:text-amber-300">
                  {validationResult.summary.duplicateInFileCount + validationResult.summary.warningRows}
                </p>
              </div>
            </div>
          )}

          {/* Tabs Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-lg text-xs font-medium self-start w-fit">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterTab === "all"
                  ? "bg-white text-neutral-950 dark:bg-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              Semua ({validationResult?.summary.totalRows || 0})
            </button>
            <button
              onClick={() => setFilterTab("valid")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterTab === "valid"
                  ? "bg-white text-neutral-950 dark:bg-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              Valid ({validationResult?.summary.validRows || 0})
            </button>
            <button
              onClick={() => setFilterTab("invalid")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterTab === "invalid"
                  ? "bg-white text-neutral-950 dark:bg-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              Bermasalah ({validationResult?.summary.invalidRows || 0})
            </button>
          </div>

          {/* Preview Table */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm overflow-hidden max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status Validasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRows.map((row: ValidatedImportRow) => (
                  <TableRow key={row.rowNumber} className={!row.isValid ? "bg-red-50/30 dark:bg-red-950/20" : ""}>
                    <TableCell className="text-neutral-500 text-xs">{row.rowNumber}</TableCell>
                    <TableCell className="font-medium text-xs text-neutral-900 dark:text-neutral-100">
                      {row.name || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {row.email || "—"}
                      {row.suggestedEmail && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-sans mt-0.5">
                          Saran perbaikan: {row.suggestedEmail}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.isValid ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Valid</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {row.errors.map((err, i) => (
                            <div key={i} className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>{err}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500">
              * Kontak yang sudah ada dengan email yang sama akan otomatis diperbarui namanya.
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={isPending}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleImportSubmit}
                disabled={isPending || !validationResult || validationResult.summary.validRows === 0}
                className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 font-medium gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Kontak...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan {validationResult?.summary.validRows || 0} Kontak</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary Report Modal */}
      {report && (
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Hasil Impor Kontak</span>
              </DialogTitle>
              <DialogDescription>
                Laporan pemrosesan kontak dari file yang diunggah.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20">
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Kontak Baru</span>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {report.newCount}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-950 dark:bg-blue-950/20">
                  <span className="text-blue-700 dark:text-blue-400 font-medium">Diperbarui</span>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                    {report.updatedCount}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-950 dark:bg-amber-950/20">
                  <span className="text-amber-700 dark:text-amber-400 font-medium">Dilewati</span>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                    {report.skippedCount}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-red-200 bg-red-50/50 dark:border-red-950 dark:bg-red-950/20">
                  <span className="text-red-700 dark:text-red-400 font-medium">Bermasalah</span>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                    {report.problematicCount}
                  </p>
                </div>
              </div>

              {report.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1 max-h-32 overflow-y-auto">
                  <p className="font-semibold text-neutral-700 dark:text-neutral-300">Catatan Pengecualian:</p>
                  {report.errors.slice(0, 5).map((e, idx) => (
                    <p key={idx} className="text-neutral-500 truncate">
                      Baris {e.row} ({e.email}): {e.message}
                    </p>
                  ))}
                  {report.errors.length > 5 && (
                    <p className="text-neutral-400 italic">...dan {report.errors.length - 5} baris lainnya</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleFinish} className="w-full">
                Selesai & Buka Buku Kontak
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
