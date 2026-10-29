import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

/**
 * Server Actions called directly (as an attacker could, bypassing the UI), the notification
 * outbox, duplicate submissions, password-reset tokens and media reference rewriting.
 * Next's request APIs are replaced by small in-memory fakes.
 */
const req = vi.hoisted(() => ({ token: null as string | null, deferred: [] as (() => unknown)[] }));
const mail = vi.hoisted(() => ({ configured: true, fail: false, sent: [] as { to: string; subject: string }[] }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (req.token && name.endsWith("snf_session") ? { name, value: req.token } : undefined),
    set: () => {},
    delete: () => {},
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.10", "user-agent": "vitest" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { digest: `NEXT_REDIRECT;${url}` });
  },
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_NOT_FOUND" });
  },
}));
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => void req.deferred.push(fn),
}));
vi.mock("@/lib/email", () => ({
  emailConfigured: () => mail.configured,
  sendEmail: async (m: { to: string; subject: string }) => {
    await new Promise((r) => setTimeout(r, 20));
    if (mail.fail) throw new Error("550 mailbox unavailable");
    mail.sent.push({ to: m.to, subject: m.subject });
  },
}));

import { db, resetDb } from "../support/db";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/session";
import { setSubmissionStatus, retrySubmissionNotification, deleteSubmissions } from "@/app/admin/actions/submissions";
import { createUser, setUserActive } from "@/app/admin/actions/users";
import { saveSettingsGroup } from "@/app/admin/actions/settings";
import { publishPage } from "@/app/admin/actions/pages";
import { requestPasswordReset, resetPassword } from "@/app/admin/actions/auth";
import { processSubmission } from "@/lib/forms/submit";
import { notifySubmission, retryPendingNotifications, MAX_NOTIFY_ATTEMPTS } from "@/lib/forms/notify";
import { rewriteMediaReferences } from "@/lib/media/process";

beforeEach(async () => {
  await resetDb();
  req.token = null;
  req.deferred = [];
  mail.configured = true;
  mail.fail = false;
  mail.sent = [];
  process.env.NOTIFY_EMAIL = "team@example.test";
});

async function signInAs(role: "ADMIN" | "EDITOR" | "AUTHOR") {
  const user = await db.user.create({
    data: { email: `${role.toLowerCase()}-${randomBytes(3).toString("hex")}@x.test`, name: role, role, passwordHash: await hashPassword("correct horse 42!") },
  });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({ data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 86400_000) } });
  req.token = token;
  return user;
}

const submission = (overrides: Partial<Parameters<typeof processSubmission>[0]> = {}) => ({
  formKey: "contact",
  locale: "en" as const,
  honeypot: "",
  elapsedMs: 5000,
  ip: "203.0.113.5",
  userAgent: "vitest",
  fields: { firstName: "Ada", lastName: "Obi", phone: "+33 6 00", email: "ada@example.com", profile: "investor", inquiryType: "general", message: "Hello" },
  ...overrides,
});

describe("server actions enforce permissions without the UI", () => {
  it("rejects anonymous callers", async () => {
    const r = await setSubmissionStatus({ ids: ["x"], status: "READ" });
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/sign in/i);
  });

  it("stops authors from reading enquiries, changing settings, publishing or managing users", async () => {
    await processSubmission(submission());
    const sub = await db.formSubmission.findFirstOrThrow();
    await signInAs("AUTHOR");
    for (const r of [
      await setSubmissionStatus({ ids: [sub.id], status: "ARCHIVED" }),
      await deleteSubmissions({ ids: [sub.id] }),
      await retrySubmissionNotification({ id: sub.id }),
      await saveSettingsGroup({ key: "seo", value: { discourageIndexing: true } }),
      await publishPage({ id: "anything" }),
      await createUser({ name: "Mallory", email: "m@x.test", role: "ADMIN", password: "letters and 1 digit" }),
    ]) {
      expect(r).toMatchObject({ ok: false, error: "You do not have permission to do that." });
    }
    expect(await db.formSubmission.count()).toBe(1);
    expect((await db.formSubmission.findFirstOrThrow()).status).toBe("NEW");
    expect(await db.user.count({ where: { email: "m@x.test" } })).toBe(0);
  });

  it("stops editors from managing users or settings but lets them handle enquiries", async () => {
    await processSubmission(submission());
    const sub = await db.formSubmission.findFirstOrThrow();
    await signInAs("EDITOR");
    expect(await createUser({ name: "Eve", email: "eve@x.test", role: "ADMIN", password: "letters and 1 digit" })).toMatchObject({ ok: false });
    expect(await saveSettingsGroup({ key: "seo", value: {} })).toMatchObject({ ok: false });
    expect(await setSubmissionStatus({ ids: [sub.id], status: "ARCHIVED" })).toMatchObject({ ok: true });
  });

  it("lets an administrator manage users but never remove the last administrator", async () => {
    const admin = await signInAs("ADMIN");
    const created = await createUser({ name: "New Editor", email: "editor@x.test", role: "EDITOR", password: "letters and 1 digit" });
    expect(created).toMatchObject({ ok: true });
    expect(await setUserActive({ id: admin.id, active: false })).toMatchObject({ ok: false });
  });

  it("refuses to save unsafe settings values", async () => {
    await signInAs("ADMIN");
    const r = await saveSettingsGroup({ key: "social", value: { facebook: "javascript:alert(1)" } });
    expect(r).toMatchObject({ ok: false });
  });
});

