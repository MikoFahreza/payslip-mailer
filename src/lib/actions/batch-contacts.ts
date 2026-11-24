"use server";

import { db } from "@/lib/db";
import { batches, recipients, contacts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { assertOwnsBatch } from "@/lib/auth/isolation";
import { MAX_RECIPIENTS_PER_BATCH } from "@/lib/validations/recipient";
import { eq, and, count, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface AddFromContactsResult {
  success: boolean;
  addedCount: number;
  skippedExistingCount: number;
  notFittingCount: number;
  error?: string;
}

export async function addRecipientsFromContacts(
  batchId: string,
  contactIds: string[]
): Promise<AddFromContactsResult> {
  const userId = await requireUser();
  await assertOwnsBatch(batchId, userId);

  if (contactIds.length === 0) {
    return { success: true, addedCount: 0, skippedExistingCount: 0, notFittingCount: 0 };
  }

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      success: false,
      addedCount: 0,
      skippedExistingCount: 0,
      notFittingCount: 0,
      error: "Koneksi database belum siap.",
    };
  }

  try {
    // 1. Check current recipient count in this batch
    const [countRow] = await db
      .select({ total: count() })
      .from(recipients)
      .where(eq(recipients.batchId, batchId));

    const currentCount = countRow?.total || 0;
    const remainingSlots = Math.max(0, MAX_RECIPIENTS_PER_BATCH - currentCount);

    if (remainingSlots <= 0) {
      return {
        success: false,
        addedCount: 0,
        skippedExistingCount: 0,
        notFittingCount: contactIds.length,
        error: `Batch ini sudah mencapai batas maksimal ${MAX_RECIPIENTS_PER_BATCH} penerima.`,
      };
    }

    // 2. Fetch existing recipient emails in this batch
    const existingRecipients = await db
      .select({ email: recipients.email })
      .from(recipients)
      .where(eq(recipients.batchId, batchId));

    const existingEmails = new Set(existingRecipients.map((r) => r.email.toLowerCase()));

    // 3. Fetch selected contacts belonging to this user
    const selectedContacts = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

    // Filter out contacts already in this batch
    const candidates = selectedContacts.filter(
      (c) => !existingEmails.has(c.email.toLowerCase())
    );

    const skippedExistingCount = selectedContacts.length - candidates.length;

    // Enforce 50 limit
    const itemsToInsert = candidates.slice(0, remainingSlots);
    const notFittingCount = candidates.length - itemsToInsert.length;

    if (itemsToInsert.length > 0) {
      await db.insert(recipients).values(
        itemsToInsert.map((c) => ({
          batchId,
          contactId: c.id,
          name: c.name, // Snapshot
          email: c.email.toLowerCase(), // Snapshot
          status: "pending" as const,
        }))
      );
    }

    revalidatePath(`/app/batches/${batchId}`);
    return {
      success: true,
      addedCount: itemsToInsert.length,
      skippedExistingCount,
      notFittingCount,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[addRecipientsFromContacts Error]:", error);
    return {
      success: false,
      addedCount: 0,
      skippedExistingCount: 0,
      notFittingCount: 0,
      error: "Gagal menambahkan penerima dari daftar kontak.",
    };
  }
}

export async function addAllActiveContactsToBatch(
  batchId: string
): Promise<AddFromContactsResult> {
  const userId = await requireUser();
  await assertOwnsBatch(batchId, userId);

  try {
    const activeContacts = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), isNull(contacts.archivedAt)));

    const contactIds = activeContacts.map((c) => c.id);
    return await addRecipientsFromContacts(batchId, contactIds);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[addAllActiveContactsToBatch Error]:", error);
    return {
      success: false,
      addedCount: 0,
      skippedExistingCount: 0,
      notFittingCount: 0,
      error: "Gagal menambahkan semua kontak ke batch.",
    };
  }
}

export async function duplicateBatchAction(
  sourceBatchId: string,
  newBatchName: string
): Promise<{ success: boolean; newBatchId?: string; error?: string }> {
  const userId = await requireUser();
  const sourceBatch = await assertOwnsBatch(sourceBatchId, userId);

  const cleanName = newBatchName.trim() || `${sourceBatch.name} (Salinan)`;

  try {
    // 1. Create new batch
    const [newBatch] = await db
      .insert(batches)
      .values({
        userId,
        name: cleanName,
      })
      .returning();

    // 2. Fetch source recipients
    const sourceRecipients = await db
      .select()
      .from(recipients)
      .where(eq(recipients.batchId, sourceBatchId));

    // 3. Insert recipients into new batch (without files, status reset to pending)
    if (sourceRecipients.length > 0) {
      await db.insert(recipients).values(
        sourceRecipients.map((r) => ({
          batchId: newBatch.id,
          contactId: r.contactId,
          name: r.name,
          email: r.email,
          status: "pending" as const,
          errorMessage: null,
          sentAt: null,
        }))
      );
    }

    revalidatePath("/app");
    return { success: true, newBatchId: newBatch.id };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[duplicateBatchAction Error]:", error);
    return { success: false, error: "Gagal menduplikat batch." };
  }
}
