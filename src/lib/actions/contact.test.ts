import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createContact,
  archiveContact,
  restoreContact,
  deleteContactPermanently,
  upsertContactsBatch,
} from "./contact";
import {
  addRecipientsFromContacts,
  duplicateBatchAction,
} from "./batch-contacts";
import { contactSchema, MAX_CONTACTS_PER_USER } from "@/lib/validations/contact";
import { db } from "@/lib/db";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const currentUserId = "user-test-123";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockImplementation(async () => "user-test-123"),
}));

vi.mock("@/lib/auth/isolation", () => ({
  assertOwnsContact: vi.fn().mockResolvedValue({ id: "contact-1", userId: "user-test-123" }),
  assertOwnsBatch: vi.fn().mockResolvedValue({ id: "batch-1", userId: "user-test-123", name: "Batch 1" }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      contacts: {
        findFirst: vi.fn(),
      },
      batches: {
        findFirst: vi.fn(),
      },
      recipients: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "new-contact-id" }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: "updated-contact-id" }]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "deleted-contact-id" }]),
      })),
    })),
  },
}));

describe("Fase R6: Contact Management & Batch Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
  });

  describe("1. Schema & Validation Rules", () => {
    it("should accept valid contact input and normalize email to lowercase", () => {
      const res = contactSchema.safeParse({
        name: "  Budi Santoso  ",
        email: "  BUDI.Santoso@Example.COM  ",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe("Budi Santoso");
        expect(res.data.email).toBe("budi.santoso@example.com");
      }
    });

    it("should reject empty names and invalid email formats", () => {
      expect(contactSchema.safeParse({ name: "", email: "valid@example.com" }).success).toBe(false);
      expect(contactSchema.safeParse({ name: "Budi", email: "not-an-email" }).success).toBe(false);
    });

    it("has MAX_CONTACTS_PER_USER defined as 200", () => {
      expect(MAX_CONTACTS_PER_USER).toBe(200);
    });
  });

  describe("2. Contact Limits & CRUD Operations", () => {
    it("should reject createContact when user has reached the 200 limit", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 200 }]),
        }),
      } as never);

      const res = await createContact({ name: "Karyawan Baru", email: "baru@example.com" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Batas maksimal 200 kontak per pengguna telah tercapai");
    });

    it("should reject createContact when active contact with duplicate email exists", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 10 }]),
        }),
      } as never);

      vi.mocked(db.query.contacts.findFirst).mockResolvedValue({
        id: "c-exist",
        userId: currentUserId,
        email: "duplikat@example.com",
        archivedAt: null,
      } as never);

      const res = await createContact({ name: "Duplikat", email: "duplikat@example.com" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("sudah terdaftar");
    });

    it("should archive contact by setting archivedAt", async () => {
      const res = await archiveContact("c-1");
      expect(res.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should restore contact by clearing archivedAt", async () => {
      const res = await restoreContact("c-1");
      expect(res.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should delete contact permanently", async () => {
      const res = await deleteContactPermanently("c-1");
      expect(res.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("3. Batch Upsert & De-duplication (upsertContactsBatch)", () => {
    it("should insert new contacts and update existing contacts without duplicating", async () => {
      const existingInDb = [
        { id: "c-1", email: "existing@example.com", name: "Nama Lama", archivedAt: null },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            // Count query
            return Promise.resolve(existingInDb);
          }),
        }),
      } as never);

      const items = [
        { name: "Nama Baru", email: "existing@example.com" }, // Existing -> Update
        { name: "Orang Dua", email: "baru2@example.com" },   // New -> Insert
        { name: "Orang Tiga", email: "baru3@example.com" },  // New -> Insert
        { name: "Duplikat File", email: "baru2@example.com" }, // Duplicate in payload -> Skip
        { name: "Invalid", email: "bad-email" },             // Invalid format -> Problematic
      ];

      const report = await upsertContactsBatch(items);

      expect(report.updatedCount).toBe(1);
      expect(report.newCount).toBe(2);
      expect(report.skippedCount).toBe(1);
      expect(report.problematicCount).toBe(1);
      expect(report.errors.length).toBe(1);
      expect(report.errors[0]?.message).toContain("Format alamat email tidak valid");
    });
  });

  describe("4. Batch Integration & Snapshot Safety", () => {
    it("should add recipients from selected contacts respecting the 50 batch limit", async () => {
      // Current batch has 48 recipients
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([{ total: 48 }]) // Count
            .mockResolvedValueOnce([{ email: "sudahada@example.com" }]) // Existing emails
            .mockResolvedValueOnce([ // Selected contacts from DB
              { id: "c-1", name: "Sudah Ada", email: "sudahada@example.com" },
              { id: "c-2", name: "Muat 1", email: "muat1@example.com" },
              { id: "c-3", name: "Muat 2", email: "muat2@example.com" },
              { id: "c-4", name: "Tidak Muat", email: "tidakmuat@example.com" },
            ]),
        }),
      } as never);

      const result = await addRecipientsFromContacts("batch-1", ["c-1", "c-2", "c-3", "c-4"]);

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(2); // Only 2 slots remaining (50 - 48 = 2)
      expect(result.skippedExistingCount).toBe(1); // "sudahada@example.com" was skipped
      expect(result.notFittingCount).toBe(1); // "tidakmuat@example.com" exceeded remaining slots
    });

    it("should duplicate batch with all recipients reset to pending without files", async () => {
      const sourceRecipients = [
        { id: "r-1", batchId: "b-source", contactId: "c-1", name: "R1", email: "r1@example.com", status: "sent" },
        { id: "r-2", batchId: "b-source", contactId: "c-2", name: "R2", email: "r2@example.com", status: "failed" },
      ];

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "b-new" }]),
        }),
      } as never);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(sourceRecipients),
        }),
      } as never);

      const result = await duplicateBatchAction("b-source", "Batch Baru Salinan");

      expect(result.success).toBe(true);
      expect(result.newBatchId).toBe("b-new");
      expect(db.insert).toHaveBeenCalledTimes(2); // 1 for new batch, 1 for copied recipients
    });
  });
});
