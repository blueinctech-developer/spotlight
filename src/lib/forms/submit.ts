import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { FORMS, formValidator } from "./definitions";
import { formKeys, type FormKey } from "@/lib/blocks/schema";
import { hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { mediaUrl } from "@/lib/media-url";
import { notifySubmission } from "./notify";
import { confirmSubmission } from "./confirm";
import type { Locale } from "@/lib/i18n";

/** Identical answers from the same sender within this window are treated as one submission. */
const DEDUPE_WINDOW_MS = 10 * 60_000;

function dedupeKeyFor(formKey: string, ipHash: string, data: Record<string, string>, bucket: number) {
  const normalized = Object.keys(data)
    .sort()
    .map((k) => [k, String(data[k]).trim().toLowerCase()]);
  return createHash("sha256").update(JSON.stringify([formKey, ipHash, normalized, bucket])).digest("hex");
}

export type SubmitResult =
  | { ok: true; downloadUrl?: string }
  | { ok: false; error: "invalid" | "rate_limited" | "server"; fieldErrors?: Record<string, string> };

/**
 * Core submission pipeline (framework-independent so it can be tested):
 * spam checks → rate limit → validation → persist → notify. Success is only
 * returned once the submission is stored in the database.
 */
export async function processSubmission(input: {
  formKey: string;
  locale: Locale;
  fields: Record<string, string>;
  honeypot: string;
  elapsedMs: number;
  ip: string;
  userAgent: string | null;
  downloadId?: string | null;
}): Promise<SubmitResult> {
  if (!(formKeys as readonly string[]).includes(input.formKey)) return { ok: false, error: "invalid" };
  const key = input.formKey as FormKey;
  const def = FORMS[key];

  // Bots fill hidden fields and submit instantly. Pretend success so they don't adapt,
  // but never store anything.
  if (input.honeypot || input.elapsedMs < 1500) return { ok: true };

  const ipHash = hashIdentifier(input.ip || "unknown");
  const limit = await rateLimit(`form:${key}:${ipHash}`, 5, 600);
  if (!limit.allowed) return { ok: false, error: "rate_limited" };

  const parsed = formValidator(def).safeParse(input.fields);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "invalid", fieldErrors };
  }
  const data = parsed.data as Record<string, string>;
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || data.name || null;

  // Duplicate protection: the same answers from the same sender within the window (a double
  // click, a resubmitted page, a network retry) are acknowledged but stored only once.
  const bucket = Math.floor(Date.now() / DEDUPE_WINDOW_MS);
  const dedupeKey = dedupeKeyFor(key, ipHash, data, bucket);
  const previousKey = dedupeKeyFor(key, ipHash, data, bucket - 1);
  const duplicate = await db.formSubmission.findFirst({
    where: { dedupeKey: { in: [dedupeKey, previousKey] }, createdAt: { gt: new Date(Date.now() - DEDUPE_WINDOW_MS) } },
    select: { id: true },
  });

  if (!duplicate) {
    let submissionId: string | null = null;
    try {
      const row = await db.formSubmission.create({
        data: {
          formKey: key,
          locale: input.locale,
          name,
          email: data.email || null,
          data,
          ipHash,
          userAgent: input.userAgent?.slice(0, 300) ?? null,
          dedupeKey,
        },
      });
      submissionId = row.id;
    } catch (err) {
      // A simultaneous identical submission won the race: it is stored, so this one succeeds too.
      const isDuplicate = Boolean(err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002");
      if (!isDuplicate) {
        console.error("form submission failed to save:", err instanceof Error ? err.message : "unknown error");
        return { ok: false, error: "server" };
      }
    }
    // Notify. The submission is already stored, so a failure here is recorded on it, shown in
    // the CMS and retried later; the visitor still gets a success message.
    if (submissionId) {
      try {
        await notifySubmission(submissionId);
      } catch (err) {
        console.error("form notification error:", err instanceof Error ? err.message : "unknown error");
      }
      // Thank-you email to the visitor (contact and sponsorship). Sent once, never retried.
      try {
        await confirmSubmission(submissionId);
      } catch (err) {
        console.error("form confirmation error:", err instanceof Error ? err.message : "unknown error");
      }
    }
  }

  let downloadUrl: string | undefined;
  if (key === "report-download" && input.downloadId) {
    downloadUrl = (await offeredDownloadUrl(input.downloadId)) ?? undefined;
  }
  return { ok: true, downloadUrl };
}

/**
 * The browser says which document the form offers; only honour it if that file really is
 * attached to a form on a published page (otherwise any media id could be requested).
 */
async function offeredDownloadUrl(mediaId: string): Promise<string | null> {
  const file = await db.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { storageKey: true, usages: { where: { entityType: "PAGE" }, select: { entityId: true } } },
  });
  if (!file || file.usages.length === 0) return null;
  const pages = await db.page.findMany({
    where: { id: { in: file.usages.map((u) => u.entityId) }, status: "PUBLISHED", deletedAt: null },
    select: { blocks: true },
  });
  const offered = pages.some((p) => JSON.stringify(p.blocks ?? []).includes(`"download":"${mediaId}"`));
  return offered ? mediaUrl(file.storageKey) : null;
}
