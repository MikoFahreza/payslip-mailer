"use server";

import { db } from "@/lib/db";
import { users, gmailConnections, attachments, recipients, batches } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { decrypt } from "@/lib/crypto/encryption";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { signOut } from "@/auth";

export interface GmailConnectionInfo {
  connected: boolean;
  status: "connected" | "revoked" | "not_connected";
  gmailEmail?: string | null;
  connectedAt?: Date | null;
}

export async function getGmailConnection(): Promise<GmailConnectionInfo> {
  const userId = await requireUser();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { connected: false, status: "not_connected" };
  }

  try {
    const connection = await db.query.gmailConnections.findFirst({
      where: eq(gmailConnections.userId, userId),
    });

    if (!connection) {
      return { connected: false, status: "not_connected" };
    }

    return {
      connected: connection.status === "connected",
      status: connection.status,
      gmailEmail: connection.gmailEmail,
      connectedAt: connection.connectedAt,
    };
  } catch (err) {
    console.warn("[getGmailConnection Warning]:", err);
    return { connected: false, status: "not_connected" };
  }
}

export async function disconnectGmailAction() {
  const userId = await requireUser();

  try {
    const connection = await db.query.gmailConnections.findFirst({
      where: eq(gmailConnections.userId, userId),
    });

    if (connection?.refreshTokenEncrypted) {
      try {
        const refreshToken = decrypt(connection.refreshTokenEncrypted);
        // Call Google OAuth revocation endpoint
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch (revokeErr) {
        console.warn("[disconnectGmail Warning]: Gagal mencabut token di server Google:", revokeErr);
      }
    }

    // Delete connection record from database
    await db.delete(gmailConnections).where(eq(gmailConnections.userId, userId));

    revalidatePath("/app/settings");
    revalidatePath("/app");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[disconnectGmail Error]:", error);
    return { success: false, error: "Gagal memutuskan koneksi Gmail." };
  }
}

export async function deleteAccountAction() {
  const userId = await requireUser();

  try {
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
        console.warn("[deleteAccount Warning]: Gagal revoke token Google:", err);
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

      const urlsToDelete = userAttachments
        .map((a) => a.blobUrl)
        .filter((u) => u.startsWith("https://") && !u.includes("mock") && !u.includes("localhost"));

      if (urlsToDelete.length > 0) {
        try {
          await del(urlsToDelete);
        } catch (blobErr) {
          console.warn("[deleteAccount Warning]: Gagal menghapus file Blob:", blobErr);
        }
      }
    }

    // 3. Delete user row in DB (cascades to batches, contacts, gmailConnections, sendLogs)
    await db.delete(users).where(eq(users.id, userId));

    // 4. Sign out
    await signOut({ redirectTo: "/" });

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAccount Error]:", error);
    return { success: false, error: "Gagal menghapus akun." };
  }
}
