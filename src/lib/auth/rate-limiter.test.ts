import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
  clearAllRateLimits,
} from "./rate-limiter";

describe("Login Rate Limiter", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("should allow attempts when under limit", () => {
    const key = "test-user@example.com";
    expect(checkRateLimit(key, 3, 10000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 10000).remaining).toBe(3);
  });

  it("should block attempts when limit is reached", () => {
    const key = "test-user@example.com";
    recordFailedAttempt(key, 10000);
    recordFailedAttempt(key, 10000);
    recordFailedAttempt(key, 10000);

    const check = checkRateLimit(key, 3, 10000);
    expect(check.allowed).toBe(false);
    expect(check.remaining).toBe(0);
  });

  it("should reset attempts after successful reset", () => {
    const key = "test-user@example.com";
    recordFailedAttempt(key, 10000);
    recordFailedAttempt(key, 10000);
    recordFailedAttempt(key, 10000);

    resetAttempts(key);
    const check = checkRateLimit(key, 3, 10000);
    expect(check.allowed).toBe(true);
    expect(check.remaining).toBe(3);
  });
});
