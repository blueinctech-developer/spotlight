import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDb } from "../support/db";
import { hashPassword, verifyPassword, passwordSchema } from "@/lib/auth/password";
import { hashToken, validateSessionToken } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { processSubmission } from "@/lib/forms/submit";

beforeEach(resetDb);

async function makeUser(role: "ADMIN" | "EDITOR" | "AUTHOR" = "EDITOR", active = true) {
  return db.user.create({ data: { email: `${role.toLowerCase()}-${Math.random()}@x.test`, name: role, role, active, passwordHash: await hashPassword("correct horse 42!") } });
}

describe("passwords", () => {
  it("hashes with argon2 and verifies", async () => {
    const h = await hashPassword("correct horse 42!");
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, "correct horse 42!")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
  it("enforces the password policy", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("onlylettersherexx").success).toBe(false);
    expect(passwordSchema.safeParse("letters and 1 digit").success).toBe(true);
  });
});

describe("sessions", () => {
  it("validates a stored session by token hash only", async () => {
    const user = await makeUser();
    const token = "test-token-abcdefghijklmnopqrstuvwxyz";
    await db.session.create({ data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 86400_000) } });
    expect((await validateSessionToken(token))?.id).toBe(user.id);
    expect(await validateSessionToken("wrong-token")).toBeNull();
    // The raw token is never stored.
    expect(await db.session.findUnique({ where: { id: token } })).toBeNull();
  });
  it("rejects and deletes expired sessions", async () => {
    const user = await makeUser();
    const token = "expired-token-abcdefghijklmnopqrstuv";
    await db.session.create({ data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await db.session.count()).toBe(0);
  });
  it("rejects sessions of deactivated users", async () => {
    const user = await makeUser("ADMIN", false);
    const token = "inactive-token-abcdefghijklmnopqrstu";
    await db.session.create({ data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 86400_000) } });
    expect(await validateSessionToken(token)).toBeNull();
  });
  it("slides the expiry forward when more than half the idle window has passed", async () => {
    const user = await makeUser();
    const token = "sliding-token-abcdefghijklmnopqrstuv";
    const soon = new Date(Date.now() + 2 * 86400_000);
    await db.session.create({ data: { id: hashToken(token), userId: user.id, expiresAt: soon } });
    await validateSessionToken(token);
    const s = await db.session.findUnique({ where: { id: hashToken(token) } });
    expect(s!.expiresAt.getTime()).toBeGreaterThan(soon.getTime() + 86400_000);
  });
});

describe("rate limiting", () => {
  it("allows up to the limit within a window, then blocks", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await rateLimit("t:key", 3, 60)).allowed);
    expect(results).toEqual([true, true, true, false]);
  });
  it("starts a new window after expiry", async () => {
    await db.rateLimit.create({ data: { key: "t:old", count: 99, resetAt: new Date(Date.now() - 1000) } });
    expect((await rateLimit("t:old", 3, 60)).allowed).toBe(true);
  });
});

describe("form submissions", () => {
  const base = {
    formKey: "contact",
    locale: "en" as const,
    honeypot: "",
    elapsedMs: 5000,
    ip: "203.0.113.5",
    userAgent: "vitest",
    fields: { firstName: "Ada", lastName: "Obi", phone: "+33 6 00", email: "ada@example.com", profile: "investor", inquiryType: "general", message: "Hello" },
  };

  it("stores a valid submission and records that email is not configured", async () => {
    const r = await processSubmission(base);
    expect(r.ok).toBe(true);
    const rows = await db.formSubmission.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ formKey: "contact", name: "Ada Obi", email: "ada@example.com", status: "NEW" });
    expect(rows[0].notifyError).toBeTruthy();
    expect(rows[0].ipHash).not.toContain("203.0.113.5");
  });

  it("returns field errors and stores nothing for invalid input", async () => {
    const r = await processSubmission({ ...base, fields: { ...base.fields, email: "bad" } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.email).toBeTruthy();
    expect(await db.formSubmission.count()).toBe(0);
  });

  it("silently drops honeypot and too-fast submissions", async () => {
    expect((await processSubmission({ ...base, honeypot: "spam" })).ok).toBe(true);
    expect((await processSubmission({ ...base, elapsedMs: 100 })).ok).toBe(true);
    expect(await db.formSubmission.count()).toBe(0);
  });

  it("rate limits repeated submissions from the same address", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await processSubmission(base));
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("rejects unknown forms", async () => {
    expect(await processSubmission({ ...base, formKey: "admin" })).toMatchObject({ ok: false });
  });
});
