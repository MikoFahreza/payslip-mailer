"use server";

import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { assertOwnsContact } from "@/lib/auth/isolation";
import {
  contactSchema,
  MAX_CONTACTS_PER_USER,
  type ContactInput,
  type ContactUpsertReport,
} from "@/lib/validations/contact";
import { eq, and, ne, isNull, isNotNull, count, desc, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getContacts(options?: {
  includeArchived?: boolean;
  search?: string;
}) {
  const userId = await requireUser();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return [];
  }

  try {
    const conditions = [eq(contacts.userId, userId)];

    if (!options?.includeArchived) {
      conditions.push(isNull(contacts.archivedAt));
    }

    if (options?.search?.trim()) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      conditions.push(or(ilike(contacts.name, q), ilike(contacts.email, q))!);
    }

    const list = await db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.updatedAt));

    return list;
  } catch (err: unknown) {
    console.warn("[getContacts Warning]:", err);
    return [];
  }
}

export async function getContactCounts(): Promise<{
  active: number;
  archived: number;
  total: number;
  max: number;
}> {
  const userId = await requireUser();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { active: 0, archived: 0, total: 0, max: MAX_CONTACTS_PER_USER };
  }

  try {
    const [activeRow] = await db
      .select({ count: count() })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), isNull(contacts.archivedAt)));

    const [archivedRow] = await db
      .select({ count: count() })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), isNotNull(contacts.archivedAt)));

    const active = activeRow?.count || 0;
    const archived = archivedRow?.count || 0;

    return {
      active,
      archived,
      total: active + archived,
      max: MAX_CONTACTS_PER_USER,
    };
  } catch (err: unknown) {
    console.warn("[getContactCounts Warning]:", err);
    return { active: 0, archived: 0, total: 0, max: MAX_CONTACTS_PER_USER };
  }
}

export async function createContact(input: ContactInput) {
  const userId = await requireUser();

  const parse = contactSchema.safeParse(input);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.issues[0]?.message || "Data kontak tidak valid.",
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { success: false, error: "Database belum siap." };
  }

  try {
    // 1. Enforce max 200 contacts per user
    const [countRow] = await db
      .select({ total: count() })
      .from(contacts)
      .where(eq(contacts.userId, userId));

    if ((countRow?.total || 0) >= MAX_CONTACTS_PER_USER) {
      return {
        success: false,
        error: `Batas maksimal ${MAX_CONTACTS_PER_USER} kontak per pengguna telah tercapai.`,
      };
    }

    // 2. Check duplicate email for this user
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.userId, userId), eq(contacts.email, parse.data.email)),
    });

    if (existing) {
      if (existing.archivedAt) {
        // If archived, restore and update name
        const [restored] = await db
          .update(contacts)
          .set({
            name: parse.data.name,
            archivedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, existing.id))
          .returning();

        revalidatePath("/app/contacts");
        return { success: true, data: restored, restored: true };
      }

      return {
        success: false,
        error: "Kontak dengan alamat email ini sudah terdaftar.",
      };
    }

    // 3. Insert new contact
    const [newContact] = await db
      .insert(contacts)
      .values({
        userId,
        name: parse.data.name,
        email: parse.data.email,
      })
      .returning();

    revalidatePath("/app/contacts");
    return { success: true, data: newContact };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[createContact Error]:", error);
    return { success: false, error: "Gagal menyimpan kontak baru." };
  }
}

export async function updateContact(id: string, input: ContactInput) {
  const userId = await requireUser();
  await assertOwnsContact(id, userId);

  const parse = contactSchema.safeParse(input);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.issues[0]?.message || "Data kontak tidak valid.",
    };
  }

  try {
    // Check duplicate email on other contacts
    const duplicate = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, userId),
        eq(contacts.email, parse.data.email),
        ne(contacts.id, id)
      ),
    });

    if (duplicate) {
      return {
        success: false,
        error: "Alamat email sudah digunakan oleh kontak lain.",
      };
    }

    const [updated] = await db
      .update(contacts)
      .set({
        name: parse.data.name,
        email: parse.data.email,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();

    revalidatePath("/app/contacts");
    return { success: true, data: updated };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[updateContact Error]:", error);
    return { success: false, error: "Gagal memperbarui kontak." };
  }
}

