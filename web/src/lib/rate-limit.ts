import { NextRequest } from "next/server";
import { Errors } from "@/lib/errors";

// In-memory sliding-window rate limiter. Good for a single instance / local dev.
// For multi-instance production, swap the Map for Redis (same interface).
type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

// Periodic cleanup so the map doesn't grow unbounded.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

/**
 * Throws AppError(429) when the caller exceeds `limit` requests per `windowMs`.
 * Key should identify the actor + route, e.g. `login:${ip}`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  sweep();
  const now = Date.now();
  const hit = buckets.get(key);
  if (!hit || hit.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  hit.count += 1;
  if (hit.count > limit) {
    const retry = Math.ceil((hit.resetAt - now) / 1000);
    throw Errors.rateLimited(`Too many requests. Try again in ${retry}s.`);
  }
}
