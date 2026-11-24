import { OAuth2Client } from "google-auth-library";
import { createMimeMessage } from "mimetext";
import { db } from "@/lib/db";
import { gmailConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto/encryption";
import { EmailProvider, SendEmailParams, SendEmailResult } from "./types";

const MAX_MESSAGE_BYTES = 25 * 1024 * 1024; // 25 MB Gmail message limit

interface CachedAccessToken {
  token: string;
  expiresAt: number; // millisecond epoch
}

// In-memory cache for access tokens across one invocation / batch process
const tokenCache = new Map<string, CachedAccessToken>();

export function clearGmailTokenCache(): void {
  tokenCache.clear();
}

export function getCachedTokenForUser(key: string): CachedAccessToken | undefined {
  return tokenCache.get(key);
}

export interface GmailProviderOptions {
  userId?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  senderEmail?: string;
}

export class GmailProvider implements EmailProvider {
  public readonly name = "gmail";
  public readonly userId?: string;
  private clientId: string;
  private clientSecret: string;
  private refreshToken?: string;
  private senderEmail?: string;

  constructor(optionsOrUserId?: string | GmailProviderOptions) {
    if (typeof optionsOrUserId === "string") {
      this.userId = optionsOrUserId;
      this.clientId = process.env.GOOGLE_CLIENT_ID || "";
      this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    } else {
      this.userId = optionsOrUserId?.userId;
      this.clientId = optionsOrUserId?.clientId || process.env.GOOGLE_CLIENT_ID || "";
      this.clientSecret = optionsOrUserId?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || "";
      this.refreshToken = optionsOrUserId?.refreshToken;
      this.senderEmail = optionsOrUserId?.senderEmail;
    }
  }

  /**
   * Helper to mark a user's connection as revoked in the database and clear cache
   */
  private async markRevoked(): Promise<void> {
    if (!this.userId) return;
    try {
      const url = process.env.DATABASE_URL;
      if (!url || url.includes("ep-sample-pooler")) return;

      await db
        .update(gmailConnections)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(eq(gmailConnections.userId, this.userId));
    } catch (err) {
      console.warn("[GmailProvider] Gagal memperbarui status revoked:", err);
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { to, toName, subject, html, text, attachments = [] } = params;

    // 1. Resolve user credentials from database if userId was provided
    if (this.userId && (!this.refreshToken || !this.senderEmail)) {
      try {
        const url = process.env.DATABASE_URL;
        if (!url || url.includes("ep-sample-pooler")) {
          return {
            success: false,
            status: "failed",
            error: "Koneksi database belum dikonfigurasi.",
            provider: "gmail",
          };
        }

        const connection = await db.query.gmailConnections.findFirst({
          where: eq(gmailConnections.userId, this.userId),
        });

        if (!connection || !connection.refreshTokenEncrypted) {
          return {
            success: false,
            status: "failed",
            error: "Akun Gmail belum terhubung.",
            provider: "gmail",
          };
        }

        if (connection.status === "revoked") {
          return {
            success: false,
            status: "failed",
            error: "Hubungkan ulang Gmail",
            provider: "gmail",
          };
        }

        try {
          this.refreshToken = decrypt(connection.refreshTokenEncrypted);
          this.senderEmail = connection.gmailEmail;
        } catch (decryptErr) {
          return {
            success: false,
            status: "failed",
            error: `Gagal mendekripsi kredensial Gmail: ${(decryptErr as Error).message}`,
            provider: "gmail",
          };
        }
      } catch (dbErr) {
        return {
          success: false,
          status: "failed",
          error: `Gagal membaca kredensial pengguna: ${(dbErr as Error).message}`,
          provider: "gmail",
        };
      }
    }

    // 2. Verify required credentials
    if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.senderEmail) {
      return {
        success: false,
        status: "failed",
        error:
          "Konfigurasi Gmail API belum lengkap (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, atau kredensial pengguna hilang)",
        provider: "gmail",
      };
    }

    // 3. Exchange refresh token for access token (with in-memory cache)
    const cacheKey = this.userId ? `user:${this.userId}` : `token:${this.refreshToken}`;
    let accessToken: string;

    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      accessToken = cached.token;
    } else {
      try {
        const oauth2Client = new OAuth2Client(this.clientId, this.clientSecret);
        oauth2Client.setCredentials({ refresh_token: this.refreshToken });
        const tokenResponse = await oauth2Client.getAccessToken();

        if (!tokenResponse.token) {
          await this.markRevoked();
          tokenCache.delete(cacheKey);
          return {
            success: false,
            status: "failed",
            error: "Hubungkan ulang Gmail",
            provider: "gmail",
          };
        }

        accessToken = tokenResponse.token;
        // Cache token in memory for this invocation (~58 minutes)
        tokenCache.set(cacheKey, {
          token: accessToken,
          expiresAt: Date.now() + 3500 * 1000,
        });
      } catch (authError: unknown) {
        const err = authError as Error;
        const msg = (err.message || "").toLowerCase();
        if (
          msg.includes("invalid_grant") ||
          msg.includes("unauthorized_client") ||
          msg.includes("401") ||
          msg.includes("revoked") ||
          msg.includes("expired")
        ) {
          await this.markRevoked();
          tokenCache.delete(cacheKey);
          return {
            success: false,
            status: "failed",
            error: "Hubungkan ulang Gmail",
            provider: "gmail",
          };
        }

        return {
          success: false,
          status: "failed",
          error: `Gagal mendapatkan token Gmail: ${err.message}`,
          provider: "gmail",
        };
      }
    }

    // 4. Compose MIME Message with From = user's connected Gmail address
    let rawBase64Url: string;
    try {
      const msg = createMimeMessage();
      const appName = process.env.NEXT_PUBLIC_APP_NAME || "Payslip Mailer";

      msg.setSender({ name: appName, addr: this.senderEmail });
      msg.setRecipient({ name: toName, addr: to });
      msg.setSubject(subject);

      if (text) {
        msg.addMessage({
          contentType: "text/plain",
          data: text,
        });
      }

      msg.addMessage({
        contentType: "text/html",
        data: html,
      });

      for (const att of attachments) {
        msg.addAttachment({
          filename: att.filename,
          contentType: att.contentType,
          data: att.content.toString("base64"),
        });
      }

      const rawMime = msg.asRaw();
      const rawBuffer = Buffer.from(rawMime);

      if (rawBuffer.byteLength > MAX_MESSAGE_BYTES) {
        return {
          success: false,
          status: "failed",
          error: `Ukuran pesan (${(rawBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB) melebihi batas 25 MB Gmail`,
          provider: "gmail",
        };
      }

      rawBase64Url = rawBuffer.toString("base64url");
    } catch (mimeError: unknown) {
      const err = mimeError as Error;
      return {
        success: false,
        status: "failed",
        error: `Gagal menyusun pesan email: ${err.message}`,
        provider: "gmail",
      };
    }

    // 5. Send via Gmail REST API with 25s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: rawBase64Url }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as { id?: string };
        return {
          success: true,
          status: "sent",
          messageId: data.id,
          provider: "gmail",
        };
      }

      const statusCode = response.status;
      const errorJson = (await response.json().catch(() => null)) as {
        error?: { message?: string; status?: string };
      } | null;

      const apiErrorMessage = errorJson?.error?.message || "";

      // invalid_grant / 401 -> mark revoked & prompt "Hubungkan ulang Gmail"
      if (
        statusCode === 401 ||
        apiErrorMessage.toLowerCase().includes("invalid_grant") ||
        apiErrorMessage.toLowerCase().includes("unauthorized")
      ) {
        await this.markRevoked();
        tokenCache.delete(cacheKey);
        return {
          success: false,
          status: "failed",
          error: "Hubungkan ulang Gmail",
          provider: "gmail",
        };
      }

      // 429 -> Rate limit failed
      if (statusCode === 429) {
        return {
          success: false,
          status: "failed",
          error: "Batas frekuensi Gmail API terlampaui (rate limit). Silakan coba lagi nanti.",
          provider: "gmail",
        };
      }

      // 5xx -> Server failure
      if (statusCode >= 500) {
        return {
          success: false,
          status: "failed",
          error: `Server Gmail mengalami gangguan (HTTP ${statusCode}). Silakan kirim ulang.`,
          provider: "gmail",
        };
      }

      return {
        success: false,
        status: "failed",
        error: apiErrorMessage || `Gmail API mengembalikan error HTTP ${statusCode}`,
        provider: "gmail",
      };
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const err = fetchError as Error;

      // Timeout after request was sent -> unknown status
      if (err.name === "AbortError" || err.message?.includes("abort")) {
        return {
          success: false,
          status: "unknown",
          error: "Koneksi timeout setelah permintaan dikirim ke Gmail API. Status tidak pasti.",
          provider: "gmail",
        };
      }

      return {
        success: false,
        status: "failed",
        error: `Gagal mengirim email via Gmail: ${err.message}`,
        provider: "gmail",
      };
    }
  }
}
