"use server";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { burnPasswordCheck, hashPassword, passwordSchema, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessionsForUser, destroySession, getCurrentUser, hashToken } from "@/lib/auth/session";
import { hashIdentifier, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { emailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { clientIpFrom } from "@/lib/client-ip";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; message?: string } | null;

async function clientIp() {
  return clientIpFrom(await headers());
}

/** Constant-time string comparison (hashing first makes the lengths equal). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function safeNext(next: unknown): string {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/admin") && !v.startsWith("//") ? v : "/admin/";
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(200),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  // Limit password guessing per IP, per account from one IP, and (more loosely) per account
  // overall. The tight limit is keyed on account + IP so that someone who only knows an
  // email address cannot keep the real user locked out from their own network.
  const ip = hashIdentifier(await clientIp());
  const acct = hashIdentifier(email);
  const [byIp, byAccountIp, byAccount] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 20, 15 * 60),
    rateLimit(`login:acct-ip:${acct}:${ip}`, 8, 15 * 60),
    rateLimit(`login:acct:${acct}`, 100, 60 * 60),
  ]);
  if (!byIp.allowed || !byAccountIp.allowed || !byAccount.allowed) {
    const mins = Math.ceil(Math.max(byIp.retryAfterSeconds, byAccountIp.retryAfterSeconds, byAccount.retryAfterSeconds) / 60);
    return { error: `Too many sign-in attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    await burnPasswordCheck(password);
    return { error: "Incorrect email or password." };
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    await audit({ userId: user.id, action: "auth.login_failed", entityType: "USER", entityId: user.id, summary: `Failed sign-in for ${email}` });
    return { error: "Incorrect email or password." };
  }
  await resetRateLimit(`login:acct-ip:${acct}:${ip}`);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ userId: user.id, action: "auth.login", entityType: "USER", entityId: user.id, summary: `${user.name} signed in` });
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit({ userId: user.id, action: "auth.logout", entityType: "USER", entityId: user.id, summary: `${user.name} signed out` });
  redirect("/admin/login/");
}

const setupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    password: passwordSchema,
    confirm: z.string(),
    setupToken: z.string().optional(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });

/**
 * First-run setup: creates the first administrator. Only possible while no user exists.
 * If SETUP_TOKEN is set in the environment, it must be supplied (protects a fresh
 * production deployment between deploy and first sign-in).
 */
export async function setupFirstAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = setupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  // Rate-limit before checking the token so it cannot be guessed quickly.
  const limit = await rateLimit(`setup:${hashIdentifier(await clientIp())}`, 10, 3600);
  if (!limit.allowed) return { error: "Too many attempts. Try again later." };
  const expected = process.env.SETUP_TOKEN;
  if (!expected && setupTokenRequired()) {
    return { error: "Set SETUP_TOKEN on the server first (or create the administrator with `npm run admin:create`)." };
  }
  if (expected && !safeEqual(parsed.data.setupToken ?? "", expected)) {
    await audit({ action: "user.setup_failed", entityType: "USER", summary: "First-run setup attempted with a wrong token" });
    return { error: "The setup token is not correct." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // Serializable transaction so two simultaneous setups cannot both create an admin.
  const created = await db.$transaction(
    async (tx) => {
      if ((await tx.user.count()) > 0) return null;
      return tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: "ADMIN" } });
    },
    { isolationLevel: "Serializable" },
  );
  if (!created) return { error: "Setup has already been completed. Please sign in." };
  await audit({ userId: created.id, action: "user.setup", entityType: "USER", entityId: created.id, summary: `First administrator ${created.email} created` });
  await createSession(created.id);
  redirect("/admin/");
}

const requestSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") });

/** Always answers the same way so the form cannot be used to discover accounts. */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const generic = { message: "If an account exists for that address, a reset link has been sent." };
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`reset:${hashIdentifier(await clientIp())}`, 5, 3600),
    // Per address too, so nobody can flood one person's inbox from many IPs.
    rateLimit(`reset:acct:${hashIdentifier(parsed.data.email)}`, 3, 3600),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return generic;
  // The lookup, token and email run after the response is sent, so the response time
  // is the same whether or not the account exists.
  const email = parsed.data.email;
  after(() => sendResetEmail(email));
  return generic;
}

async function sendResetEmail(email: string) {
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.active) return;
    if (!emailConfigured()) {
      console.warn("Password reset requested but SMTP is not configured; use `npm run admin:create -- --reset` instead.");
      await audit({ userId: user.id, action: "auth.reset_unavailable", entityType: "USER", entityId: user.id, summary: `Password reset requested for ${user.email}, but email is not configured` });
      return;
    }
    const token = randomBytes(32).toString("base64url");
    await db.passwordResetToken.create({ data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    await sendEmail({
      to: user.email,
      subject: "Reset your Spotlight CMS password",
      text: `Hello ${user.name},\n\nUse this link within one hour to choose a new password:\n${siteUrl()}/admin/reset-password/?token=${token}\n\nIf you did not ask for this, you can ignore this email.`,
    });
    await audit({ userId: user.id, action: "auth.reset_requested", entityType: "USER", entityId: user.id, summary: `Password reset requested for ${user.email}` });
  } catch (err) {
    console.error("password reset email failed:", err instanceof Error ? err.message : "unknown error");
  }
}

const resetSchema = z
  .object({ token: z.string().min(20), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = hashToken(parsed.data.token);
  const row = await db.passwordResetToken.findUnique({ where: { id } });
  const invalid = { error: "This reset link is invalid or has expired." };
  if (!row || row.usedAt || row.expiresAt < new Date()) return invalid;
  const passwordHash = await hashPassword(parsed.data.password);
  // Claim the token atomically so two simultaneous requests cannot both use it.
  const used = await db.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    // Any other outstanding links for this user stop working too.
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, id: { not: id } } });
    return true;
  });
  if (!used) return invalid;
  await destroyAllSessionsForUser(row.userId);
  await audit({ userId: row.userId, action: "auth.password_reset", entityType: "USER", entityId: row.userId, summary: "Password reset completed" });
  redirect("/admin/login/?reset=1");
}

/** In production the first-run setup page must be protected by SETUP_TOKEN. */
function setupTokenRequired(): boolean {
  return process.env.NODE_ENV === "production" && process.env.ALLOW_SETUP_WITHOUT_TOKEN !== "true";
}
