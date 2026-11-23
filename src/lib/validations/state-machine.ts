import type { RecipientStatus } from "@/lib/db/schema";

/**
 * Valid recipient state transitions:
 * - pending -> sending (start sending)
 * - failed  -> sending (retry failed only)
 * - sending -> sent    (successfully delivered)
 * - sending -> failed  (provider error)
 * - sending -> unknown (timeout / uncertain outcome)
 *
 * Direct transition from 'sent' to any state is STRICTLY forbidden (anti-duplicate).
 * Direct transition from 'unknown' to 'sending' is not automatic (manual admin resolution only).
 */
export function isValidStateTransition(from: RecipientStatus, to: RecipientStatus): boolean {
  if (from === "pending" && to === "sending") return true;
  if (from === "failed" && to === "sending") return true;
  if (from === "sending" && (to === "sent" || to === "failed" || to === "unknown")) {
    return true;
  }
  return false;
}

/**
 * Checks if a recipient can be queued or retried for sending.
 * Only 'pending' and 'failed' states are eligible for transmission.
 */
export function isEligibleForSending(status: RecipientStatus): boolean {
  return status === "pending" || status === "failed";
}
