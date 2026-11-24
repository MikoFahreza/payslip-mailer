"use client";

import { useState, useRef, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  validateImportRows,
  SAMPLE_CSV_CONTENT,
  type RawImportRow,
  type ValidatedImportRow,
} from "@/lib/validations/import";
import { importRecipientsBatch } from "@/lib/actions/import";
import { MAX_RECIPIENTS_PER_BATCH } from "@/lib/validations/recipient";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface BulkImportFormProps {
  batchId: string;
  batchName: string;
  existingEmails: string[];
  currentCount: number;
}

export function BulkImportForm({
  batchId,
  batchName,
  existingEmails,
  currentCount,
}: BulkImportFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [filename, setFilename] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRawData, setParsedRawData] = useState<Record<string, string>[]>([]);
  const [nameColumn, setNameColumn] = useState<string>("");
  const [emailColumn, setEmailColumn] = useState<string>("");

  const [filterTab, setFilterTab] = useState<"all" | "valid" | "invalid">("all");
  const [onlyValid, setOnlyValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const remainingSlots = Math.max(0, MAX_RECIPIENTS_PER_BATCH - currentCount);

  // Download Sample CSV
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "contoh_penerima_payslip.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle File Upload and Client Parsing (CSV or XLSX)
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
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
            defval: "",
          });

          if (jsonData.length === 0) {
            setErrorMessage("File Excel kosong.");
            return;
          }

          const detectedHeaders = Object.keys(jsonData[0] || {});
          applyHeadersAndData(detectedHeaders, jsonData);
        } catch (excelErr: unknown) {
          const err = excelErr as Error;
          setErrorMessage(`Gagal membaca file Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setErrorMessage("Format file tidak didukung. Harap pilih file .csv, .xlsx, atau .xls.");
    }
  };

  const applyHeadersAndData = (detectedHeaders: string[], data: Record<string, string>[]) => {
    setHeaders(detectedHeaders);
    setParsedRawData(data);

    // Auto-detect Name and Email column
    const nameMatch =
      detectedHeaders.find(
        (h) =>
          h.toLowerCase().includes("nama") ||
          h.toLowerCase().includes("name") ||
          h.toLowerCase().includes("pegawai") ||
          h.toLowerCase().includes("karyawan")
      ) ||
      detectedHeaders[0] ||
      "";

    const emailMatch =
      detectedHeaders.find(
        (h) =>
          h.toLowerCase().includes("email") ||
          h.toLowerCase().includes("surel") ||
          h.toLowerCase().includes("mail")
      ) ||
      detectedHeaders[1] ||
      "";

    setNameColumn(nameMatch);
    setEmailColumn(emailMatch);
  };

  // Convert raw records into mapped rows and validate
  const { validatedRows, summary } = useMemo(() => {
    if (!nameColumn || !emailColumn || parsedRawData.length === 0) {
      return {
        validatedRows: [] as ValidatedImportRow[],
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          warningRows: 0,
          duplicateInFileCount: 0,
          duplicateInBatchCount: 0,
        },
      };
    }

    const rawRows: RawImportRow[] = parsedRawData.map((record, index) => ({
      rowNumber: index + 2, // Excel/CSV header is row 1
      name: String(record[nameColumn] || ""),
      email: String(record[emailColumn] || ""),
    }));

    return validateImportRows(rawRows, existingEmails);
  }, [parsedRawData, nameColumn, emailColumn, existingEmails]);

  // Filter rows based on user tab selection
  const filteredPreviewRows = useMemo(() => {
    if (filterTab === "valid") {
      return validatedRows.filter((r) => r.isValid);
    }
    if (filterTab === "invalid") {
      return validatedRows.filter((r) => !r.isValid);
    }
    return validatedRows;
  }, [validatedRows, filterTab]);

  // Candidates for import
  const candidatesToImport = useMemo(() => {
    if (onlyValid) {
      return validatedRows.filter((r) => r.isValid);
    }
    return validatedRows;
  }, [validatedRows, onlyValid]);

  const willExceedQuota = candidatesToImport.length > remainingSlots;

  const handleImportSubmit = () => {
    if (candidatesToImport.length === 0) {
      setErrorMessage("Tidak ada baris yang dapat diimpor.");
      return;
    }

    if (willExceedQuota) {
      setErrorMessage(
        `Jumlah penerima (${candidatesToImport.length}) melebihi sisa kuota batch ini (${remainingSlots} slot tersisa).`
      );
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const payload = candidatesToImport.map((r) => ({
        name: r.name,
        email: r.email,
      }));

      const res = await importRecipientsBatch(batchId, payload);
      if (!res.success) {
        setErrorMessage(res.error || "Gagal melakukan impor massal.");
      } else {
        router.push(`/app/batches/${batchId}`);
        router.refresh();
      }
    });
  };

  const handleReset = () => {
    setFilename(null);
    setHeaders([]);
    setParsedRawData([]);
    setNameColumn("");
    setEmailColumn("");
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Guidance */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Impor Penerima untuk Batch: <strong className="text-blue-600">{batchName}</strong>
          </p>
          <p className="text-xs text-neutral-500">
            Sisa kuota: <strong>{remainingSlots}</strong> dari maksimal {MAX_RECIPIENTS_PER_BATCH}{" "}
            penerima (saat ini terisi {currentCount}).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadSample}
          className="gap-2 text-xs font-medium self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Contoh CSV</span>
        </Button>
      </div>

      {/* Step 1: File Upload Box */}
      {!filename ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors rounded-2xl p-10 text-center cursor-pointer bg-neutral-50/50 dark:bg-neutral-950/50 space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Pilih atau seret file CSV / Excel ke sini
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Mendukung format .csv, .xlsx, atau .xls. File akan diproses di browser Anda sebelum
              disimpan.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            className="text-xs pointer-events-none"
          >
            Jelajahi File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {filename}
              </p>
              <p className="text-xs text-neutral-500">
                {parsedRawData.length} baris data ditemukan
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-neutral-500"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Ganti File
          </Button>
        </div>
      )}

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 2: Column Mapping & Summary (If file parsed) */}
      {headers.length > 0 && (
        <div className="space-y-6">
          {/* Mapping Controls */}
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Pemetaan Kolom
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Kolom Nama Penerima <span className="text-red-500">*</span>
                </label>
                <select
                  value={nameColumn}
                  onChange={(e) => setNameColumn(e.target.value)}
                  className="w-full h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Kolom Nama --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Kolom Alamat Email <span className="text-red-500">*</span>
                </label>
                <select
                  value={emailColumn}
                  onChange={(e) => setEmailColumn(e.target.value)}
                  className="w-full h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Kolom Email --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Validation Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <span className="text-xs text-neutral-500">Total Baris</span>
              <p className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                {summary.totalRows}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Baris Valid</span>
              </div>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                {summary.validRows}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-red-200 bg-red-50/40 dark:border-red-950 dark:bg-red-950/20">
              <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Baris Bermasalah</span>
              </div>
              <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-0.5">
                {summary.invalidRows}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-950 dark:bg-amber-950/20">
              <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Peringatan Typo</span>
              </div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                {summary.warningRows}
              </p>
            </div>
          </div>

          {/* Quota Warning if exceeding */}
          {willExceedQuota && (
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Peringatan Batas Kuota:</strong> Anda mencoba mengimpor{" "}
                {candidatesToImport.length} penerima, sedangkan sisa kuota batch ini hanya{" "}
                {remainingSlots} penerima lagi. Kurangi baris atau buat batch baru.
              </div>
            </div>
          )}

          {/* Preview Controls & Filter Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs self-start">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    filterTab === "all"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  Semua ({summary.totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("valid")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    filterTab === "valid"
                      ? "bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                      : "text-neutral-500 hover:text-emerald-600"
                  }`}
                >
                  Valid ({summary.validRows})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("invalid")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    filterTab === "invalid"
                      ? "bg-white dark:bg-neutral-900 text-red-700 dark:text-red-400 shadow-xs"
                      : "text-neutral-500 hover:text-red-600"
                  }`}
                >
                  Bermasalah ({summary.invalidRows})
                </button>
              </div>

              {/* Checkbox: Hanya impor baris valid */}
              <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyValid}
                  onChange={(e) => setOnlyValid(e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Hanya impor baris yang valid (lewati baris salah)</span>
              </label>
            </div>

            {/* Preview Table */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-neutral-50/60 dark:bg-neutral-900/60">
                  <TableRow>
                    <TableHead className="w-16 text-center">Baris</TableHead>
                    <TableHead>Nama Penerima</TableHead>
                    <TableHead>Alamat Email</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead>Keterangan / Masalah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPreviewRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-neutral-500">
                        Tidak ada baris pada filter ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPreviewRows.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={!row.isValid ? "bg-red-50/30 dark:bg-red-950/10" : undefined}
                      >
                        <TableCell className="text-center text-xs font-mono text-neutral-400">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                          {row.name || <span className="text-neutral-400 italic">(Kosong)</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                          {row.email || <span className="text-neutral-400 italic">(Kosong)</span>}
                        </TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <Badge variant="success" className="gap-1 text-[11px] font-normal">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Valid</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[11px] font-normal">
                              <AlertCircle className="w-3 h-3" />
                              <span>Bermasalah</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.errors.length > 0 ? (
                            <ul className="text-red-600 dark:text-red-400 list-disc list-inside space-y-0.5">
                              {row.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          ) : row.warnings.length > 0 ? (
                            <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{row.warnings[0]}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/app/batches/${batchId}`)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleImportSubmit}
              disabled={
                isPending ||
                candidatesToImport.length === 0 ||
                willExceedQuota ||
                (!onlyValid && summary.invalidRows > 0)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <span>Impor {candidatesToImport.length} Penerima</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
