import { describe, it, expect } from "vitest";
import {
  validateAttachmentFile,
  sanitizeFilename,
  generateSecureBlobPathname,
  MAX_FILE_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_RECIPIENT,
} from "./attachment";

describe("Fase 3: Attachment Validation & Sanitization", () => {
  describe("validateAttachmentFile", () => {
    it("should accept valid PDF file within 4 MB limit", () => {
      const file = {
        name: "slip_gaji_desember.pdf",
        size: 1.5 * 1024 * 1024, // 1.5 MB
        type: "application/pdf",
      };
      const result = validateAttachmentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should accept valid PNG and JPG images", () => {
      const pngFile = {
        name: "bukti_transfer_bca.png",
        size: 500 * 1024,
        type: "image/png",
      };
      const jpgFile = {
        name: "struk_transfer.jpg",
        size: 300 * 1024,
        type: "image/jpeg",
      };

      expect(validateAttachmentFile(pngFile).valid).toBe(true);
      expect(validateAttachmentFile(jpgFile).valid).toBe(true);
    });

    it("should reject file exceeding 4 MB limit", () => {
      const oversizedFile = {
        name: "large_document.pdf",
        size: 4.5 * 1024 * 1024, // 4.5 MB
        type: "application/pdf",
      };
      const result = validateAttachmentFile(oversizedFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("melebihi batas maksimal 4 MB");
    });

    it("should reject 0 byte empty files", () => {
      const emptyFile = {
        name: "empty.pdf",
        size: 0,
        type: "application/pdf",
      };
      const result = validateAttachmentFile(emptyFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("tidak boleh kosong");
    });

    it("should reject unsupported file extensions (e.g. .docx, .zip, .exe)", () => {
      const docx = {
        name: "document.docx",
        size: 50 * 1024,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      const exe = {
        name: "script.exe",
        size: 10 * 1024,
        type: "application/x-msdownload",
      };

      expect(validateAttachmentFile(docx).valid).toBe(false);
      expect(validateAttachmentFile(docx).error).toContain("Hanya file PDF, PNG, dan JPG");
      expect(validateAttachmentFile(exe).valid).toBe(false);
    });

    it("should reject files with forged extension but wrong MIME type", () => {
      const forged = {
        name: "malicious.pdf",
        size: 20 * 1024,
        type: "application/x-sh",
      };
      const result = validateAttachmentFile(forged);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Tipe konten tidak valid");
    });
  });

  describe("sanitizeFilename", () => {
    it("should strip directory traversal characters and null bytes", () => {
      const dangerous = "../../../etc/passwd\0.pdf";
      const cleaned = sanitizeFilename(dangerous);
      expect(cleaned).not.toContain("../");
      expect(cleaned).not.toContain("\0");
      expect(cleaned.endsWith(".pdf")).toBe(true);
    });

    it("should replace special characters with underscores", () => {
      const messy = "slip gaji #1 (final) & verified!.pdf";
      const cleaned = sanitizeFilename(messy);
      expect(cleaned).toBe("slip_gaji_1_final_verified_.pdf");
    });

    it("should remove leading dots to prevent hidden files", () => {
      const hidden = "...hidden_file.pdf";
      const cleaned = sanitizeFilename(hidden);
      expect(cleaned.startsWith(".")).toBe(false);
    });

    it("should truncate filenames exceeding 255 characters", () => {
      const veryLong = "a".repeat(300) + ".pdf";
      const cleaned = sanitizeFilename(veryLong);
      expect(cleaned.length).toBeLessThanOrEqual(255);
    });
  });

  describe("generateSecureBlobPathname", () => {
    it("should generate unguessable path with recipientId and UUID", () => {
      const recipientId = "123e4567-e89b-12d3-a456-426614174000";
      const pathname = generateSecureBlobPathname(recipientId, "slip.pdf");

      expect(pathname.startsWith(`payslips/${recipientId}/`)).toBe(true);
      expect(pathname).toContain("slip.pdf");
      // Pathname must be unpredictable to prevent unauthorized guessing
      expect(pathname.length).toBeGreaterThan(50);
    });
  });

  describe("Limits Specifications", () => {
    it("has 4 MB maximum size defined", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(4 * 1024 * 1024);
    });

    it("has 3 attachments maximum per recipient defined", () => {
      expect(MAX_ATTACHMENTS_PER_RECIPIENT).toBe(3);
    });
  });
});
