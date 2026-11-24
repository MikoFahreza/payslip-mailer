import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertOwnsBatch,
  assertOwnsRecipient,
  assertOwnsContact,
  ForbiddenError,
  NotFoundError,
} from "./isolation";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      batches: {
        findFirst: vi.fn(),
      },
      recipients: {
        findFirst: vi.fn(),
      },
      contacts: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe("Isolation Helpers", () => {
  const currentUserId = "user-123";
  const otherUserId = "user-999";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assertOwnsBatch", () => {
    it("should return batch when userId matches", async () => {
      const mockBatch = { id: "batch-1", userId: currentUserId, name: "Batch Des 2026" };
      vi.mocked(db.query.batches.findFirst).mockResolvedValue(mockBatch as never);

      const result = await assertOwnsBatch("batch-1", currentUserId);
      expect(result).toEqual(mockBatch);
    });

    it("should throw NotFoundError if batch does not exist", async () => {
      vi.mocked(db.query.batches.findFirst).mockResolvedValue(null as never);

      await expect(assertOwnsBatch("batch-999", currentUserId)).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if batch belongs to another user", async () => {
      const mockBatch = { id: "batch-2", userId: otherUserId, name: "Private Batch" };
      vi.mocked(db.query.batches.findFirst).mockResolvedValue(mockBatch as never);

      await expect(assertOwnsBatch("batch-2", currentUserId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("assertOwnsRecipient", () => {
    it("should return recipient when parent batch belongs to userId", async () => {
      const mockRecipient = {
        id: "rec-1",
        batchId: "batch-1",
        batch: { id: "batch-1", userId: currentUserId },
      };
      vi.mocked(db.query.recipients.findFirst).mockResolvedValue(mockRecipient as never);

      const result = await assertOwnsRecipient("rec-1", currentUserId);
      expect(result).toEqual(mockRecipient);
    });

    it("should throw NotFoundError if recipient does not exist", async () => {
      vi.mocked(db.query.recipients.findFirst).mockResolvedValue(null as never);

      await expect(assertOwnsRecipient("rec-999", currentUserId)).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if parent batch belongs to another user", async () => {
      const mockRecipient = {
        id: "rec-2",
        batchId: "batch-2",
        batch: { id: "batch-2", userId: otherUserId },
      };
      vi.mocked(db.query.recipients.findFirst).mockResolvedValue(mockRecipient as never);

      await expect(assertOwnsRecipient("rec-2", currentUserId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("assertOwnsContact", () => {
    it("should return contact when contact belongs to userId", async () => {
      const mockContact = {
        id: "contact-1",
        userId: currentUserId,
        name: "Budi",
        email: "budi@example.com",
      };
      vi.mocked(db.query.contacts.findFirst).mockResolvedValue(mockContact as never);

      const result = await assertOwnsContact("contact-1", currentUserId);
      expect(result).toEqual(mockContact);
    });

    it("should throw NotFoundError if contact does not exist", async () => {
      vi.mocked(db.query.contacts.findFirst).mockResolvedValue(null as never);

      await expect(assertOwnsContact("contact-999", currentUserId)).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if contact belongs to another user", async () => {
      const mockContact = {
        id: "contact-2",
        userId: otherUserId,
        name: "Foreign",
        email: "foreign@example.com",
      };
      vi.mocked(db.query.contacts.findFirst).mockResolvedValue(mockContact as never);

      await expect(assertOwnsContact("contact-2", currentUserId)).rejects.toThrow(ForbiddenError);
    });
  });
});
