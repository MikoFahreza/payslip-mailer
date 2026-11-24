import { describe, it, expect } from "vitest";
import { dummySeedData } from "@/lib/db/seed";

describe("Multi-User Seed Data Integrity", () => {
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
