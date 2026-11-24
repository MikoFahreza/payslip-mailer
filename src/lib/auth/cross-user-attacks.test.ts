import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBatchById, updateBatchName, deleteBatch } from "@/lib/actions/batch";
import { addRecipient, updateRecipient, deleteRecipient } from "@/lib/actions/recipient";
import {
  saveAttachment,
  deleteAttachment,
  getAttachmentsByRecipient,
} from "@/lib/actions/attachment";
import { sendRecipient, resolveUnknownStatus } from "@/lib/actions/send";
import {
  assertOwnsBatch,
  assertOwnsRecipient,
  assertOwnsContact,
  assertOwnsAttachment,
  assertOwnsSendLog,
  assertOwnsBlobPathname,
  ForbiddenError,
} from "@/lib/auth/isolation";
import { db } from "@/lib/db";

// Mock user session as User A
const userAId = "user-A";
const userBId = "user-B";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockImplementation(async () => userAId),
}));

// Entities belonging to User B (the victim)
const mockBatchB = {
  id: "batch-B",
  userId: userBId,
  name: "Batch Milik User B",
  createdAt: new Date(),
};

const mockBatchA = {
  id: "batch-A",
  userId: userAId,
  name: "Batch Milik User A",
  createdAt: new Date(),
};

const mockRecipientB = {
  id: "rec-B",
  batchId: "batch-B",
  name: "Karyawan B",
  email: "karyawanB@example.com",
  status: "pending",
  batch: mockBatchB,
};

const mockAttachmentB = {
  id: "att-B",
  recipientId: "rec-B",
  filename: "slip-gaji-B.pdf",
  blobUrl: "https://blob.vercel.com/user-B/slip-gaji-B.pdf",
  blobPathname: "user-B/slip-gaji-B.pdf",
  contentType: "application/pdf",
  sizeBytes: 1024,
  recipient: mockRecipientB,
};

const mockContactB = {
  id: "contact-B",
  userId: userBId,
  name: "Kontak Milik User B",
  email: "kontakB@example.com",
};

const mockSendLogB = {
  id: "log-B",
  userId: userBId,
  recipientId: "rec-B",
  event: "sent",
};

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      batches: { findFirst: vi.fn() },
      recipients: { findFirst: vi.fn() },
      contacts: { findFirst: vi.fn() },
      attachments: { findFirst: vi.fn() },
      sendLogs: { findFirst: vi.fn() },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "new-id" }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: "updated-id" }]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "deleted-id" }]),
      })),
    })),
  },
}));

