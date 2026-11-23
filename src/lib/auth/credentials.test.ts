import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { dummySeedData } from "@/lib/db/seed";

describe("Credentials & Security Verification", () => {
  const samplePassword = "admin123456";
  const sampleHash = "$2b$10$7YycopL2msl6ATcxymuP4.YU64uc8KrudB7yL6P/WpbzTMIVPe2X2";

  it("should verify bcrypt hash matches test password", async () => {
    const isMatch = await bcrypt.compare(samplePassword, sampleHash);
    expect(isMatch).toBe(true);
  });

  it("should reject incorrect passwords", async () => {
    const isMatch = await bcrypt.compare("wrong-password", sampleHash);
    expect(isMatch).toBe(false);
  });
});

describe("Seed Data Integrity", () => {
  it("has valid fake batch data", () => {
    expect(dummySeedData.batch.name).toBe("Periode 1-7 Desember 2026");
  });

  it("has 3 sample recipients with fake @example.com emails", () => {
    expect(dummySeedData.recipients.length).toBe(3);
    for (const r of dummySeedData.recipients) {
      expect(r.email).toContain("@example.com");
      expect(["pending", "sent", "failed"]).toContain(r.status);
    }
  });

  it("includes attachment metadata for payslips", () => {
    for (const r of dummySeedData.recipients) {
      expect(r.attachment).toBeDefined();
      expect(r.attachment?.contentType).toBe("application/pdf");
      expect(r.attachment?.kind).toBe("payslip");
    }
  });
});
