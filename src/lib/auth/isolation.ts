import { db } from "@/lib/db";
import { batches, recipients, contacts, attachments, sendLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class ForbiddenError extends Error {
  constructor(message = "Akses ditolak: Anda tidak memiliki akses ke sumber daya ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Data tidak ditemukan.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Asserts that the specified batch exists and belongs to the given user.
 * Throws NotFoundError if not found, or ForbiddenError if not owned by the user.
 */
export async function assertOwnsBatch(batchId: string, userId: string) {
  if (!batchId || !userId) {
    throw new ForbiddenError("Parameter batchId atau userId tidak valid.");
  }

  const batch = await db.query.batches.findFirst({
    where: eq(batches.id, batchId),
  });

  if (!batch) {
    throw new NotFoundError("Batch tidak ditemukan.");
  }

  if (batch.userId !== userId) {
    throw new ForbiddenError("Akses ditolak: Anda tidak memiliki akses ke batch ini.");
  }

  return batch;
}

/**
 * Asserts that the specified recipient exists and belongs to a batch owned by the given user.
 * Throws NotFoundError if not found, or ForbiddenError if not owned by the user.
 */
export async function assertOwnsRecipient(recipientId: string, userId: string) {
  if (!recipientId || !userId) {
    throw new ForbiddenError("Parameter recipientId atau userId tidak valid.");
  }

  const recipient = await db.query.recipients.findFirst({
    where: eq(recipients.id, recipientId),
    with: {
      batch: true,
    },
  });

  if (!recipient) {
    throw new NotFoundError("Penerima tidak ditemukan.");
  }

  if (!recipient.batch || recipient.batch.userId !== userId) {
    throw new ForbiddenError("Akses ditolak: Anda tidak memiliki akses ke penerima ini.");
  }

  return recipient;
}

/**
 * Asserts that the specified contact exists and belongs to the given user.
 * Throws NotFoundError if not found, or ForbiddenError if not owned by the user.
 */
export async function assertOwnsContact(contactId: string, userId: string) {
  if (!contactId || !userId) {
    throw new ForbiddenError("Parameter contactId atau userId tidak valid.");
  }

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    throw new NotFoundError("Kontak tidak ditemukan.");
  }

  if (contact.userId !== userId) {
    throw new ForbiddenError("Akses ditolak: Anda tidak memiliki akses ke kontak ini.");
  }

  return contact;
}

/**
 * Asserts that the specified attachment exists and belongs to a recipient and batch owned by the given user.
 * Throws NotFoundError if not found, or ForbiddenError if not owned by the user.
 */
export async function assertOwnsAttachment(attachmentId: string, userId: string) {
  if (!attachmentId || !userId) {
    throw new ForbiddenError("Parameter attachmentId atau userId tidak valid.");
  }

  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
    with: {
      recipient: {
        with: {
          batch: true,
        },
      },
    },
  });

  if (!attachment) {
    throw new NotFoundError("Lampiran tidak ditemukan.");
  }

  if (!attachment.recipient?.batch || attachment.recipient.batch.userId !== userId) {
    throw new ForbiddenError("Akses ditolak: Anda tidak memiliki akses ke lampiran ini.");
  }

  return attachment;
}

/**
 * Asserts that the specified sendLog exists and belongs to the given user.
 * Throws NotFoundError if not found, or ForbiddenError if not owned by the user.
 */
export async function assertOwnsSendLog(sendLogId: string, userId: string) {
  if (!sendLogId || !userId) {
    throw new ForbiddenError("Parameter sendLogId atau userId tidak valid.");
  }

  const log = await db.query.sendLogs.findFirst({
    where: eq(sendLogs.id, sendLogId),
  });

  if (!log) {
    throw new NotFoundError("Log pengiriman tidak ditemukan.");
  }

  if (log.userId !== userId) {
    throw new ForbiddenError("Akses ditolak: Anda tidak memiliki akses ke log pengiriman ini.");
  }

  return log;
}

/**
 * Asserts that a blob pathname belongs to the specified user (must start with `${userId}/`).
 * Throws ForbiddenError if the pathname targets another user's namespace.
 */
export function assertOwnsBlobPathname(pathname: string, userId: string): void {
  if (!pathname || !userId) {
    throw new ForbiddenError("Parameter pathname atau userId tidak valid.");
  }

  const normalized = pathname.replace(/^\/+/, "");
  if (!normalized.startsWith(`${userId}/`)) {
    throw new ForbiddenError("Akses ditolak: Pathname Blob harus berada di dalam direktori ID pengguna Anda.");
  }
}
