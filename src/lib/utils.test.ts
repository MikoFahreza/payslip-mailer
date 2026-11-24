import { describe, it, expect } from "vitest";
import { normalizeEmail } from "./utils";

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
