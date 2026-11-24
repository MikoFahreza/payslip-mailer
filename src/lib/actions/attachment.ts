"use server";

import { db } from "@/lib/db";
import { attachments, recipients } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import {
  assertOwnsBatch,
  assertOwnsRecipient,
  assertOwnsAttachment,
  assertOwnsBlobPathname,
} from "@/lib/auth/isolation";
import {
  attachmentInputSchema,
  MAX_ATTACHMENTS_PER_RECIPIENT,
  sanitizeFilename,
  type AttachmentInput,
} from "@/lib/validations/attachment";
import { eq, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { deleteMockFile } from "@/lib/storage/mock-store";

export async function saveAttachment(batchId: string, recipientId: string, input: AttachmentInput) {
  const userId = await requireUser();
  await assertOwnsBatch(batchId, userId);
  await assertOwnsRecipient(recipientId, userId);
  assertOwnsBlobPathname(input.blobPathname, userId);

  const validation = attachmentInputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Metadata file tidak valid.",
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      success: false,
      error: "Database Neon belum dikonfigurasi. Harap perbarui DATABASE_URL di .env.local.",
    };
  }

  try {
    // 1. Verify recipient belongs to this batch
    const [recipient] = await db
      .select({ id: recipients.id })
      .from(recipients)
      .where(and(eq(recipients.id, recipientId), eq(recipients.batchId, batchId)))
      .limit(1);

    if (!recipient) {
      return { success: false, error: "Penerima tidak ditemukan dalam batch ini." };
    }

    // 2. Enforce limit of 3 files per recipient
    const [countResult] = await db
      .select({ total: count() })
      .from(attachments)
      .where(eq(attachments.recipientId, recipientId));

    if ((countResult?.total ?? 0) >= MAX_ATTACHMENTS_PER_RECIPIENT) {
      return {
        success: false,
        error: `Maksimal ${MAX_ATTACHMENTS_PER_RECIPIENT} file per penerima. Hapus file lama jika ingin mengganti.`,
      };
    }

    // 3. Sanitize filename and save attachment
    const cleanFilename = sanitizeFilename(validation.data.filename);

    const [newAttachment] = await db
      .insert(attachments)
      .values({
        recipientId,
        blobUrl: validation.data.blobUrl,
        blobPathname: validation.data.blobPathname,
        filename: cleanFilename,
        contentType: validation.data.contentType,
        sizeBytes: validation.data.sizeBytes,
        kind: validation.data.kind,
      })
      .returning();

    revalidatePath(`/app/batches/${batchId}`);
    return { success: true, data: newAttachment };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[saveAttachment Error]:", error);
    return {
      success: false,
      error: "Gagal menyimpan metadata file ke database.",
    };
  }
}

export async function deleteAttachment(attachmentId: string, recipientId: string, batchId: string) {
  const userId = await requireUser();
  await assertOwnsBatch(batchId, userId);
  await assertOwnsRecipient(recipientId, userId);
  await assertOwnsAttachment(attachmentId, userId);

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      success: false,
      error: "Database Neon belum dikonfigurasi.",
    };
  }

  try {
    // 1. Find the attachment
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, attachmentId), eq(attachments.recipientId, recipientId)))
      .limit(1);

    if (!attachment) {
      return { success: false, error: "File lampiran tidak ditemukan." };
    }

    // 2. Delete from Vercel Blob or local mock store
    if (attachment.blobUrl.includes("/api/blob/mock/")) {
      const fileId = attachment.blobUrl.split("/api/blob/mock/").pop()?.split("?")[0] || "";
      deleteMockFile(fileId);
    } else {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (token && !token.includes("sample") && !attachment.blobUrl.includes("mock")) {
        try {
          await del(attachment.blobUrl);
        } catch (blobErr) {
          console.warn(
            "[deleteAttachment Blob Warning]: Gagal menghapus dari Vercel Blob:",
            blobErr
          );
        }
      }
    }

    // 3. Delete from database
    await db.delete(attachments).where(eq(attachments.id, attachmentId));

    revalidatePath(`/app/batches/${batchId}`);
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAttachment Error]:", error);
    return {
      success: false,
      error: "Gagal menghapus file lampiran.",
    };
  }
}

export async function getAttachmentsByRecipient(recipientId: string) {
  const userId = await requireUser();
  await assertOwnsRecipient(recipientId, userId);

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return [];
  }

  try {
    const list = await db
      .select()
      .from(attachments)
      .where(eq(attachments.recipientId, recipientId))
      .orderBy(attachments.createdAt);

    return list;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getAttachmentsByRecipient Error]:", error);
    return [];
  }
}