describe("form notifications (outbox)", () => {
  it("sends once and never re-sends a delivered notification", async () => {
    await processSubmission(submission());
    const sub = await db.formSubmission.findFirstOrThrow();
    expect(sub.notifiedAt).not.toBeNull();
    expect(sub.notifyAttempts).toBe(1);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe("team@example.test");
    expect(await notifySubmission(sub.id)).toBe("already_sent");
    await retryPendingNotifications();
    expect(mail.sent).toHaveLength(1);
  });

  it("records failures, retries after a back-off and stops after the attempt budget", async () => {
    mail.fail = true;
    await processSubmission(submission());
    let sub = await db.formSubmission.findFirstOrThrow();
    expect(sub.notifiedAt).toBeNull();
    expect(sub.notifyError).toMatch(/550/);
    expect(sub.notifyAttempts).toBe(1);

    // Too early: the back-off has not elapsed.
    expect((await retryPendingNotifications()).checked).toBe(0);

    // Later, the provider recovers.
    mail.fail = false;
    await db.formSubmission.update({ where: { id: sub.id }, data: { notifyLastAttemptAt: new Date(Date.now() - 6 * 60_000) } });
    expect(await retryPendingNotifications()).toMatchObject({ sent: 1 });
    sub = await db.formSubmission.findFirstOrThrow();
    expect(sub.notifiedAt).not.toBeNull();
    expect(sub.notifyError).toBeNull();
    expect(sub.notifyAttempts).toBe(2);

    // A submission that used its whole budget is left for a person to retry from the CMS.
    await db.formSubmission.update({ where: { id: sub.id }, data: { notifiedAt: null, notifyAttempts: MAX_NOTIFY_ATTEMPTS, notifyLastAttemptAt: new Date(0) } });
    expect((await retryPendingNotifications()).checked).toBe(0);
  });

  it("never sends twice when two workers pick up the same notification", async () => {
    mail.configured = false;
    await processSubmission(submission());
    const sub = await db.formSubmission.findFirstOrThrow();
    expect(sub.notifyError).toBe("Email not configured");
    expect(sub.notifyAttempts).toBe(0); // configuration problems do not use up attempts
    mail.configured = true;
    const outcomes = await Promise.all([notifySubmission(sub.id), notifySubmission(sub.id), notifySubmission(sub.id)]);
    expect(outcomes.filter((o) => o === "sent")).toHaveLength(1);
    expect(mail.sent).toHaveLength(1);
  });

  it("lets an editor retry a failed notification from the CMS", async () => {
    mail.fail = true;
    await processSubmission(submission());
    const sub = await db.formSubmission.findFirstOrThrow();
    mail.fail = false;
    await db.formSubmission.update({ where: { id: sub.id }, data: { notifyLastAttemptAt: new Date(Date.now() - 3 * 60_000) } });
    await signInAs("EDITOR");
    expect(await retrySubmissionNotification({ id: sub.id })).toMatchObject({ ok: true });
    expect(mail.sent).toHaveLength(1);
    expect(await db.auditLog.count({ where: { action: "submission.notify_retry" } })).toBe(1);
  });
});

