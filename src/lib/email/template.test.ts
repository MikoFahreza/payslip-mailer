import { describe, it, expect } from "vitest";
import { generateEmailHtml, generateEmailText } from "./template";

describe("Email Template Generator", () => {
  it("should generate HTML email containing recipient name and batch period", () => {
    const html = generateEmailHtml({
      recipientName: "Budi Santoso",
      batchName: "Periode 1-7 Desember 2026",
      appName: "Payslip Mailer",
    });

    expect(html).toContain("Budi Santoso");
    expect(html).toContain("Periode 1-7 Desember 2026");
    expect(html).toContain("Payslip Mailer");
    expect(html).toContain("Pemberitahuan Kerahasiaan:");
  });

  it("should list attachments in HTML when provided", () => {
    const html = generateEmailHtml({
      recipientName: "Siti Rahma",
      batchName: "Periode Desember",
      attachmentNames: ["slip_gaji_siti.pdf", "bukti_transfer.jpg"],
    });

    expect(html).toContain("slip_gaji_siti.pdf");
    expect(html).toContain("bukti_transfer.jpg");
    expect(html).toContain("Lampiran Dokumen:");
  });

  it("should generate plain text version properly", () => {
    const text = generateEmailText({
      recipientName: "Andi Wijaya",
      batchName: "Periode Januari 2027",
      attachmentNames: ["slip.pdf"],
    });

    expect(text).toContain("Yth. Andi Wijaya");
    expect(text).toContain("Periode Januari 2027");
    expect(text).toContain("- slip.pdf");
    expect(text).toContain("Pemberitahuan Kerahasiaan:");
  });
});
