import "server-only";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, type Capability } from "./permissions";
import { clientIpFrom } from "@/lib/client-ip";
import type { Role } from "@/generated/prisma/enums";

/**
 * Database-backed sessions (the approach recommended by OWASP and the Lucia guide):
 * a random 256-bit token lives in an httpOnly cookie; only its SHA-256 hash is stored.
 */
const IS_PROD = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = IS_PROD ? "__Host-snf_session" : "snf_session";
const IDLE_DAYS = 14; // session expires after 14 days without use
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionUser = { id: string; email: string; name: string; role: Role };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function clientInfo() {
  const h = await headers();
  const ip = clientIpFrom(h);
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

/** Create a session and set the cookie. Call only from Server Actions / Route Handlers. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const { ip, userAgent } = await clientInfo();
  await db.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + IDLE_DAYS * 86400_000),
      ip,
      userAgent,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsForUser(userId: string, exceptCurrent = false) {
  let keep: string | undefined;
  if (exceptCurrent) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    keep = token ? hashToken(token) : undefined;
  }
  await db.session.deleteMany({ where: { userId, ...(keep ? { NOT: { id: keep } } : {}) } });
}

/** Validate a raw token. Exported for tests; app code uses getCurrentUser(). */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const id = hashToken(token);
  const session = await db.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || !session.user.active) {
    await db.session.deleteMany({ where: { id } });
    return null;
  }
  // Sliding expiry: extend when less than half the idle window remains.
  if (session.expiresAt.getTime() - now < (IDLE_DAYS / 2) * 86400_000) {
    await db.session.update({ where: { id }, data: { expiresAt: new Date(now + IDLE_DAYS * 86400_000) } });
  }
  const { id: userId, email, name, role } = session.user;
  return { id: userId, email, name, role };
}

/** Current signed-in user for this request (memoised per request), or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/** For pages: redirect to login when signed out, show 403 page when missing a capability. */
export async function requireUser(cap?: Capability): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login/");
  if (cap && !can(user.role, cap)) redirect("/admin/?denied=1");
  return user;
}

export class AuthError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthError";
  }
}

/** For Server Actions and Route Handlers: throw instead of redirecting. */
export async function assertCan(cap?: Capability): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Your session has expired. Please sign in again.");
  if (cap && !can(user.role, cap)) throw new AuthError();
  return user;
}
