import { describe, it, expect, vi, beforeEach } from "vitest";
import { GmailProvider, clearGmailTokenCache } from "./gmail-provider";
import { encrypt } from "@/lib/crypto/encryption";

// Mock OAuth2Client at top level
const mockGetAccessToken = vi.fn().mockResolvedValue({
  token: "fake-access-token",
  res: { data: { expires_in: 3600 } },
});

vi.mock("google-auth-library", () => {
  return {
    OAuth2Client: class {
      setCredentials() {}
      getAccessToken = mockGetAccessToken;
    },
  };
});

// Mock db for userId tests
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      gmailConnections: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
  },
}));

describe("GmailProvider (Fase R4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearGmailTokenCache();
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
    mockGetAccessToken.mockResolvedValue({
      token: "fake-access-token",
      res: { data: { expires_in: 3600 } },
    });
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

  it("should map 401 / invalid_grant to 'Hubungkan ulang Gmail'", async () => {
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
    expect(result.error).toBe("Hubungkan ulang Gmail");
  });

  it("should map 429 to rate limit failed error", async () => {
    const provider = new GmailProvider({
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
      refreshToken: "dummy-refresh-token",
      senderEmail: "pengirim@gmail.com",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: { message: "Rate limit exceeded" },
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
    expect(result.error).toContain("Batas frekuensi Gmail API terlampaui");
  });

  it("should map 5xx to server failure error", async () => {
    const provider = new GmailProvider({
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
      refreshToken: "dummy-refresh-token",
      senderEmail: "pengirim@gmail.com",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: { message: "Backend Error" },
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
    expect(result.error).toContain("Server Gmail mengalami gangguan (HTTP 503)");
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

  it("should cache access token in memory during an invocation (no redundant exchanges)", async () => {
    const provider = new GmailProvider({
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
      refreshToken: "dummy-refresh-token",
      senderEmail: "pengirim@gmail.com",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-12345" }),
    } as unknown as Response);

    // Call 1
    const res1 = await provider.sendEmail({
      to: "p1@example.com",
      toName: "P1",
      subject: "Test 1",
      html: "<p>1</p>",
    });

    // Call 2
    const res2 = await provider.sendEmail({
      to: "p2@example.com",
      toName: "P2",
      subject: "Test 2",
      html: "<p>2</p>",
    });

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    // getAccessToken must have been called only once because second send uses in-memory cache!
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
  });

  it("should resolve credentials from database when initialized with userId", async () => {
    const { db } = await import("@/lib/db");
    const mockEncrypted = encrypt("user-secret-refresh-token");

    vi.mocked(db.query.gmailConnections.findFirst).mockResolvedValue({
      id: "conn-1",
      userId: "user-alpha",
      gmailEmail: "alpha@gmail.com",
      refreshTokenEncrypted: mockEncrypted,
      scope: "openid email https://www.googleapis.com/auth/gmail.send",
      status: "connected",
      connectedAt: new Date(),
      updatedAt: new Date(),
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-abc" }),
    } as unknown as Response);

    const provider = new GmailProvider({
      userId: "user-alpha",
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
    });

    const result = await provider.sendEmail({
      to: "target@example.com",
      toName: "Target",
      subject: "Slip Gaji User Alpha",
      html: "<p>Halo Alpha</p>",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-abc");
    expect(result.provider).toBe("gmail");
  });

  it("should return 'Hubungkan ulang Gmail' if user's connection status is revoked", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.query.gmailConnections.findFirst).mockResolvedValue({
      id: "conn-2",
      userId: "user-beta",
      gmailEmail: "beta@gmail.com",
      refreshTokenEncrypted: "encrypted",
      scope: "scope",
      status: "revoked",
      connectedAt: new Date(),
      updatedAt: new Date(),
    });

    const provider = new GmailProvider({
      userId: "user-beta",
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
    });

    const result = await provider.sendEmail({
      to: "target@example.com",
      toName: "Target",
      subject: "Slip Gaji",
      html: "<p>Halo</p>",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Hubungkan ulang Gmail");
  });

  it("should wrap attachment base64 lines to 76 chars and preserve exact binary bytes", async () => {
    const provider = new GmailProvider({
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
      refreshToken: "dummy-refresh-token",
      senderEmail: "pengirim@gmail.com",
    });

    let capturedBody = "";
    global.fetch = vi.fn().mockImplementation(async (_url, init) => {
      capturedBody = String(init?.body || "");
      return {
        ok: true,
        json: async () => ({ id: "msg-binary-ok" }),
      } as unknown as Response;
    });

    // Binary payload > 100 bytes so base64 wraps across multiple 76-char lines
    const originalBytes = Buffer.from(
      Array.from({ length: 256 }, (_, i) => i) // all byte values 0x00..0xff
    );

    const result = await provider.sendEmail({
      to: "penerima@example.com",
      toName: "Penerima",
      subject: "Slip Gaji PDF",
      html: "<p>Lampiran terlampir</p>",
      attachments: [
        {
          filename: "slip_gaji.pdf",
          contentType: "application/pdf",
          content: originalBytes,
        },
      ],
    });

    expect(result.success).toBe(true);
    const parsed = JSON.parse(capturedBody) as { raw: string };
    const decodedMime = Buffer.from(parsed.raw, "base64url").toString("utf8");

    // Extract base64 block from the attachment part
    const parts = decodedMime.split('Content-Disposition: attachment; filename="slip_gaji.pdf"');
    expect(parts.length).toBe(2);
    const attachmentBodySection = parts[1].split("--")[0].trim();
    const lines = attachmentBodySection.split(/\r?\n/);
    expect(lines.every((l) => l.length <= 76)).toBe(true);

    // Reassemble base64 and verify exact byte-for-byte match
    const restoredBytes = Buffer.from(lines.join(""), "base64");
    expect(Buffer.compare(restoredBytes, originalBytes)).toBe(0);
  });
});
