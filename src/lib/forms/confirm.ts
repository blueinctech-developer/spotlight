import "server-only";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { getSetting } from "@/lib/settings";
import type { I18nText } from "@/lib/settings-schema";

/** Forms that send the visitor a thank-you email. */
const CONFIRMED_FORMS = ["contact", "sponsorship"] as const;
type ConfirmedForm = (typeof CONFIRMED_FORMS)[number];

const pick = (t: I18nText, locale: string) => (locale === "fr" ? t.fr.trim() || t.en.trim() : t.en.trim());
const fill = (text: string, name: string | null) =>
  name ? text.replaceAll("{name}", name) : text.replace(/\s*\{name\}/g, "");

/**
 * Send the visitor a confirmation to the address they typed in the form.
 * Best effort: called once, right after a new submission is stored. A failure is logged and
 * does not affect the submission or the team notification.
 */
export async function confirmSubmission(id: string): Promise<"sent" | "skipped" | "failed"> {
  const sub = await db.formSubmission.findUnique({ where: { id }, select: { formKey: true, locale: true, name: true, email: true } });
  if (!sub?.email || !(CONFIRMED_FORMS as readonly string[]).includes(sub.formKey) || !emailConfigured()) return "skipped";
  const key = sub.formKey as ConfirmedForm;

  const c = await getSetting("confirmations");
  const enabled = key === "contact" ? c.contactEnabled : c.sponsorshipEnabled;
  const subject = pick(key === "contact" ? c.contactSubject : c.sponsorshipSubject, sub.locale);
  const message = pick(key === "contact" ? c.contactMessage : c.sponsorshipMessage, sub.locale);
  if (!enabled || !subject || !message) return "skipped";

  // Replies go to the team address that receives this form's notifications.
  const notifications = await getSetting("notifications");
  const replyTo = (notifications[key] || process.env.NOTIFY_EMAIL || "").split(",")[0]?.trim() || undefined;

  try {
    await sendEmail({ to: sub.email, replyTo, subject: fill(subject, sub.name).replace(/[\r\n]+/g, " "), text: fill(message, sub.name) });
    return "sent";
  } catch (err) {
    console.error(`form confirmation ${id} failed:`, err instanceof Error ? err.message.slice(0, 300) : "unknown error");
    return "failed";
  }
}
