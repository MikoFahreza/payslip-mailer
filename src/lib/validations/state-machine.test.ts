import { describe, it, expect } from "vitest";
import { isValidStateTransition, isEligibleForSending } from "./state-machine";
import type { RecipientStatus } from "@/lib/db/schema";

describe("Recipient Status State Machine", () => {
  describe("isEligibleForSending", () => {
    it("should allow 'pending' recipients to be sent", () => {
      expect(isEligibleForSending("pending")).toBe(true);
    });

    it("should allow 'failed' recipients to be retried", () => {
      expect(isEligibleForSending("failed")).toBe(true);
    });

    it("should NOT allow 'sent' recipients to be sent again (duplicate protection)", () => {
      expect(isEligibleForSending("sent")).toBe(false);
    });

    it("should NOT allow 'sending' recipients to be sent again (concurrency protection)", () => {
      expect(isEligibleForSending("sending")).toBe(false);
    });

    it("should NOT automatically allow 'unknown' recipients to be re-sent without admin check", () => {
      expect(isEligibleForSending("unknown")).toBe(false);
    });
  });

  describe("isValidStateTransition", () => {
    it("should allow initial transition from pending to sending", () => {
      expect(isValidStateTransition("pending", "sending")).toBe(true);
    });

    it("should allow retry transition from failed to sending", () => {
      expect(isValidStateTransition("failed", "sending")).toBe(true);
    });

    it("should allow sending to reach sent, failed, or unknown", () => {
      expect(isValidStateTransition("sending", "sent")).toBe(true);
      expect(isValidStateTransition("sending", "failed")).toBe(true);
      expect(isValidStateTransition("sending", "unknown")).toBe(true);
    });

    it("should FORBID transitioning from sent to sending or any other state", () => {
      const allStatuses: RecipientStatus[] = ["pending", "sending", "sent", "failed", "unknown"];
      for (const target of allStatuses) {
        expect(isValidStateTransition("sent", target)).toBe(false);
      }
    });

    it("should forbid jumping directly from pending to sent", () => {
      expect(isValidStateTransition("pending", "sent")).toBe(false);
    });

    it("should forbid unknown from transitioning automatically to sending", () => {
      expect(isValidStateTransition("unknown", "sending")).toBe(false);
    });
  });
});
