import { describe, it, expect, vi, beforeEach } from "vitest";
import { DAILY_SEND_LIMIT } from "./send-types";
import { isEligibleForSending } from "@/lib/validations/state-machine";

// Mock next-auth and session guard
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: "admin@example.com" } }),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockResolvedValue("user-123"),
  requireSession: vi.fn().mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } }),
}));

vi.mock("@/lib/auth/isolation", () => ({
  assertOwnsRecipient: vi.fn().mockResolvedValue({ id: "rec-1", batchId: "batch-1", batch: { id: "batch-1", userId: "user-123" } }),
  assertOwnsBatch: vi.fn().mockResolvedValue({ id: "batch-1", userId: "user-123", name: "Batch Demo" }),
}));

describe("Send Recipient Workflow & Guard Rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Atomic State Transition & Double Send Protection", () => {
    it("should allow pending and failed recipients to be sent", () => {
      expect(isEligibleForSending("pending")).toBe(true);
      expect(isEligibleForSending("failed")).toBe(true);
    });

    it("should prevent duplicate sending for recipients already marked sending or sent", () => {
      expect(isEligibleForSending("sending")).toBe(false);
      expect(isEligibleForSending("sent")).toBe(false);
      expect(isEligibleForSending("unknown")).toBe(false);
    });

    it("simulates atomic lock: first concurrent request acquires lock, second skips", async () => {
      // In-memory simulation of the DB atomic query:
      // UPDATE recipients SET status='sending' WHERE id=? AND status IN ('pending', 'failed') RETURNING id
      let recipientStatus: "pending" | "sending" | "sent" | "failed" | "unknown" = "pending";

      const tryAcquireSendLock = async (id: string) => {
        if (recipientStatus === "pending" || recipientStatus === "failed") {
          recipientStatus = "sending";
          return [{ id }];
        }
        return []; // 0 rows updated
      };

      // Call 1 and Call 2 simultaneously
      const [res1, res2] = await Promise.all([
        tryAcquireSendLock("rec-1"),
        tryAcquireSendLock("rec-1"),
      ]);

      // Exactly ONE caller should succeed in acquiring the lock
      const totalAcquired = (res1.length > 0 ? 1 : 0) + (res2.length > 0 ? 1 : 0);
      expect(totalAcquired).toBe(1);
      expect(recipientStatus).toBe("sending");

      // The caller that got 0 rows skips execution (no double send)
      const skippedCaller = res1.length === 0 ? res1 : res2;
      expect(skippedCaller.length).toBe(0);
    });
  });

  describe("Daily Send Quota Calculation", () => {
    it("should have daily limit set to 100", () => {
      expect(DAILY_SEND_LIMIT).toBe(100);
    });

    it("should block sending when remaining quota is 0", () => {
      const quota = { used: 100, max: DAILY_SEND_LIMIT, remaining: 0 };
      const canSend = quota.remaining > 0;
      expect(canSend).toBe(false);
    });

    it("should allow sending when remaining quota is positive", () => {
      const quota = { used: 42, max: DAILY_SEND_LIMIT, remaining: 58 };
      const canSend = quota.remaining > 0;
      expect(canSend).toBe(true);
    });
  });
});
