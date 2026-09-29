import { limits } from "../config/app-config";
import { logWarn } from "./logger";

/**
 * Rate limiting for server actions.
 *
 * Implementation: sliding-window counters held in a per-instance Map. That is
 * enough to stop one browser hammering practice submission or the report form,
 * and it needs no extra infrastructure. Two honest caveats:
 *  - State is per Node process, so a multi-instance deployment gets a relaxed
 *    limit. Move the same buckets to Postgres/Redis if you need strictness.
 *  - `x-forwarded-for` is only trustworthy behind your own proxy; when the app
 *    is exposed directly, anonymous fallback keys are advisory only.
 *
 * When a Supabase session exists we key on the user id, which cannot be forged.
 */

type Bucket = keyof typeof limits.rateLimits;
type Window = { hits: number[] };

const globalStore = globalThis as unknown as {
  __studyquestRateLimits?: Map<string, Window>;
};

const store: Map<string, Window> = globalStore.__studyquestRateLimits ?? new Map();
globalStore.__studyquestRateLimits = store;

let lastSweep = Date.now();

function sweep(now: number, windowMs: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  const cutoff = now - windowMs * 4;
  for (const [key, entry] of store.entries()) {
    if (entry.hits.every((hit) => hit < cutoff)) store.delete(key);
  }
}

export type RateDecision = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(bucket: Bucket, actorKey: string): RateDecision {
  const rule = limits.rateLimits[bucket] ?? { max: 30, windowMs: 60_000 };
  const now = Date.now();
  sweep(now, rule.windowMs);

  const key = `${bucket}:${actorKey}`;
  const entry = store.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((hit) => now - hit < rule.windowMs);

  if (entry.hits.length >= rule.max) {
    store.set(key, entry);
    const oldest = entry.hits[0] ?? now;
    logWarn("rate-limit", `${bucket} blocked for ${actorKey}`);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000)),
    };
  }

  entry.hits.push(now);
  store.set(key, entry);
  return { ok: true, remaining: rule.max - entry.hits.length, retryAfterSeconds: 0 };
}

/** Build the key used for a request: stable user id, else best-effort IP. */
export function rateKey(userId: string | null, ip: string | null): string {
  if (userId) return `u:${userId}`;
  return `ip:${ip && ip.length > 0 ? ip : "unknown"}`;
}

/** First hop of `x-forwarded-for`, falling back to the socket address. */
export function clientIp(forwardedFor: string | undefined, remote: string | undefined): string {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : (remote ?? "unknown");
}
