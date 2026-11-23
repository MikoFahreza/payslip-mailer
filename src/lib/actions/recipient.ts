"use server";

import { db } from "@/lib/db";
import { recipients } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { recipientSchema } from "@/lib/validations/recipient";
import { eq, and, ne, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addRecipient(batchId: string, data: { name: string; email: string }) {
  await requireSession();

  const validation = recipientSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Data penerima tidak valid.",
    };
  }

  const normalizedEmail = validation.data.email.trim().toLowerCase();
  const normalizedName = validation.data.name.trim();

  try {
    // 1. Enforce max 50 recipients per batch
    const [countResult] = await db
      .select({ total: count() })
      .from(recipients)
      .where(eq(recipients.batchId, batchId));

    if ((countResult?.total ?? 0) >= 50) {
      return {
        success: false,
        error: "Maksimal 50 penerima per batch untuk mencegah penyalahgunaan.",
      };
    }

    // 2. Enforce unique email per batch (friendly check before DB constraint)
    const [existing] = await db
      .select({ id: recipients.id })
      .from(recipients)
      .where(and(eq(recipients.batchId, batchId), eq(recipients.email, normalizedEmail)))
      .limit(1);

    if (existing) {
      return {
        success: false,
        error: "Email sudah terdaftar dalam batch ini.",
      };
    }

    // 3. Insert recipient with 'pending' status
    const [newRecipient] = await db
      .insert(recipients)
      .values({
        batchId,
        name: normalizedName,
        email: normalizedEmail,
        status: "pending",
      })
      .returning();

    revalidatePath(`/app/batches/${batchId}`);
    return { success: true, data: newRecipient };
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error("[addRecipient Error]:", error);

    // Postgres unique violation code 23505
    if (error.code === "23505" || error.message?.includes("recipients_batch_email_unique_idx")) {
      return {
        success: false,
        error: "Email sudah terdaftar dalam batch ini.",
      };
    }

    return {
      success: false,
      error: "Gagal menambahkan penerima. Silakan coba kembali.",
    };
  }
}

export async function updateRecipient(
  id: string,
  batchId: string,
  data: { name: string; email: string }
) {
  await requireSession();

  const validation = recipientSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Data penerima tidak valid.",
    };
  }

  const normalizedEmail = validation.data.email.trim().toLowerCase();
  const normalizedName = validation.data.name.trim();

  try {
    // Check if another recipient in this batch already has this email
    const [duplicate] = await db
      .select({ id: recipients.id })
      .from(recipients)
      .where(
        and(
          eq(recipients.batchId, batchId),
          eq(recipients.email, normalizedEmail),
          ne(recipients.id, id)
        )
      )
      .limit(1);

    if (duplicate) {
      return {
        success: false,
        error: "Email sudah digunakan oleh penerima lain dalam batch ini.",
      };
    }

    const [updated] = await db
      .update(recipients)
      .set({
        name: normalizedName,
        email: normalizedEmail,
      })
      .where(and(eq(recipients.id, id), eq(recipients.batchId, batchId)))
      .returning();

    if (!updated) {
      return { success: false, error: "Penerima tidak ditemukan." };
    }

    revalidatePath(`/app/batches/${batchId}`);
    return { success: true, data: updated };
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error("[updateRecipient Error]:", error);

    if (error.code === "23505" || error.message?.includes("recipients_batch_email_unique_idx")) {
      return {
        success: false,
        error: "Email sudah digunakan oleh penerima lain dalam batch ini.",
      };
    }

    return {
      success: false,
      error: "Gagal memperbarui penerima.",
    };
  }
}

export async function deleteRecipient(id: string, batchId: string) {
  await requireSession();

  try {
    const [deleted] = await db
      .delete(recipients)
      .where(and(eq(recipients.id, id), eq(recipients.batchId, batchId)))
      .returning();

    if (!deleted) {
      return { success: false, error: "Penerima tidak ditemukan." };
    }

    revalidatePath(`/app/batches/${batchId}`);
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteRecipient Error]:", error);
    return {
      success: false,
      error: "Gagal menghapus penerima.",
    };
  }
}
