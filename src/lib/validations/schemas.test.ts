import { describe, it, expect } from "vitest";
import { loginSchema } from "./auth";
import { batchSchema } from "./batch";
import { recipientSchema, recipientListSchema } from "./recipient";

describe("Validation Schemas", () => {
  describe("loginSchema", () => {
    it("validates correct login credentials", () => {
      const result = loginSchema.safeParse({
        email: "admin@example.com",
        password: "securePassword123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email-address",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects passwords shorter than 6 characters", () => {
      const result = loginSchema.safeParse({
        email: "admin@example.com",
        password: "123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("batchSchema", () => {
    it("validates valid batch names", () => {
      const result = batchSchema.safeParse({
        name: "Periode 1-7 Desember 2026",
      });
      expect(result.success).toBe(true);
    });

    it("rejects too short batch names", () => {
      const result = batchSchema.safeParse({
        name: "ab",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("recipientListSchema", () => {
    it("validates valid recipient entries", () => {
      const result = recipientSchema.safeParse({
        name: "Budi Santoso",
        email: "budi.santoso@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("enforces maximum limit of 50 recipients per batch", () => {
      const oversizedList = Array.from({ length: 51 }, (_, i) => ({
        name: `Karyawan ${i + 1}`,
        email: `karyawan${i + 1}@example.com`,
      }));

      const result = recipientListSchema.safeParse(oversizedList);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Maksimal 50 penerima");
      }
    });

    it("allows a batch with up to 50 recipients", () => {
      const validList = Array.from({ length: 50 }, (_, i) => ({
        name: `Karyawan ${i + 1}`,
        email: `karyawan${i + 1}@example.com`,
      }));

      const result = recipientListSchema.safeParse(validList);
      expect(result.success).toBe(true);
    });
  });
});
