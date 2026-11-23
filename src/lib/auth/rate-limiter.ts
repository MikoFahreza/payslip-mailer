interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * In-memory sliding rate limiter for login attempts per identifier (e.g. IP or email).
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes default
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    return {
      allowed: true,
      remaining: maxAttempts,
      resetAt: now + windowMs,
    };
  }

  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: maxAttempts - existing.count,
    resetAt: existing.resetAt,
  };
}

export function recordFailedAttempt(key: string, windowMs: number = 15 * 60 * 1000): void {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
  } else {
    existing.count += 1;
  }
}

export function resetAttempts(key: string): void {
  memoryStore.delete(key);
}

export function clearAllRateLimits(): void {
  memoryStore.clear();
}