export async function archiveContact(id: string) {
  const userId = await requireUser();
  await assertOwnsContact(id, userId);

  try {
    const [updated] = await db
      .update(contacts)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();

    revalidatePath("/app/contacts");
    return { success: true, data: updated };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[archiveContact Error]:", error);
    return { success: false, error: "Gagal mengarsipkan kontak." };
  }
}

export async function restoreContact(id: string) {
  const userId = await requireUser();
  await assertOwnsContact(id, userId);

  try {
    const [updated] = await db
      .update(contacts)
      .set({
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();

    revalidatePath("/app/contacts");
    return { success: true, data: updated };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[restoreContact Error]:", error);
    return { success: false, error: "Gagal memulihkan kontak." };
  }
}

export async function deleteContactPermanently(id: string) {
  const userId = await requireUser();
  await assertOwnsContact(id, userId);

  try {
    // Delete contact. Note: recipients.contactId has onDelete: "set null", so batch history is preserved!
    await db.delete(contacts).where(eq(contacts.id, id));

    revalidatePath("/app/contacts");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteContactPermanently Error]:", error);
    return { success: false, error: "Gagal menghapus kontak secara permanen." };
  }
}

export async function upsertContactsBatch(
  items: { name: string; email: string }[]
): Promise<ContactUpsertReport> {
  const userId = await requireUser();

  const report: ContactUpsertReport = {
    newCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    problematicCount: 0,
    errors: [],
  };

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return report;
  }

  // 1. Get current count
  const [countRow] = await db
    .select({ total: count() })
    .from(contacts)
    .where(eq(contacts.userId, userId));

  let currentTotal = countRow?.total || 0;

  // 2. Fetch all existing contacts of this user into a Map for fast lookup
  const existingList = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, userId));

  const existingMap = new Map<string, (typeof existingList)[0]>();
  for (const c of existingList) {
    existingMap.set(c.email.toLowerCase(), c);
  }

  // De-duplicate within the imported payload itself
  const seenInPayload = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const rowNumber = i + 1;
    const raw = items[i];

    const parse = contactSchema.safeParse(raw);
    if (!parse.success) {
      report.problematicCount++;
      report.errors.push({
        row: rowNumber,
        name: raw.name || "-",
        email: raw.email || "-",
        message: parse.error.issues[0]?.message || "Format data tidak valid.",
      });
      continue;
    }

    const email = parse.data.email;
    const name = parse.data.name;

    if (seenInPayload.has(email)) {
      // Duplicate in payload: skip
      report.skippedCount++;
      continue;
    }
    seenInPayload.add(email);

    const existing = existingMap.get(email);

    if (existing) {
      // UPDATE: Update name and unarchive if it was archived
      try {
        await db
          .update(contacts)
          .set({
            name,
            archivedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, existing.id));

        report.updatedCount++;
      } catch (err: unknown) {
        report.problematicCount++;
        report.errors.push({
          row: rowNumber,
          name,
          email,
          message: (err as Error).message,
        });
      }
    } else {
      // INSERT: Check 200 limit first
      if (currentTotal >= MAX_CONTACTS_PER_USER) {
        report.skippedCount++;
        report.errors.push({
          row: rowNumber,
          name,
          email,
          message: `Dilewati: Batas maksimal ${MAX_CONTACTS_PER_USER} kontak per pengguna telah tercapai.`,
        });
        continue;
      }

      try {
        const [inserted] = await db
          .insert(contacts)
          .values({
            userId,
            name,
            email,
          })
          .returning();

        currentTotal++;
        existingMap.set(email, inserted);
        report.newCount++;
      } catch (err: unknown) {
        report.problematicCount++;
        report.errors.push({
          row: rowNumber,
          name,
          email,
          message: (err as Error).message,
        });
      }
    }
  }

  revalidatePath("/app/contacts");
  return report;
}
