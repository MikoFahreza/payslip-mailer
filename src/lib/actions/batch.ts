"use server";

import { db } from "@/lib/db";
import { batches, recipients } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { batchSchema } from "@/lib/validations/batch";
import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface BatchSummary {
  id: string;
  name: string;
  createdAt: Date;
  totalRecipients: number;
  sentCount: number;
  pendingCount: number;
  failedCount: number;
}

export async function getBatches(): Promise<BatchSummary[]> {
  await requireSession();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return [];
  }

  try {
    const rows = await db
      .select({
        id: batches.id,
        name: batches.name,
        createdAt: batches.createdAt,
        totalRecipients: sql<number>`count(${recipients.id})::int`,
        sentCount: sql<number>`count(case when ${recipients.status} = 'sent' then 1 end)::int`,
        pendingCount: sql<number>`count(case when ${recipients.status} = 'pending' then 1 end)::int`,
        failedCount: sql<number>`count(case when ${recipients.status} = 'failed' then 1 end)::int`,
      })
      .from(batches)
      .leftJoin(recipients, eq(batches.id, recipients.batchId))
      .groupBy(batches.id)
      .orderBy(desc(batches.createdAt));

    return rows;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn("[getBatches Warning]: Database belum dapat dihubungi:", error?.message || error);
    return [];
  }
}

export async function getBatchById(id: string) {
  await requireSession();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return null;
  }

  try {
    const [batch] = await db.select().from(batches).where(eq(batches.id, id)).limit(1);

    if (!batch) return null;

    const recipientList = await db
      .select()
      .from(recipients)
      .where(eq(recipients.batchId, id))
      .orderBy(recipients.createdAt);

    return {
      ...batch,
      recipients: recipientList,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(
      "[getBatchById Warning]: Database belum dapat dihubungi:",
      error?.message || error
    );
    return null;
  }
}

export async function createBatch(data: { name: string }) {
  await requireSession();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      success: false,
      error:
        "Database Neon belum dikonfigurasi. Harap masukkan connection string DATABASE_URL aktif ke file .env.local terlebih dahulu.",
    };
  }

  const validation = batchSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Nama batch tidak valid.",
    };
  }

  try {
    const [newBatch] = await db
      .insert(batches)
      .values({
        name: validation.data.name.trim(),
      })
      .returning();

    revalidatePath("/app");
    return { success: true, data: newBatch };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[createBatch Error]:", error);
    return {
      success: false,
      error: "Gagal membuat batch baru. Pastikan koneksi database aktif.",
    };
  }
}

export async function updateBatchName(id: string, name: string) {
  await requireSession();

  const validation = batchSchema.safeParse({ name });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Nama batch tidak valid.",
    };
  }

  try {
    const [updated] = await db
      .update(batches)
      .set({
        name: validation.data.name.trim(),
      })
      .where(eq(batches.id, id))
      .returning();

    if (!updated) {
      return { success: false, error: "Batch tidak ditemukan." };
    }

    revalidatePath("/app");
    revalidatePath(`/app/batches/${id}`);
    return { success: true, data: updated };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[updateBatchName Error]:", error);
    return {
      success: false,
      error: "Gagal memperbarui nama batch.",
    };
  }
}

export async function deleteBatch(id: string) {
  await requireSession();

  try {
    const [deleted] = await db.delete(batches).where(eq(batches.id, id)).returning();

    if (!deleted) {
      return { success: false, error: "Batch tidak ditemukan." };
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteBatch Error]:", error);
    return {
      success: false,
      error: "Gagal menghapus batch.",
    };
  }
}
