import { describe, it, expect } from "vitest";
import {
  checkDomainTypo,
  singleImportRecipientSchema,
  validateImportRows,
  RawImportRow,
} from "./import";

describe("Fase 5: Bulk Import Validation & Typo Detection", () => {
  describe("singleImportRecipientSchema", () => {
    it("should accept valid recipient inputs", () => {
      const result = singleImportRecipientSchema.safeParse({
        name: "Budi Santoso",
        email: "budi.santoso@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty names", () => {
      const result = singleImportRecipientSchema.safeParse({
        name: "   ",
        email: "budi@example.com",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("tidak boleh kosong");
      }
    });

    it("should reject invalid email formats", () => {
      const result = singleImportRecipientSchema.safeParse({
        name: "Budi Santoso",
        email: "budi.santoso.com",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("tidak valid");
      }
    });
  });

  describe("checkDomainTypo", () => {
    it("should detect common typos like gmial.com and suggest gmail.com", () => {
      const res = checkDomainTypo("budi@gmial.com");
      expect(res.hasTypo).toBe(true);
      expect(res.typoDomain).toBe("gmial.com");
      expect(res.correctDomain).toBe("gmail.com");
      expect(res.suggestedEmail).toBe("budi@gmail.com");
    });

    it("should detect yaho.com and suggest yahoo.com", () => {
      const res = checkDomainTypo("siti@yaho.com");
      expect(res.hasTypo).toBe(true);
      expect(res.correctDomain).toBe("yahoo.com");
    });

    it("should detect hotmial.com and suggest hotmail.com", () => {
      const res = checkDomainTypo("andi@hotmial.com");
      expect(res.hasTypo).toBe(true);
      expect(res.correctDomain).toBe("hotmail.com");
    });

    it("should not flag legitimate domains", () => {
      expect(checkDomainTypo("budi@gmail.com").hasTypo).toBe(false);
      expect(checkDomainTypo("andi@perusahaan.co.id").hasTypo).toBe(false);
      expect(checkDomainTypo("user@custom-domain.org").hasTypo).toBe(false);
    });
  });

  describe("validateImportRows", () => {
    it("should mark all rows valid when there are no issues", () => {
      const rows: RawImportRow[] = [
        { rowNumber: 2, name: "Budi", email: "budi@example.com" },
        { rowNumber: 3, name: "Siti", email: "siti@example.com" },
      ];

      const { validatedRows, summary } = validateImportRows(rows, []);
      expect(summary.totalRows).toBe(2);
      expect(summary.validRows).toBe(2);
      expect(summary.invalidRows).toBe(0);
      expect(validatedRows[0].isValid).toBe(true);
      expect(validatedRows[1].isValid).toBe(true);
    });

    it("should detect duplicate emails within the file", () => {
      const rows: RawImportRow[] = [
        { rowNumber: 2, name: "Budi 1", email: "duplicate@example.com" },
        { rowNumber: 3, name: "Budi 2", email: "duplicate@example.com" },
      ];

      const { validatedRows, summary } = validateImportRows(rows, []);
      expect(summary.totalRows).toBe(2);
      expect(summary.validRows).toBe(1);
      expect(summary.invalidRows).toBe(1);
      expect(summary.duplicateInFileCount).toBe(1);

      expect(validatedRows[0].isValid).toBe(true);
      expect(validatedRows[1].isValid).toBe(false);
      expect(validatedRows[1].errors[0]).toContain(
        "Email duplikat dalam file (sama dengan baris 2)"
      );
    });

    it("should detect duplicate emails against existing batch recipients", () => {
      const existingInBatch = ["existing@example.com"];
      const rows: RawImportRow[] = [
        { rowNumber: 2, name: "Karyawan Baru", email: "new@example.com" },
        { rowNumber: 3, name: "Karyawan Lama", email: "existing@example.com" },
      ];

      const { validatedRows, summary } = validateImportRows(rows, existingInBatch);
      expect(summary.totalRows).toBe(2);
      expect(summary.validRows).toBe(1);
      expect(summary.invalidRows).toBe(1);
      expect(summary.duplicateInBatchCount).toBe(1);

      expect(validatedRows[0].isValid).toBe(true);
      expect(validatedRows[1].isValid).toBe(false);
      expect(validatedRows[1].errors[0]).toContain(
        "Email sudah terdaftar sebelumnya di dalam batch ini"
      );
    });

    it("should add a warning for domain typo without making the row invalid", () => {
      const rows: RawImportRow[] = [{ rowNumber: 2, name: "Budi", email: "budi@gmial.com" }];

      const { validatedRows, summary } = validateImportRows(rows, []);
      expect(summary.totalRows).toBe(1);
      expect(summary.validRows).toBe(1);
      expect(summary.warningRows).toBe(1);
      expect(validatedRows[0].isValid).toBe(true);
      expect(validatedRows[0].warnings[0]).toContain("gmial.com");
      expect(validatedRows[0].suggestedEmail).toBe("budi@gmail.com");
    });

    it("should handle mixed messy data without crashing", () => {
      const rows: RawImportRow[] = [
        { rowNumber: 2, name: "", email: "no-name@example.com" },
        { rowNumber: 3, name: "Invalid Email", email: "not-an-email" },
        { rowNumber: 4, name: "Budi Valid", email: "budi@example.com" },
        { rowNumber: 5, name: "Budi Duplikat", email: "BUDI@EXAMPLE.COM" },
      ];

      const { validatedRows, summary } = validateImportRows(rows, []);
      expect(summary.totalRows).toBe(4);
      expect(summary.validRows).toBe(1); // Only row 4 is valid
      expect(summary.invalidRows).toBe(3);
      expect(validatedRows[0].errors[0]).toContain("tidak boleh kosong");
      expect(validatedRows[1].errors[0]).toContain("tidak valid");
      expect(validatedRows[3].errors[0]).toContain("Email duplikat");
    });
  });
});
