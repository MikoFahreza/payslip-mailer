import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveBlobToken } from "./blob-config";

describe("blob-config token resolution", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    for (const key of Object.keys(process.env)) {
      if (key.endsWith("_READ_WRITE_TOKEN")) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("returns active when BLOB_READ_WRITE_TOKEN is valid", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_live_token_12345";
    const res = resolveBlobToken();
    expect(res.status).toBe("active");
    expect(res.token).toBe("vercel_blob_rw_live_token_12345");
    expect(res.sourceKey).toBe("BLOB_READ_WRITE_TOKEN");
  });

  it("detects placeholder sample token", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_sample_token";
    const res = resolveBlobToken();
    expect(res.status).toBe("placeholder_sample");
    expect(res.token).toBeUndefined();
  });

  it("falls back to custom-prefixed *_READ_WRITE_TOKEN when primary is sample or missing", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_sample_token";
    process.env.PAYSLIP_BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_custom_live_987";
    const res = resolveBlobToken();
    expect(res.status).toBe("active");
    expect(res.token).toBe("vercel_blob_rw_custom_live_987");
    expect(res.sourceKey).toBe("PAYSLIP_BLOB_READ_WRITE_TOKEN");
  });

  it("returns missing when no blob token exists", () => {
    const res = resolveBlobToken();
    expect(res.status).toBe("missing");
    expect(res.token).toBeUndefined();
  });
});