describe("Fase R5: Cross-User Attack Prevention (User A attempts to access User B data)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";

    // Default mocks return User B's resources to test rejection
    vi.mocked(db.query.batches.findFirst).mockResolvedValue(mockBatchB as never);
    vi.mocked(db.query.recipients.findFirst).mockResolvedValue(mockRecipientB as never);
    vi.mocked(db.query.contacts.findFirst).mockResolvedValue(mockContactB as never);
    vi.mocked(db.query.attachments.findFirst).mockResolvedValue(mockAttachmentB as never);
    vi.mocked(db.query.sendLogs.findFirst).mockResolvedValue(mockSendLogB as never);
  });

  describe("1. Batches Entity", () => {
    it("User A cannot read User B's batch", async () => {
      // Direct helper
      await expect(assertOwnsBatch("batch-B", userAId)).rejects.toThrow(ForbiddenError);

      // Server action getBatchById returns null when owned by another user
      const batch = await getBatchById("batch-B");
      expect(batch).toBeNull();
    });

    it("User A cannot update User B's batch name", async () => {
      await expect(updateBatchName("batch-B", "Nama Diubah Hacker")).rejects.toThrow(ForbiddenError);
    });

    it("User A cannot delete User B's batch", async () => {
      await expect(deleteBatch("batch-B")).rejects.toThrow(ForbiddenError);
    });
  });

  describe("2. Recipients Entity", () => {
    it("User A cannot add a recipient to User B's batch", async () => {
      await expect(
        addRecipient("batch-B", { name: "Penyusup", email: "penyusup@example.com" })
      ).rejects.toThrow(ForbiddenError);
    });

    it("User A cannot update a recipient belonging to User B", async () => {
      await expect(assertOwnsRecipient("rec-B", userAId)).rejects.toThrow(ForbiddenError);
      await expect(
        updateRecipient("rec-B", "batch-B", { name: "Ganti Nama", email: "ganti@example.com" })
      ).rejects.toThrow(ForbiddenError);
    });

    it("User A cannot delete a recipient belonging to User B", async () => {
      await expect(deleteRecipient("rec-B", "batch-B")).rejects.toThrow(ForbiddenError);
    });
  });

  describe("3. Attachments Entity", () => {
    it("User A cannot read attachments of User B's recipient", async () => {
      await expect(getAttachmentsByRecipient("rec-B")).rejects.toThrow(ForbiddenError);
    });

    it("User A cannot save an attachment to User B's recipient", async () => {
      await expect(
        saveAttachment("batch-B", "rec-B", {
          filename: "slip.pdf",
          contentType: "application/pdf",
          sizeBytes: 1024,
          blobUrl: "https://blob.vercel.com/user-A/slip.pdf",
          blobPathname: "user-A/slip.pdf",
          kind: "payslip",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("User A cannot save an attachment pointing to User B's blob pathname", async () => {
      // User owns the batch & recipient, but tries to inject User B's blob pathname
      vi.mocked(db.query.batches.findFirst).mockResolvedValue(mockBatchA as never);
      vi.mocked(db.query.recipients.findFirst).mockResolvedValue({
        id: "rec-A",
        batchId: "batch-A",
        batch: mockBatchA,
      } as never);

      await expect(
        saveAttachment("batch-A", "rec-A", {
          filename: "slip.pdf",
          contentType: "application/pdf",
          sizeBytes: 1024,
          blobUrl: "https://blob.vercel.com/user-B/secret.pdf",
          blobPathname: "user-B/secret.pdf",
          kind: "payslip",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("User A cannot delete User B's attachment", async () => {
      await expect(assertOwnsAttachment("att-B", userAId)).rejects.toThrow(ForbiddenError);
      await expect(deleteAttachment("att-B", "rec-B", "batch-B")).rejects.toThrow(ForbiddenError);
    });
  });

  describe("4. Contacts Entity", () => {
    it("User A cannot access User B's contact", async () => {
      await expect(assertOwnsContact("contact-B", userAId)).rejects.toThrow(ForbiddenError);
    });

    it("User A cannot link User B's contact to their own recipient", async () => {
      // User owns batch A, but contact B belongs to User B
      vi.mocked(db.query.batches.findFirst).mockResolvedValue(mockBatchA as never);
      vi.mocked(db.query.contacts.findFirst).mockResolvedValue(mockContactB as never);

      await expect(
        addRecipient("batch-A", {
          name: "Karyawan A",
          email: "karyawanA@example.com",
          contactId: "contact-B",
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("5. Blob Storage Pathname Isolation", () => {
    it("User A cannot generate token for Blob pathname under User B's namespace", () => {
      expect(() => assertOwnsBlobPathname("user-B/slip.pdf", userAId)).toThrow(ForbiddenError);
      expect(() => assertOwnsBlobPathname("/user-B/slip.pdf", userAId)).toThrow(ForbiddenError);
    });

    it("User A can only access Blob pathnames with their own user ID prefix", () => {
      expect(() => assertOwnsBlobPathname("user-A/slip.pdf", userAId)).not.toThrow();
      expect(() => assertOwnsBlobPathname("/user-A/nested/folder/slip.pdf", userAId)).not.toThrow();
    });
  });

  describe("6. Email Sending & Unknown Status Resolution", () => {
    it("User A cannot trigger email send for User B's recipient", async () => {
      await expect(sendRecipient("rec-B")).rejects.toThrow(ForbiddenError);
    });

    it("User A cannot resolve unknown status for User B's recipient", async () => {
      await expect(resolveUnknownStatus("rec-B", "sent")).rejects.toThrow(ForbiddenError);
    });
  });

  describe("7. Send Logs Entity", () => {
    it("User A cannot access User B's send log", async () => {
      await expect(assertOwnsSendLog("log-B", userAId)).rejects.toThrow(ForbiddenError);
    });
  });
});
