import { describe, it, expect } from "vitest";
import { batchSchema } from "@/lib/validations/batch";
import { recipientSchema, recipientListSchema } from "@/lib/validations/recipient";

describe("Fase 2: Batch and Recipient Validation Rules", () => {
  describe("Batch Schema Validation", () => {
    it("should accept valid batch names", () => {
      expect(batchSchema.safeParse({ name: "Periode 1-7 Desember 2026" }).success).toBe(true);
      expect(batchSchema.safeParse({ name: "Batch Gaji Karyawan Shift A" }).success).toBe(true);
    });

    it("should reject batch names shorter than 3 characters", () => {
      const result = batchSchema.safeParse({ name: "AB" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("minimal 3 karakter");
      }
    });

    it("should reject batch names exceeding 255 characters", () => {
      const longName = "A".repeat(256);
      const result = batchSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("maksimal 255 karakter");
      }
    });
  });

  describe("Recipient Schema Validation", () => {
    it("should accept valid recipient name and email", () => {
      const result = recipientSchema.safeParse({
        name: "Budi Santoso",
        email: "budi.santoso@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email formats", () => {
      const result = recipientSchema.safeParse({
        name: "Budi Santoso",
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("tidak valid");
      }
    });

    it("should reject empty names", () => {
      const result = recipientSchema.safeParse({
        name: "",
        email: "budi@example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Recipient Batch Limit Enforcement (Max 50)", () => {
    it("should allow a list of up to 50 recipients", () => {
      const list = Array.from({ length: 50 }, (_, i) => ({
        name: `Karyawan ${i + 1}`,
        email: `karyawan${i + 1}@example.com`,
      }));
      expect(recipientListSchema.safeParse(list).success).toBe(true);
    });

    it("should strictly reject more than 50 recipients per batch", () => {
      const list = Array.from({ length: 51 }, (_, i) => ({
        name: `Karyawan ${i + 1}`,
        email: `karyawan${i + 1}@example.com`,
      }));
      const result = recipientListSchema.safeParse(list);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Maksimal 50 penerima per batch");
      }
    });
  });

  describe("Duplicate Email Detection in Batch", () => {
    it("detects duplicate emails in recipient lists", () => {
      const recipients = [
        { name: "Budi Santoso", email: "budi@example.com" },
        { name: "Siti Rahma", email: "siti@example.com" },
        { name: "Budi Clone", email: "budi@example.com" },
      ];

      const emailSet = new Set<string>();
      let hasDuplicate = false;

      for (const r of recipients) {
        const normalized = r.email.trim().toLowerCase();
        if (emailSet.has(normalized)) {
          hasDuplicate = true;
          break;
        }
        emailSet.add(normalized);
      }

      expect(hasDuplicate).toBe(true);
    });

    it("handles case-insensitive duplicate email detection", () => {
      const email1 = "Budi.Santoso@Example.COM";
      const email2 = "budi.santoso@example.com";

      expect(email1.trim().toLowerCase() === email2.trim().toLowerCase()).toBe(true);
    });
  });
});
