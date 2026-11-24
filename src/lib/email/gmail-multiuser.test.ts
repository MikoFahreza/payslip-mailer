import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserEmailProvider, getUserGmailStatus } from "./index";
import { GmailProvider } from "./gmail-provider";
import { encrypt } from "@/lib/crypto/encryption";

// Mock DB
const mockFindFirst = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      gmailConnections: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
  },
}));

// Mock google-auth-library
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    setCredentials() {}
    async getAccessToken() {
      return { token: "user-access-token" };
    }
  },
}));

describe("Multi-User Gmail Isolation & Simulation Fallback (Fase R4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 2).toString("base64");
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
    process.env.EMAIL_MODE = "live";
  });

  it("User A and User B send from their respective connected Gmail addresses", async () => {
    const encryptedTokenA = encrypt("refresh-token-alpha");
    const encryptedTokenB = encrypt("refresh-token-beta");

    let callCount = 0;
    mockFindFirst.mockImplementation(async () => {
      callCount++;
      if (callCount % 2 === 1) {
        return {
          id: "conn-A",
          userId: "user-A",
          gmailEmail: "userA@gmail.com",
          refreshTokenEncrypted: encryptedTokenA,
          status: "connected",
        };
      }
      return {
        id: "conn-B",
        userId: "user-B",
        gmailEmail: "userB@gmail.com",
        refreshTokenEncrypted: encryptedTokenB,
        status: "connected",
      };
    });

    const userAProvider = await getUserEmailProvider("user-A");
    const userBProvider = await getUserEmailProvider("user-B");

    expect(userAProvider.isSimulated).toBe(false);
    expect(userAProvider.senderEmail).toBe("userA@gmail.com");
    expect(userAProvider.provider).toBeInstanceOf(GmailProvider);

    expect(userBProvider.isSimulated).toBe(false);
    expect(userBProvider.senderEmail).toBe("userB@gmail.com");
    expect(userBProvider.provider).toBeInstanceOf(GmailProvider);

    // Verify status labels
    const statusA = await getUserGmailStatus("user-A");
    const statusB = await getUserGmailStatus("user-B");

    expect(statusA.isSimulated).toBe(false);
    expect(statusA.senderEmail).toBe("userA@gmail.com");
    expect(statusB.isSimulated).toBe(false);
    expect(statusB.senderEmail).toBe("userB@gmail.com");
  });

  it("User without connected Gmail automatically falls back to SimulateProvider with simulation label", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getUserEmailProvider("unconnected-user");

    expect(result.isSimulated).toBe(true);
    expect(result.status).toBe("not_connected");
    expect(result.statusLabel).toBe("Simulasi (Gmail belum terhubung)");
    expect(result.provider.name).toBe("simulate");

    const status = await getUserGmailStatus("unconnected-user");
    expect(status.isSimulated).toBe(true);
    expect(status.statusLabel).toBe("Simulasi (Gmail belum terhubung)");
  });

  it("User with revoked connection is flagged with revoked status and simulation provider", async () => {
    mockFindFirst.mockResolvedValue({
      id: "conn-revoked",
      userId: "user-revoked",
      gmailEmail: "revoked@gmail.com",
      refreshTokenEncrypted: "enc",
      status: "revoked",
    });

    const result = await getUserEmailProvider("user-revoked");

    expect(result.isSimulated).toBe(true);
    expect(result.status).toBe("revoked");
    expect(result.statusLabel).toBe("Simulasi (Gmail belum terhubung)");
    expect(result.senderEmail).toBe("revoked@gmail.com");
    expect(result.provider.name).toBe("simulate");

    const status = await getUserGmailStatus("user-revoked");
    expect(status.status).toBe("revoked");
  });

  it("When EMAIL_MODE=simulate, all users use SimulateProvider regardless of connection", async () => {
    process.env.EMAIL_MODE = "simulate";

    mockFindFirst.mockResolvedValue({
      id: "conn-A",
      userId: "user-A",
      gmailEmail: "userA@gmail.com",
      refreshTokenEncrypted: "enc",
      status: "connected",
    });

    const result = await getUserEmailProvider("user-A");
    expect(result.isSimulated).toBe(true);
    expect(result.status).toBe("simulate_mode");
    expect(result.provider.name).toBe("simulate");
  });
});
