import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { retryPendingNotifications } from "@/lib/forms/notify";

/**
 * Scheduled retry of form notification emails that have not reached the email provider yet.
 * Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET" (see vercel.json); any other
 * scheduler can do the same. Without CRON_SECRET configured the endpoint is disabled.
 */
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = req.headers.get("authorization") ?? "";
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await retryPendingNotifications({ limit: 50 });
  return NextResponse.json({ ok: true, ...result });
}
