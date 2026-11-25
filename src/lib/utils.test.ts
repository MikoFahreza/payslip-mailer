import { describe, it, expect } from "vitest";
import { normalizeEmail, normalizeAppOrigin } from "./utils";

describe("normalizeEmail utility", () => {
  it("should convert uppercase letters to lowercase", () => {
    expect(normalizeEmail("USER@EXAMPLE.COM")).toBe("user@example.com");
    expect(normalizeEmail("Budi.Santoso@Domain.Co.Id")).toBe("budi.santoso@domain.co.id");
  });

  it("should trim leading and trailing spaces, tabs, and newlines", () => {
    expect(normalizeEmail("   user@example.com  ")).toBe("user@example.com");
    expect(normalizeEmail("\tuser@example.com\n")).toBe("user@example.com");
  });

  it("should handle mixed case and whitespace together", () => {
    expect(normalizeEmail("  Budi.Santoso@Example.COM  ")).toBe("budi.santoso@example.com");
  });

  it("should return empty string for null, undefined, or empty string", () => {
    expect(normalizeEmail("")).toBe("");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail("   ")).toBe("");
  });
});

describe("normalizeAppOrigin utility", () => {
  it("should keep valid https and http origins without trailing slash", () => {
    expect(normalizeAppOrigin("https://email-payslip.vercel.app/")).toBe(
      "https://email-payslip.vercel.app"
    );
    expect(normalizeAppOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("should prepend https:// when scheme is omitted", () => {
    expect(normalizeAppOrigin("email-payslip.vercel.app")).toBe(
      "https://email-payslip.vercel.app"
    );
    expect(normalizeAppOrigin("  email-payslip.vercel.app/  ")).toBe(
      "https://email-payslip.vercel.app"
    );
  });

  it("should return empty string for blank or invalid inputs", () => {
    expect(normalizeAppOrigin("")).toBe("");
    expect(normalizeAppOrigin(null)).toBe("");
    expect(normalizeAppOrigin(undefined)).toBe("");
  });
});
