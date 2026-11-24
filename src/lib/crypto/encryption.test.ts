import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "./encryption";
import crypto from "crypto";

describe("AES-256-GCM Encryption Module", () => {
  const originalEnvKey = process.env.TOKEN_ENCRYPTION_KEY;
  const testKey32Bytes = crypto.randomBytes(32).toString("base64");

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = testKey32Bytes;
  });

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = originalEnvKey;
  });

  describe("Round-trip Encryption & Decryption", () => {
    it("successfully encrypts and decrypts a sample Gmail refresh token", () => {
      const sampleRefreshToken = "1//04abcdef1234567890XYZ_sample_google_refresh_token";
      const encrypted = encrypt(sampleRefreshToken);

      expect(encrypted).not.toBe(sampleRefreshToken);
      expect(encrypted.split(":")).toHaveLength(3);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(sampleRefreshToken);
    });

    it("generates different ciphertexts for the same plaintext due to random IV", () => {
      const plaintext = "my-secret-token";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it("handles empty or unicode strings correctly", () => {
      const unicodeString = "Token rahasia 🔒 dengan emoji dan karakter unik 1234!@#$%^&*()";
      const encrypted = encrypt(unicodeString);
      expect(decrypt(encrypted)).toBe(unicodeString);
    });
  });

  describe("Corrupted Data & Tampering Protection", () => {
    it("rejects tampered ciphertext with an authentication error", () => {
      const plaintext = "confidential-token-123";
      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(":");

      // Flip the last byte of the ciphertext
      const tamperedCipher = parts[2].slice(0, -2) + (parts[2].endsWith("00") ? "ff" : "00");
      const tamperedData = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

      expect(() => decrypt(tamperedData)).toThrow("Gagal mendekripsi data");
    });

    it("rejects tampered auth tag", () => {
      const plaintext = "confidential-token-123";
      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(":");

      // Flip auth tag byte
      const tamperedTag = parts[1].slice(0, -2) + (parts[1].endsWith("00") ? "ff" : "00");
      const tamperedData = `${parts[0]}:${tamperedTag}:${parts[2]}`;

      expect(() => decrypt(tamperedData)).toThrow("Gagal mendekripsi data");
    });

    it("rejects malformed encrypted strings", () => {
      expect(() => decrypt("not-a-valid-encrypted-string")).toThrow("Format data terenkripsi tidak valid");
      expect(() => decrypt("iv:tag")).toThrow("Format data terenkripsi tidak valid");
      expect(() => decrypt("")).toThrow("Data terenkripsi tidak valid");
    });
  });

  describe("Key Validation", () => {
    it("throws an error when TOKEN_ENCRYPTION_KEY is missing", () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      expect(() => encrypt("secret")).toThrow("TOKEN_ENCRYPTION_KEY belum dikonfigurasi");
      expect(() => decrypt("00:00:00")).toThrow();
    });

    it("throws an error when key length is invalid", () => {
      process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
      expect(() => encrypt("secret")).toThrow("Panjang TOKEN_ENCRYPTION_KEY tidak valid");
    });
  });
});
