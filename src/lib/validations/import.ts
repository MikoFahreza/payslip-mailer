import { z } from "zod";

export const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmal.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "htmail.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outllok.com": "outlook.com",
  "iclud.com": "icloud.com",
  "icoud.com": "icloud.com",
};

export function checkDomainTypo(email: string): {
  hasTypo: boolean;
  suggestedEmail?: string;
  typoDomain?: string;
  correctDomain?: string;
} {
  const parts = email.toLowerCase().split("@");
  if (parts.length !== 2) return { hasTypo: false };
  const user = parts[0].trim();
  const domain = parts[1].trim();
  const suggestion = COMMON_DOMAIN_TYPOS[domain];
  if (suggestion) {
    return {
      hasTypo: true,
      typoDomain: domain,
      correctDomain: suggestion,
      suggestedEmail: `${user}@${suggestion}`,
    };
  }
  return { hasTypo: false };
}

export const singleImportRecipientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama penerima tidak boleh kosong")
    .max(255, "Nama penerima maksimal 255 karakter"),
  email: z
    .string()
    .trim()
    .email("Format alamat email tidak valid")
    .max(255, "Email maksimal 255 karakter")
    .toLowerCase(),
});

export interface RawImportRow {
  rowNumber: number;
  name: string;
  email: string;
}

export interface ValidatedImportRow {
  rowNumber: number;
  name: string;
  email: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedEmail?: string;
}

export interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  duplicateInFileCount: number;
  duplicateInBatchCount: number;
}

export function validateImportRows(
  rows: RawImportRow[],
  existingEmailsInBatch: string[] = []
): {
  validatedRows: ValidatedImportRow[];
  summary: ImportValidationSummary;
} {
  const existingSet = new Set(existingEmailsInBatch.map((e) => e.trim().toLowerCase()));
  const seenInFile = new Map<string, number>(); // email -> first rowNumber seen

  const validatedRows: ValidatedImportRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let warningCount = 0;
  let duplicateInFileCount = 0;
  let duplicateInBatchCount = 0;

  for (const row of rows) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let suggestedEmail: string | undefined;

    const trimmedName = (row.name || "").trim();
    const trimmedEmail = (row.email || "").trim().toLowerCase();

    // 1. Zod basic schema validation
    const parsed = singleImportRecipientSchema.safeParse({
      name: trimmedName,
      email: trimmedEmail,
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(issue.message);
      }
    }

    // 2. Check duplicate in database batch
    if (trimmedEmail && existingSet.has(trimmedEmail)) {
      errors.push("Email sudah terdaftar sebelumnya di dalam batch ini.");
      duplicateInBatchCount++;
    }

    // 3. Check duplicate within the imported file
    if (trimmedEmail) {
      if (seenInFile.has(trimmedEmail)) {
        const firstRow = seenInFile.get(trimmedEmail);
        errors.push(`Email duplikat dalam file (sama dengan baris ${firstRow}).`);
        duplicateInFileCount++;
      } else {
        seenInFile.set(trimmedEmail, row.rowNumber);
      }
    }

    // 4. Check domain typo warning (only if email syntax is otherwise valid)
    if (errors.length === 0 || !errors.some((e) => e.includes("Format alamat email"))) {
      const typoCheck = checkDomainTypo(trimmedEmail);
      if (typoCheck.hasTypo) {
        warnings.push(
          `Domain '${typoCheck.typoDomain}' diduga salah ketik. Apakah maksud Anda '${typoCheck.correctDomain}'?`
        );
        suggestedEmail = typoCheck.suggestedEmail;
        warningCount++;
      }
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    validatedRows.push({
      rowNumber: row.rowNumber,
      name: trimmedName,
      email: trimmedEmail,
      isValid,
      errors,
      warnings,
      suggestedEmail,
    });
  }

  return {
    validatedRows,
    summary: {
      totalRows: rows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      warningRows: warningCount,
      duplicateInFileCount,
      duplicateInBatchCount,
    },
  };
}

export const SAMPLE_CSV_CONTENT = `Nama,Email
Budi Santoso,budi.santoso@example.com
Siti Rahma,siti.rahma@example.com
Ahmad Fauzi,ahmad.fauzi@example.com
Dewi Lestari,dewi.lestari@example.com
Rian Pratama,rian.pratama@example.com
`;
