import { db } from "@/lib/db";
import { gmailConnections, attachments, recipients, batches } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto/encryption";
import { deleteRemoteBlobs } from "@/lib/storage/blob-config";
import { eq, inArray } from "drizzle-orm";

/**
 * Revokes a user's active Google OAuth token (if present) and deletes
 * all Vercel Blob files attached to any of the user's batches.
 */
export async function cleanupUserExternalResources(userId: string): Promise<void> {
  // 1. Revoke Gmail token if exists
  const connection = await db.query.gmailConnections.findFirst({
    where: eq(gmailConnections.userId, userId),
  });

  if (connection?.refreshTokenEncrypted) {
    try {
      const refreshToken = decrypt(connection.refreshTokenEncrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: "POST",
      });
    } catch (err) {
      console.warn("[cleanupUserExternalResources Warning]: Gagal revoke token Google:", err);
    }
  }

  // 2. Clean up user's Vercel Blob files
  const userBatches = await db
    .select({ id: batches.id })
    .from(batches)
    .where(eq(batches.userId, userId));

  const batchIds = userBatches.map((b) => b.id);
  if (batchIds.length > 0) {
    const userAttachments = await db
      .select({ blobUrl: attachments.blobUrl })
      .from(attachments)
      .innerJoin(recipients, eq(attachments.recipientId, recipients.id))
      .where(inArray(recipients.batchId, batchIds));

    if (userAttachments.length > 0) {
      try {
        await deleteRemoteBlobs(userAttachments.map((a) => a.blobUrl));
      } catch (blobErr) {
        console.warn("[cleanupUserExternalResources Warning]: Gagal menghapus file Blob:", blobErr);
      }
    }
  }
}
