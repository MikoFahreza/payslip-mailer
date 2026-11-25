"use server";

import { db } from "@/lib/db";
import { attachments, batches, recipients, sendLogs, gmailConnections } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { assertOwnsRecipient } from "@/lib/auth/isolation";
import { getUserEmailProvider } from "@/lib/email";
import { generateEmailHtml, generateEmailText } from "@/lib/email/template";
import { EmailAttachment } from "@/lib/email/types";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deleteRemoteBlobs } from "@/lib/storage/blob-config";
import { getMockFile, deleteMockFile } from "@/lib/storage/mock-store";
import { DAILY_SEND_LIMIT, DailyQuotaResult, SendRecipientResult } from "./send-types";

export async function getDailySendQuota(): Promise<DailyQuotaResult> {
  const userId = await requireUser();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { used: 0, max: DAILY_SEND_LIMIT, remaining: DAILY_SEND_LIMIT };
  }

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sendLogs)
      .where(and(eq(sendLogs.userId, userId), eq(sendLogs.event, "sent"), gte(sendLogs.createdAt, oneDayAgo)));

    const used = row?.count || 0;
    return {
      used,
      max: DAILY_SEND_LIMIT,
      remaining: Math.max(0, DAILY_SEND_LIMIT - used),
    };
  } catch (err: unknown) {
    console.warn("[getDailySendQuota] Error fetching quota:", err);
    return { used: 0, max: DAILY_SEND_LIMIT, remaining: DAILY_SEND_LIMIT };
  }
}

