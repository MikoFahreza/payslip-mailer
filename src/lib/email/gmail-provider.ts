import { OAuth2Client } from "google-auth-library";
import { createMimeMessage } from "mimetext";
import { EmailProvider, SendEmailParams, SendEmailResult } from "./types";

const MAX_MESSAGE_BYTES = 25 * 1024 * 1024; // 25 MB Gmail message limit

export class GmailProvider implements EmailProvider {
  public readonly name = "gmail";
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private senderEmail: string;

  constructor(options?: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    senderEmail?: string;
  }) {
    this.clientId = options?.clientId || process.env.GOOGLE_CLIENT_ID || "";
    this.clientSecret = options?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || "";
    this.refreshToken = options?.refreshToken || process.env.GMAIL_REFRESH_TOKEN || "";
    this.senderEmail = options?.senderEmail || process.env.GMAIL_SENDER || "";
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { to, toName, subject, html, text, attachments = [] } = params;

    // 1. Verify required credentials
    if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.senderEmail) {
      return {
        success: false,
        status: "failed",
        error:
          "Konfigurasi Gmail API belum lengkap di environment variable (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER)",
        provider: "gmail",
      };
    }

    // 2. Exchange refresh token for access token
    let accessToken: string;
    try {
      const oauth2Client = new OAuth2Client(this.clientId, this.clientSecret);
      oauth2Client.setCredentials({ refresh_token: this.refreshToken });
      const tokenResponse = await oauth2Client.getAccessToken();

      if (!tokenResponse.token) {
        return {
          success: false,
          status: "failed",
          error: "Otorisasi Gmail kedaluwarsa, ulangi otorisasi",
          provider: "gmail",
        };
      }

      accessToken = tokenResponse.token;
    } catch (authError: unknown) {
      const err = authError as Error;
      const msg = err.message || "";
      if (
        msg.includes("invalid_grant") ||
        msg.includes("unauthorized_client") ||
        msg.includes("401")
      ) {
        return {
          success: false,
          status: "failed",
          error: "Otorisasi Gmail kedaluwarsa, ulangi otorisasi",
          provider: "gmail",
        };
      }
      return {
        success: false,
        status: "failed",
        error: `Gagal mendapatkan token Gmail: ${msg}`,
        provider: "gmail",
      };
    }

    // 3. Compose MIME Message
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

    // 4. Send via Gmail REST API with 25s timeout
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

      if (statusCode === 401 || apiErrorMessage.toLowerCase().includes("invalid_grant")) {
        return {
          success: false,
          status: "failed",
          error: "Otorisasi Gmail kedaluwarsa, ulangi otorisasi",
          provider: "gmail",
        };
      }

      if (statusCode === 429) {
        return {
          success: false,
          status: "failed",
          error: "Batas frekuensi Gmail API terlampaui (rate limit). Silakan coba lagi nanti.",
          provider: "gmail",
        };
      }

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