describe("duplicate submissions and downloads", () => {
  it("stores an identical resubmission only once", async () => {
    const results = await Promise.all([processSubmission(submission()), processSubmission(submission())]);
    await processSubmission(submission());
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await db.formSubmission.count()).toBe(1);
    // A different message is a new submission.
    await processSubmission(submission({ fields: { ...submission().fields, message: "Another question" } }));
    expect(await db.formSubmission.count()).toBe(2);
  });

  it("only hands out a download that is attached to a published form", async () => {
    const pdf = await db.mediaAsset.create({ data: { storageKey: "uploads/2026/10/report-abc.pdf", filename: "report.pdf", mimeType: "application/pdf", size: 10 } });
    const secret = await db.mediaAsset.create({ data: { storageKey: "uploads/2026/10/draft-xyz.pdf", filename: "draft.pdf", mimeType: "application/pdf", size: 10 } });
    const page = await db.page.create({
      data: {
        translationGroup: "g1", title: "Previous editions", slug: "previous-editions", path: "previous-editions", status: "PUBLISHED", publishedAt: new Date(),
        blocks: [{ id: "b1", type: "form", formKey: "report-download", download: pdf.id }],
      },
    });
    await db.mediaUsage.create({ data: { mediaId: pdf.id, entityType: "PAGE", entityId: page.id, label: "Previous editions" } });
    const fields = { firstName: "Ada", lastName: "Obi", phone: "+33 6 00", email: "ada@example.com", industry: "ict", city: "Paris", jobTitle: "CEO", jobFunction: "Management" };
    const ok = await processSubmission(submission({ formKey: "report-download", fields, downloadId: pdf.id }));
    const denied = await processSubmission(submission({ formKey: "report-download", fields: { ...fields, firstName: "Bo" }, downloadId: secret.id }));
    if (!ok.ok) console.error(ok);
    expect(ok).toMatchObject({ ok: true });
    expect(ok.ok && ok.downloadUrl).toContain("report-abc.pdf");
    expect(denied.ok && denied.downloadUrl).toBeFalsy();
  });
});

describe("password reset tokens", () => {
  it("work once, and an old link stops working after a reset", async () => {
    const user = await db.user.create({ data: { email: "reset@x.test", name: "R", role: "EDITOR", passwordHash: await hashPassword("correct horse 42!") } });
    const tokens = ["a", "b"].map(() => randomBytes(32).toString("base64url"));
    for (const t of tokens) {
      await db.passwordResetToken.create({ data: { id: hashToken(t), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) } });
    }
    const form = (token: string) => {
      const f = new FormData();
      f.set("token", token);
      f.set("password", "brand new pass 7");
      f.set("confirm", "brand new pass 7");
      return f;
    };
    await expect(resetPassword(null, form(tokens[0]))).rejects.toThrow(/NEXT_REDIRECT/);
    expect(await resetPassword(null, form(tokens[0]))).toMatchObject({ error: expect.stringMatching(/invalid or has expired/) });
    expect(await resetPassword(null, form(tokens[1]))).toMatchObject({ error: expect.stringMatching(/invalid or has expired/) });
  });

  it("answers reset requests identically and does the work after the response", async () => {
    await db.user.create({ data: { email: "known@x.test", name: "K", role: "EDITOR", passwordHash: await hashPassword("correct horse 42!") } });
    const ask = (email: string) => {
      const f = new FormData();
      f.set("email", email);
      return requestPasswordReset(null, f);
    };
    const known = await ask("known@x.test");
    const unknown = await ask("nobody@x.test");
    expect(known).toEqual(unknown);
    expect(mail.sent).toHaveLength(0); // nothing happened before the response
    for (const fn of req.deferred) await fn();
    expect(mail.sent).toHaveLength(1);
    expect(await db.passwordResetToken.count()).toBe(1);
  });
});

describe("replacing a media file", () => {
  it("rewrites URLs to the old file in posts, page blocks and bios", async () => {
    const oldKey = "uploads/2023/08/photo-aaaaaa.jpg";
    const newKey = "uploads/2023/08/photo-bbbbbbbbbbbb.jpg";
    const post = await db.post.create({ data: { translationGroup: "p", title: "T", slug: "t", content: `<p><img src="/media/${oldKey}" alt=""></p>` } });
    const page = await db.page.create({ data: { translationGroup: "q", title: "P", slug: "p", path: "p", blocks: [{ id: "x", type: "richText", html: `<img src="/media/${oldKey}">` }] } });
    const speaker = await db.speaker.create({ data: { slug: "s", name: "S", bio: `<img src="/media/${oldKey}">` } });
    const untouched = await db.post.create({ data: { translationGroup: "u", title: "U", slug: "u", content: "<p>uploads/2023/08/photo-aaaaaa_jpg</p>" } });
    await db.$transaction((tx) => rewriteMediaReferences(tx, oldKey, newKey));
    expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).content).toContain(newKey);
    expect(JSON.stringify((await db.page.findUniqueOrThrow({ where: { id: page.id } })).blocks)).toContain(newKey);
    expect((await db.speaker.findUniqueOrThrow({ where: { id: speaker.id } })).bio).toContain(newKey);
    expect((await db.post.findUniqueOrThrow({ where: { id: untouched.id } })).content).not.toContain(newKey);
  });
});
