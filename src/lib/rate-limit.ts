import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { appSecret } from "@/lib/env";

/**
 * Fixed-window rate limiter backed by Postgres, so limits hold across
 * multiple server instances. Returns whether the action is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  // Single atomic upsert: start a new window if the old one expired, else increment.
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfterSeconds: Math.max(0, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export async function resetRateLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}

/** Hash an IP (or other identifier) so raw IPs are never stored. */
export function hashIdentifier(value: string): string {
  return createHash("sha256").update(`${appSecret()}:${value}`).digest("hex").slice(0, 32);
}
