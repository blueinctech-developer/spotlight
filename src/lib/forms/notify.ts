import "server-only";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/env";
import { FORMS, displayValue } from "./definitions";
import { formKeys, type FormKey } from "@/lib/blocks/schema";

/**
 * Email notifications for form submissions.
 *
 * The submission is always stored first, so a notification can never be lost: anything not yet
 * delivered to the email provider is picked up again by retryPendingNotifications(), which runs
 * after each new submission, from the CMS ("Retry email") and from the scheduled job
 * (/api/cron/notifications). Each attempt claims the row first, so two workers never send the
 * same notification twice, and a submission that was handed to the provider is never re-sent.
 *
 * "Notified" means the SMTP server accepted the message; final delivery to the inbox is not
 * visible to the application.
 */
export const MAX_NOTIFY_ATTEMPTS = 5;
/** How long a claimed attempt blocks others (covers a slow SMTP handshake). */
const CLAIM_MS = 2 * 60_000;
/** Wait before retrying a failed attempt: 5 min, 15 min, 45 min, 2h15… */
export const backoffMs = (attempts: number) => 5 * 60_000 * 3 ** Math.max(0, attempts - 1);

export type NotifyOutcome = "sent" | "already_sent" | "busy" | "not_configured" | "no_recipient" | "failed" | "missing";

export async function notifySubmission(id: string, opts: { force?: boolean } = {}): Promise<NotifyOutcome> {
  const sub = await db.formSubmission.findUnique({ where: { id } });
  if (!sub) return "missing";
  if (sub.notifiedAt) return "already_sent";
  // History imported from the old site was handled there; never email it from here.
  if (sub.source !== "website") return "already_sent";
  if (!(formKeys as readonly string[]).includes(sub.formKey)) return "missing";
  const key = sub.formKey as FormKey;

  const notifications = await getSetting("notifications");
  const to = notifications[key] || process.env.NOTIFY_EMAIL;
  // Configuration problems are recorded but do not use up an attempt, so the notification goes
  // out once email is configured.
  if (!to) {
    await db.formSubmission.update({ where: { id }, data: { notifyError: "No notification address configured" } });
    return "no_recipient";
  }
  if (!emailConfigured()) {
    await db.formSubmission.update({ where: { id }, data: { notifyError: "Email not configured" } });
    return "not_configured";
  }

  // Claim: only one worker may send, and not while another attempt is in flight.
  const now = new Date();
  const claimed = await db.formSubmission.updateMany({
    where: {
      id,
      notifiedAt: null,
      ...(opts.force ? {} : { notifyAttempts: { lt: MAX_NOTIFY_ATTEMPTS } }),
      OR: [{ notifyLastAttemptAt: null }, { notifyLastAttemptAt: { lt: new Date(now.getTime() - CLAIM_MS) } }],
    },
    data: { notifyLastAttemptAt: now, notifyAttempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return "busy";

  const def = FORMS[key];
  const data = (sub.data ?? {}) as Record<string, string>;
  const received = sub.createdAt.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" });
  const who = sub.name || sub.email || "a visitor";
  try {
    await sendEmail({
      to,
      replyTo: sub.email || undefined,
      subject: `[Spotlight Nigeria] ${def.title.en}${sub.name ? ` – ${sub.name}` : ""}`,
      content: {
        locale: "en",
        preheader: `New ${def.title.en.toLowerCase()} submission from ${who}.`,
        eyebrow: "New website submission",
        heading: `${def.title.en} · ${who}`,
        paragraphs: [`Received ${received} (Paris time) on the ${sub.locale === "fr" ? "French" : "English"} site.`],
        rows: def.fields.map((f) => [f.label.en.replace(/\s*\*$/, ""), displayValue(def, f.name, data[f.name])] as [string, string]),
        buttons: [
          ...(sub.email ? [{ label: `Reply to ${sub.name?.split(" ")[0] || "sender"}`, href: `mailto:${sub.email}?subject=${encodeURIComponent("Re: your message to Spotlight Nigeria")}` }] : []),
          { label: "Open in the CMS", href: `${siteUrl()}/admin/submissions/${sub.id}/`, secondary: true },
        ],
        note: `Sent by the Spotlight Nigeria website. Replying to this email answers ${who} directly.`,
      },
    });
    await db.formSubmission.update({ where: { id }, data: { notifiedAt: new Date(), notifyError: null } });
    return "sent";
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : "Unknown email error";
    await db.formSubmission.update({ where: { id }, data: { notifyError: message } });
    console.error(`form notification ${id} failed:`, message);
    return "failed";
  }
}

/** Send notifications that are still owed: never sent, not spam, within the retry budget and back-off. */
export async function retryPendingNotifications(opts: { limit?: number; maxAgeDays?: number } = {}) {
  const now = Date.now();
  const candidates = await db.formSubmission.findMany({
    where: {
      notifiedAt: null,
      status: { not: "SPAM" },
      notifyAttempts: { lt: MAX_NOTIFY_ATTEMPTS },
      createdAt: { gt: new Date(now - (opts.maxAgeDays ?? 7) * 86400_000) },
    },
    orderBy: { createdAt: "asc" },
    take: (opts.limit ?? 20) * 3,
    select: { id: true, notifyAttempts: true, notifyLastAttemptAt: true },
  });
  const due = candidates
    .filter((c) => !c.notifyLastAttemptAt || now - c.notifyLastAttemptAt.getTime() >= backoffMs(c.notifyAttempts))
    .slice(0, opts.limit ?? 20);
  const results: Record<NotifyOutcome, number> = { sent: 0, already_sent: 0, busy: 0, not_configured: 0, no_recipient: 0, failed: 0, missing: 0 };
  for (const c of due) results[await notifySubmission(c.id)]++;
  return { checked: due.length, ...results };
}