export async function sendRecipient(recipientId: string): Promise<SendRecipientResult> {
  const userId = await requireUser();
  await assertOwnsRecipient(recipientId, userId);

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      success: false,
      status: "failed",
      recipientId,
      error: "Koneksi database belum dikonfigurasi dengan benar.",
    };
  }

  // 1. Check daily send limit (max 100 per day)
  const quota = await getDailySendQuota();
  if (quota.remaining <= 0) {
    return {
      success: false,
      status: "failed",
      recipientId,
      error: `Batas pengiriman harian (${DAILY_SEND_LIMIT} email per hari) telah tercapai. Coba lagi besok.`,
    };
  }

  // 2. Atomic status transition: pending or failed -> sending
  // If 0 rows updated, skip (prevents double-sending)
  const updatedRows = await db
    .update(recipients)
    .set({
      status: "sending",
      errorMessage: null,
    })
    .where(and(eq(recipients.id, recipientId), inArray(recipients.status, ["pending", "failed"])))
    .returning({
      id: recipients.id,
      batchId: recipients.batchId,
      name: recipients.name,
      email: recipients.email,
    });

  if (updatedRows.length === 0) {
    return {
      success: false,
      status: "skipped",
      recipientId,
      error: "Penerima sedang dikirim atau sudah terkirim.",
    };
  }

  const recipient = updatedRows[0];

  // 3. Fetch batch info and attachments
  const batchRow = await db.query.batches.findFirst({
    where: eq(batches.id, recipient.batchId),
  });
  const batchName = batchRow?.name || "Periode Gaji";

  // 4. Record attempt event in send_logs
  await db.insert(sendLogs).values({
    userId,
    recipientId: recipient.id,
    event: "attempt",
    detail: "Memulai proses pengiriman email",
  });

  const attRows = await db
    .select()
    .from(attachments)
    .where(eq(attachments.recipientId, recipient.id));

  // Resolve user's email provider upfront so we know whether real Gmail or simulation is used
  const providerInfo = await getUserEmailProvider(userId);

  // 5. Download attachments
  const emailAttachments: EmailAttachment[] = [];
  let totalAttachmentBytes = 0;

  for (const att of attRows) {
    try {
      let buffer: Buffer;

      // 1. Check local mock storage first
      if (att.blobUrl.includes("/api/blob/mock/")) {
        const fileId = att.blobUrl.split("/api/blob/mock/").pop()?.split("?")[0] || "";
        const localFile = getMockFile(fileId);
        if (localFile) {
          buffer = localFile.buffer;
        } else if (providerInfo.isSimulated) {
          // Graceful fallback only in simulated mode
          buffer = Buffer.from(`Isi lampiran simulasi untuk ${att.filename}`);
        } else {
          throw new Error(
            "File tidak ditemukan di penyimpanan sementara server (mock). Pastikan BLOB_READ_WRITE_TOKEN aktif dan unggah ulang lampiran."
          );
        }
      } else if (att.blobUrl.startsWith("http")) {
        try {
          const fileRes = await fetch(att.blobUrl);
          if (!fileRes.ok) {
            throw new Error(`HTTP ${fileRes.status}`);
          }
          const arrayBuf = await fileRes.arrayBuffer();
          buffer = Buffer.from(arrayBuf);
          if (buffer.byteLength === 0) {
            throw new Error("File lampiran yang diunduh kosong (0 byte).");
          }
        } catch (fetchErr: unknown) {
          // Only fallback for mock/sample/localhost URLs when running in simulated mode
          if (
            providerInfo.isSimulated &&
            (att.blobUrl.includes("mock") ||
              att.blobUrl.includes("sample") ||
              att.blobUrl.includes("localhost"))
          ) {
            buffer = Buffer.from(`Isi lampiran simulasi untuk ${att.filename}`);
          } else {
            throw fetchErr;
          }
        }
      } else if (providerInfo.isSimulated) {
        // Fallback for simulated blob URLs in mock/test mode
        buffer = Buffer.from(`Isi lampiran simulasi untuk ${att.filename}`);
      } else {
        throw new Error("URL file lampiran tidak valid.");
      }

      totalAttachmentBytes += buffer.byteLength;
      emailAttachments.push({
        filename: att.filename,
        contentType: att.contentType,
        content: buffer,
      });
    } catch (downloadErr: unknown) {
      const err = downloadErr as Error;
      // If we cannot download attachment in simulate mode, generate mock buffer
      if (providerInfo.isSimulated) {
        const dummyBuf = Buffer.from(`Isi lampiran simulasi untuk ${att.filename}`);
        emailAttachments.push({
          filename: att.filename,
          contentType: att.contentType,
          content: dummyBuf,
        });
      } else {
        const errorMsg = `Gagal mengunduh file lampiran '${att.filename}': ${err.message}`;
        await db
          .update(recipients)
          .set({ status: "failed", errorMessage: errorMsg })
          .where(eq(recipients.id, recipient.id));

        await db.insert(sendLogs).values({
          userId,
          recipientId: recipient.id,
          event: "failed",
          detail: errorMsg,
        });

        revalidatePath(`/app/batches/${recipient.batchId}`);
        return {
          success: false,
          status: "failed",
          recipientId: recipient.id,
          error: errorMsg,
        };
      }
    }
  }

  // Check 25 MB limit for attachments
  if (totalAttachmentBytes > 24 * 1024 * 1024) {
    const errorMsg = "Total ukuran lampiran melebihi batas 24 MB.";
    await db
      .update(recipients)
      .set({ status: "failed", errorMessage: errorMsg })
      .where(eq(recipients.id, recipient.id));

    await db.insert(sendLogs).values({
      userId,
      recipientId: recipient.id,
      event: "failed",
      detail: errorMsg,
    });

    revalidatePath(`/app/batches/${recipient.batchId}`);
    return {
      success: false,
      status: "failed",
      recipientId: recipient.id,
      error: errorMsg,
    };
  }

  // 6. Build email content
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Payslip Mailer";
  const attachmentFilenames = attRows.map((a) => a.filename);
  const subject = `Slip Gaji & Bukti Transfer - ${batchName}`;
  const html = generateEmailHtml({
    recipientName: recipient.name,
    batchName,
    appName,
    attachmentNames: attachmentFilenames,
  });
  const text = generateEmailText({
    recipientName: recipient.name,
    batchName,
    appName,
    attachmentNames: attachmentFilenames,
  });

  // 7. Send email via user's email provider (Gmail if connected, Simulate if not)
  const sendResult = await providerInfo.provider.sendEmail({
    to: recipient.email,
    toName: recipient.name,
    subject,
    html,
    text,
    attachments: emailAttachments,
  });

  // If token is invalid or expired, automatically flag connection as revoked
  if (
    sendResult.status === "failed" &&
    (sendResult.error === "Hubungkan ulang Gmail" ||
      sendResult.error?.includes("Otorisasi Gmail kedaluwarsa") ||
      sendResult.error?.includes("invalid_grant") ||
      sendResult.error?.includes("revoked"))
  ) {
    try {
      await db
        .update(gmailConnections)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(eq(gmailConnections.userId, userId));
    } catch (e) {
      console.warn("[sendRecipient Warning]: Gagal update status revoked:", e);
    }
  }

  // 8. Handle result status
  if (sendResult.status === "sent") {
    // SUCCESS: Mark sent, record log, delete Blob files and attachment records
    await db
      .update(recipients)
      .set({
        status: "sent",
        sentAt: new Date(),
        errorMessage: null,
      })
      .where(eq(recipients.id, recipient.id));

    await db.insert(sendLogs).values({
      userId,
      recipientId: recipient.id,
      event: "sent",
      detail: `Berhasil dikirim via ${sendResult.provider} (ID: ${sendResult.messageId || "-"}). Lampiran: ${attachmentFilenames.join(", ") || "tidak ada"}.`,
    });

    if (attRows.length > 0) {
      // Clean up local mock files if any
      for (const a of attRows) {
        if (a.blobUrl.includes("/api/blob/mock/")) {
          const fileId = a.blobUrl.split("/api/blob/mock/").pop()?.split("?")[0] || "";
          deleteMockFile(fileId);
        }
      }

      await deleteRemoteBlobs(attRows.map((a) => a.blobUrl)).catch((delErr) =>
        console.warn("[sendRecipient] Gagal membersihkan blob:", delErr)
      );
      // Clean up attachment rows from database
      await db.delete(attachments).where(eq(attachments.recipientId, recipient.id));
    }

    revalidatePath(`/app/batches/${recipient.batchId}`);
    revalidatePath("/app");
    return {
      success: true,
      status: "sent",
      recipientId: recipient.id,
    };
  }

  if (sendResult.status === "failed") {
    // CLEAR FAILURE: Mark failed with brief error message
    const errorMsg = sendResult.error || "Pengiriman gagal.";
    await db
      .update(recipients)
      .set({
        status: "failed",
        errorMessage: errorMsg,
      })
      .where(eq(recipients.id, recipient.id));

    await db.insert(sendLogs).values({
      userId,
      recipientId: recipient.id,
      event: "failed",
      detail: errorMsg,
    });

    revalidatePath(`/app/batches/${recipient.batchId}`);
    return {
      success: false,
      status: "failed",
      recipientId: recipient.id,
      error: errorMsg,
    };
  }

  // UNCERTAIN RESULT (timeout/unknown): Mark unknown, DO NOT delete blob, require manual admin decision
  const unknownMsg = sendResult.error || "Status pengiriman tidak pasti (koneksi timeout).";
  await db
    .update(recipients)
    .set({
      status: "unknown",
      errorMessage: unknownMsg,
    })
    .where(eq(recipients.id, recipient.id));

  await db.insert(sendLogs).values({
    userId,
    recipientId: recipient.id,
    event: "failed",
    detail: `Hasil tidak pasti: ${unknownMsg}`,
  });

  revalidatePath(`/app/batches/${recipient.batchId}`);
  return {
    success: false,
    status: "unknown",
    recipientId: recipient.id,
    error: unknownMsg,
  };
}

