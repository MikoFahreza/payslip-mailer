"use server";

import { db } from "@/lib/db";
import { gmailConnections, users } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto/encryption";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth/session";
import { cleanupUserExternalResources } from "@/lib/actions/user-cleanup";

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
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch (revokeErr) {
        console.warn("[disconnectGmail Warning]: Gagal mencabut token di server Google:", revokeErr);
      }
    }

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
    await cleanupUserExternalResources(userId);
    await db.delete(users).where(eq(users.id, userId));
    await signOut({ redirectTo: "/" });
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAccount Error]:", error);
    return { success: false, error: "Gagal menghapus akun." };
  }
}
