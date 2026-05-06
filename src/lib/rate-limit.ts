/**
 * NigWrite - In-Memory Rate Limiter
 * Simple sliding-window rate limiter for API routes.
 * Created by: Wabi The Tech Nurse
 */

type LimitConfig = {
  maxRequests: number;
  windowMs: number;
};

const LIMITS: Record<string, LimitConfig> = {
  scan: { maxRequests: 10, windowMs: 60_000 },
  correct: { maxRequests: 5, windowMs: 60_000 },
  "ai-detect": { maxRequests: 15, windowMs: 60_000 },
  upload: { maxRequests: 100, windowMs: 60_000 },
  documents: { maxRequests: 20, windowMs: 60_000 },
  default: { maxRequests: 30, windowMs: 60_000 },
};

/** Timestamps per (IP, limitName) */
const requestStore = new Map<string, number[]>();

/** Periodic cleanup to prevent unbounded memory growth */
const CLEANUP_INTERVAL_MS = 120_000; // every 2 minutes

let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, timestamps] of requestStore.entries()) {
    // Keep only the longest window worth of data; drop stale entries
    const maxWindow = Math.max(
      ...Object.values(LIMITS).map((l) => l.windowMs)
    );
    const filtered = timestamps.filter((t) => now - t < maxWindow);
    if (filtered.length === 0) {
      requestStore.delete(key);
    } else {
      requestStore.set(key, filtered);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
}

/**
 * Check whether a request from the given IP should be allowed.
 *
 * @param ip      - Client IP address
 * @param limitName - One of the keys in LIMITS (e.g. "scan", "correct")
 * @returns RateLimitResult with allowed flag and optional retryAfter seconds
 */
export function rateLimit(ip: string, limitName: string): RateLimitResult {
  cleanup();

  const config = LIMITS[limitName] ?? LIMITS.default;
  const key = `${ip}:${limitName}`;
  const now = Date.now();

  const timestamps = requestStore.get(key) ?? [];
  // Filter to current window
  const windowStart = now - config.windowMs;
  const recentTimestamps = timestamps.filter((t) => t > windowStart);

  if (recentTimestamps.length >= config.maxRequests) {
    const oldest = recentTimestamps[0];
    const retryAfterMs = oldest + config.windowMs - now;
    return {
      allowed: false,
      retryAfter: Math.ceil(retryAfterMs / 1000),
      remaining: 0,
    };
  }

  recentTimestamps.push(now);
  requestStore.set(key, recentTimestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - recentTimestamps.length,
  };
}

/**
 * Map a URL pathname to a rate-limit name.
 * Returns "default" for unmatched paths.
 */
export function getLimitName(pathname: string): string {
  if (pathname.includes("/api/scan")) return "scan";
  if (pathname.includes("/api/correct")) return "correct";
  if (pathname.includes("/api/ai-detect")) return "ai-detect";
  if (pathname.includes("/api/upload")) return "upload";
  if (pathname.includes("/api/documents")) return "documents";
  return "default";
}