export async function resolveUnknownStatus(
  recipientId: string,
  resolution: "sent" | "failed"
): Promise<{ success: boolean; error?: string }> {
  const userId = await requireUser();
  await assertOwnsRecipient(recipientId, userId);

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { success: false, error: "Database belum siap." };
  }

  const [recipient] = await db
    .select({
      id: recipients.id,
      batchId: recipients.batchId,
      status: recipients.status,
    })
    .from(recipients)
    .where(eq(recipients.id, recipientId));

  if (!recipient) {
    return { success: false, error: "Penerima tidak ditemukan." };
  }

  if (recipient.status !== "unknown") {
    return { success: false, error: "Hanya status 'unknown' yang dapat diselesaikan manual." };
  }

  if (resolution === "sent") {
    await db
      .update(recipients)
      .set({
        status: "sent",
        sentAt: new Date(),
        errorMessage: null,
      })
      .where(eq(recipients.id, recipientId));

    await db.insert(sendLogs).values({
      userId,
      recipientId,
      event: "sent",
      detail: "Admin menandai status sebagai terkirim secara manual.",
    });

    // Delete any remaining blob files & attachments
    const atts = await db
      .select()
      .from(attachments)
      .where(eq(attachments.recipientId, recipientId));
    if (atts.length > 0) {
      for (const a of atts) {
        if (a.blobUrl.includes("/api/blob/mock/")) {
          const fileId = a.blobUrl.split("/api/blob/mock/").pop()?.split("?")[0] || "";
          deleteMockFile(fileId);
        }
      }
      await deleteRemoteBlobs(atts.map((a) => a.blobUrl)).catch(console.warn);
      await db.delete(attachments).where(eq(attachments.recipientId, recipientId));
    }
  } else {
    await db
      .update(recipients)
      .set({
        status: "failed",
        errorMessage: "Ditandai gagal oleh admin untuk dikirim ulang.",
      })
      .where(eq(recipients.id, recipientId));

    await db.insert(sendLogs).values({
      userId,
      recipientId,
      event: "failed",
      detail: "Admin menandai status sebagai gagal secara manual.",
    });
  }

  revalidatePath(`/app/batches/${recipient.batchId}`);
  revalidatePath("/app");
  return { success: true };
}
