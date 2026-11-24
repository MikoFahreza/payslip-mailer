import { EmailProvider } from "./types";
import { GmailProvider } from "./gmail-provider";
import { SimulateProvider } from "./simulate-provider";
import { db } from "@/lib/db";
import { gmailConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto/encryption";

let testProviderOverride: EmailProvider | null = null;

export async function getUserEmailProvider(userId: string): Promise<{
  provider: EmailProvider;
  isSimulated: boolean;
}> {
  if (testProviderOverride) {
    return {
      provider: testProviderOverride,
      isSimulated: testProviderOverride.name === "simulate",
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { provider: new SimulateProvider(), isSimulated: true };
  }

  // Look up user's gmail connection in database
  try {
    const connection = await db.query.gmailConnections.findFirst({
      where: eq(gmailConnections.userId, userId),
    });

    if (
      connection &&
      connection.status === "connected" &&
      connection.refreshTokenEncrypted
    ) {
      try {
        const refreshToken = decrypt(connection.refreshTokenEncrypted);
        const gmailProvider = new GmailProvider({
          refreshToken,
          senderEmail: connection.gmailEmail,
        });
        return { provider: gmailProvider, isSimulated: false };
      } catch (decryptErr) {
        console.warn("[getUserEmailProvider Warning]: Gagal dekripsi token Gmail:", decryptErr);
      }
    }
  } catch (dbErr) {
    console.warn("[getUserEmailProvider Warning]: Gagal query gmail_connections:", dbErr);
  }

  // Default to SimulateProvider if user has not connected Gmail
  return { provider: new SimulateProvider(), isSimulated: true };
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
