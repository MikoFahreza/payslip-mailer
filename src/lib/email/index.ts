import { EmailProvider } from "./types";
import { GmailProvider } from "./gmail-provider";
import { SimulateProvider } from "./simulate-provider";
import { db } from "@/lib/db";
import { gmailConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto/encryption";

let testProviderOverride: EmailProvider | null = null;

export type GmailConnectionStatus = "connected" | "not_connected" | "revoked" | "simulate_mode";

export interface UserEmailProviderResult {
  provider: EmailProvider;
  isSimulated: boolean;
  status: GmailConnectionStatus;
  statusLabel: string;
  senderEmail?: string;
}

export async function getUserGmailStatus(userId: string): Promise<{
  isSimulated: boolean;
  status: GmailConnectionStatus;
  statusLabel: string;
  senderEmail?: string;
}> {
  if (testProviderOverride) {
    const isSimulated = testProviderOverride.name === "simulate";
    return {
      isSimulated,
      status: isSimulated ? "simulate_mode" : "connected",
      statusLabel: isSimulated ? "Simulasi (Gmail belum terhubung)" : "Gmail Terhubung",
      senderEmail: isSimulated ? undefined : "test@example.com",
    };
  }

  // If EMAIL_MODE is explicitly set to simulate
  if (process.env.EMAIL_MODE?.toLowerCase() === "simulate") {
    return {
      isSimulated: true,
      status: "simulate_mode",
      statusLabel: "Simulasi (EMAIL_MODE=simulate)",
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      isSimulated: true,
      status: "not_connected",
      statusLabel: "Simulasi (Gmail belum terhubung)",
    };
  }

  try {
    const connection = await db.query.gmailConnections.findFirst({
      where: eq(gmailConnections.userId, userId),
    });

    if (!connection) {
      return {
        isSimulated: true,
        status: "not_connected",
        statusLabel: "Simulasi (Gmail belum terhubung)",
      };
    }

    if (connection.status === "revoked") {
      return {
        isSimulated: true,
        status: "revoked",
        statusLabel: "Simulasi (Gmail belum terhubung)",
        senderEmail: connection.gmailEmail,
      };
    }

    if (connection.status === "connected" && connection.refreshTokenEncrypted) {
      return {
        isSimulated: false,
        status: "connected",
        statusLabel: "Gmail Terhubung",
        senderEmail: connection.gmailEmail,
      };
    }
  } catch (err) {
    console.warn("[getUserGmailStatus] Error fetching connection:", err);
  }

  return {
    isSimulated: true,
    status: "not_connected",
    statusLabel: "Simulasi (Gmail belum terhubung)",
  };
}

export async function getUserEmailProvider(userId: string): Promise<UserEmailProviderResult> {
  if (testProviderOverride) {
    const isSim = testProviderOverride.name === "simulate";
    return {
      provider: testProviderOverride,
      isSimulated: isSim,
      status: isSim ? "simulate_mode" : "connected",
      statusLabel: isSim ? "Simulasi (Gmail belum terhubung)" : "Gmail Terhubung",
    };
  }

  // 1. If EMAIL_MODE is explicitly set to simulate
  if (process.env.EMAIL_MODE?.toLowerCase() === "simulate") {
    return {
      provider: new SimulateProvider(),
      isSimulated: true,
      status: "simulate_mode",
      statusLabel: "Simulasi (EMAIL_MODE=simulate)",
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      provider: new SimulateProvider(),
      isSimulated: true,
      status: "not_connected",
      statusLabel: "Simulasi (Gmail belum terhubung)",
    };
  }

  // 2. Look up user's gmail connection in database
  try {
    const connection = await db.query.gmailConnections.findFirst({
      where: eq(gmailConnections.userId, userId),
    });

    if (connection && connection.status === "connected" && connection.refreshTokenEncrypted) {
      try {
        const refreshToken = decrypt(connection.refreshTokenEncrypted);
        const gmailProvider = new GmailProvider({
          userId,
          refreshToken,
          senderEmail: connection.gmailEmail,
        });
        return {
          provider: gmailProvider,
          isSimulated: false,
          status: "connected",
          statusLabel: "Gmail Terhubung",
          senderEmail: connection.gmailEmail,
        };
      } catch (decryptErr) {
        console.warn("[getUserEmailProvider Warning]: Gagal dekripsi token Gmail:", decryptErr);
      }
    } else if (connection && connection.status === "revoked") {
      return {
        provider: new SimulateProvider(),
        isSimulated: true,
        status: "revoked",
        statusLabel: "Simulasi (Gmail belum terhubung)",
        senderEmail: connection.gmailEmail,
      };
    }
  } catch (dbErr) {
    console.warn("[getUserEmailProvider Warning]: Gagal query gmail_connections:", dbErr);
  }

  // 3. Fallback to SimulateProvider if user has not connected Gmail
  return {
    provider: new SimulateProvider(),
    isSimulated: true,
    status: "not_connected",
    statusLabel: "Simulasi (Gmail belum terhubung)",
  };
}

export function getEmailProvider(): EmailProvider {
  if (testProviderOverride) {
    return testProviderOverride;
  }
  return new SimulateProvider();
}

// Allow overriding for tests
export function setEmailProvider(provider: EmailProvider | null) {
  testProviderOverride = provider;
}
