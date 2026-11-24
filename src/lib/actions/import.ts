"use server";

import { db } from "@/lib/db";
import { batches, recipients } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { singleImportRecipientSchema } from "@/lib/validations/import";
import { MAX_RECIPIENTS_PER_BATCH } from "@/lib/validations/recipient";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ImportRecipientInput {
  name: string;
  email: string;
}

export interface ImportBatchResult {
  success: boolean;
  insertedCount: number;
  skippedCount: number;
  error?: string;
}

export async function importRecipientsBatch(
  batchId: string,
  items: ImportRecipientInput[]
): Promise<ImportBatchResult> {
  await requireSession();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: items.length,
      error: "Koneksi database belum dikonfigurasi.",
    };
  }

  // 1. Verify batch exists
  const batch = await db.query.batches.findFirst({
    where: eq(batches.id, batchId),
  });

  if (!batch) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: items.length,
      error: "Batch tidak ditemukan.",
    };
  }

  // 2. Check current recipient count in batch
  const [currentCountRow] = await db
    .select({ total: count() })
    .from(recipients)
    .where(eq(recipients.batchId, batchId));

  const currentCount = currentCountRow?.total || 0;
  const remainingSlots = MAX_RECIPIENTS_PER_BATCH - currentCount;

  if (remainingSlots <= 0) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: items.length,
      error: `Batch ini sudah mencapai batas maksimal ${MAX_RECIPIENTS_PER_BATCH} penerima.`,
    };
  }

  // 3. Filter and validate items server-side with Zod
  const validItems: { name: string; email: string }[] = [];
  const seenEmailsInPayload = new Set<string>();

  for (const item of items) {
    const parse = singleImportRecipientSchema.safeParse(item);
    if (parse.success) {
      const email = parse.data.email.trim().toLowerCase();
      if (!seenEmailsInPayload.has(email)) {
        seenEmailsInPayload.add(email);
        validItems.push({
          name: parse.data.name.trim(),
          email,
        });
      }
    }
  }

  if (validItems.length === 0) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: items.length,
      error: "Tidak ada baris penerima yang valid untuk disimpan.",
    };
  }

  // 4. Enforce quota: cannot exceed remaining slots
  const itemsToInsert = validItems.slice(0, remainingSlots);

  // 5. Insert using onConflictDoNothing to prevent duplicates
  try {
    const inserted = await db
      .insert(recipients)
      .values(
        itemsToInsert.map((item) => ({
          batchId,
          name: item.name,
          email: item.email,
          status: "pending" as const,
        }))
      )
      .onConflictDoNothing({
        target: [recipients.batchId, recipients.email],
      })
      .returning({ id: recipients.id });

    const insertedCount = inserted.length;
    const skippedCount = items.length - insertedCount;

    revalidatePath(`/app/batches/${batchId}`);
    revalidatePath("/app");

    return {
      success: true,
      insertedCount,
      skippedCount,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[importRecipientsBatch Error]:", error);
    return {
      success: false,
      insertedCount: 0,
      skippedCount: items.length,
      error: error.message || "Gagal menyimpan penerima ke database.",
    };
  }
}
