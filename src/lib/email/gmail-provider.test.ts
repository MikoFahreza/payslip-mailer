import { describe, it, expect, vi, beforeEach } from "vitest";
import { GmailProvider } from "./gmail-provider";

// Mock OAuth2Client at top level
vi.mock("google-auth-library", () => {
  return {
    OAuth2Client: class {
      setCredentials() {}
      async getAccessToken() {
        return { token: "fake-access-token" };
      }
    },
  };
});

describe("GmailProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return failed when required credentials are missing", async () => {
    const provider = new GmailProvider({
      clientId: "",
      clientSecret: "",
      refreshToken: "",
      senderEmail: "",
    });

    const result = await provider.sendEmail({
      to: "penerima@example.com",
      toName: "Penerima",
      subject: "Slip Gaji",
      html: "<p>Halo</p>",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Konfigurasi Gmail API belum lengkap");
  });

  it("should reject messages exceeding the 25 MB Gmail limit", async () => {
    const provider = new GmailProvider({
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
      refreshToken: "dummy-refresh-token",
      senderEmail: "pengirim@gmail.com",
    });

    // 26 MB buffer
    const hugeBuffer = Buffer.alloc(26 * 1024 * 1024);

    const result = await provider.sendEmail({
      to: "penerima@example.com",
      toName: "Penerima",
      subject: "Slip Gaji",
      html: "<p>Halo</p>",
      attachments: [
        {
          filename: "huge.pdf",
          contentType: "application/pdf",
          content: hugeBuffer,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("melebihi batas 25 MB Gmail");
  });

  it("should map 401 / invalid_grant to explicit Indonesian error message", async () => {
    const provider = new GmailProvider({
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
      refreshToken: "dummy-refresh-token",
      senderEmail: "pengirim@gmail.com",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { message: "invalid_grant: Token has been expired or revoked." },
      }),
    } as unknown as Response);

    const result = await provider.sendEmail({
      to: "penerima@example.com",
      toName: "Penerima",
      subject: "Slip Gaji",
      html: "<p>Halo</p>",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Otorisasi Gmail kedaluwarsa, ulangi otorisasi");
  });

  it("should map AbortError / timeout to 'unknown' status", async () => {
    const provider = new GmailProvider({
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
      refreshToken: "dummy-refresh-token",
      senderEmail: "pengirim@gmail.com",
    });

    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValue(abortError);

    const result = await provider.sendEmail({
      to: "penerima@example.com",
      toName: "Penerima",
      subject: "Slip Gaji",
      html: "<p>Halo</p>",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("unknown");
    expect(result.error).toContain("Koneksi timeout setelah permintaan dikirim ke Gmail API");
  });
});
