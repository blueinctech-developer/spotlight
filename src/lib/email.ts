import "server-only";
import nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { siteUrl } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { esc, renderEmail, type EmailBrand, type EmailContent } from "@/lib/email-template";

/** Sender address, e.g. `Spotlight Nigeria <no-reply@spotlightnigeria-france.com>`. */
function sender(): string | undefined {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || undefined;
}

/** Amazon SES via its API: access key + secret + region. Takes priority over SMTP. */
function sesConfigured(): boolean {
  return Boolean(process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY && process.env.SES_REGION);
}

export function emailConfigured(): boolean {
  return Boolean(sender() && (sesConfigured() || process.env.SMTP_HOST));
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransport() {
  if (transporter) return transporter;
  if (sesConfigured()) {
    const sesClient = new SESv2Client({
      region: process.env.SES_REGION,
      credentials: {
        accessKeyId: process.env.SES_ACCESS_KEY_ID!,
        secretAccessKey: process.env.SES_SECRET_ACCESS_KEY!,
      },
    });
    transporter = nodemailer.createTransport({ SES: { sesClient, SendEmailCommand } });
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

/** Site name, contact details and social links for the email footer, from Settings. */
export async function emailBrand(locale: "en" | "fr"): Promise<EmailBrand> {
  const [general, contact, social] = await Promise.all([getSetting("general"), getSetting("contact"), getSetting("social")]);
  const t = (x: { en: string; fr: string }) => (locale === "fr" ? x.fr || x.en : x.en);
  const links: [string, string][] = [
    ["LinkedIn", social.linkedin], ["Facebook", social.facebook], ["Instagram", social.instagram],
    ["X", social.twitter], ["YouTube", social.youtube],
  ];
  return {
    siteUrl: siteUrl(),
    siteName: general.siteName || "Spotlight Nigeria",
    tagline: t(general.tagline),
    email: contact.email,
    phones: contact.phones,
    addresses: contact.addresses.map((a) => ({ label: t(a.label), text: t(a.text) })).filter((a) => a.text),
    social: links.filter(([, url]) => url).map(([label, url]) => ({ label, url })),
    copyright: t(general.copyright),
  };
}

/**
 * Send an email in the site's branded layout. Throws on failure so callers can record the error.
 * `content` controls the layout; without it the plain `text` is shown under the subject as heading.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  replyTo?: string;
  text?: string;
  rows?: [string, string][];
  content?: Partial<EmailContent>;
}) {
  if (!emailConfigured()) throw new Error("Email is not configured (EMAIL_FROM plus SES_* or SMTP_HOST).");
  const rows = opts.content?.rows ?? opts.rows;
  const text =
    opts.text ??
    [opts.content?.heading, ...(opts.content?.paragraphs ?? []), ...(rows ?? []).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join("\n\n");
  const locale = opts.content?.locale ?? "en";
  let html: string;
  try {
    html = renderEmail(await emailBrand(locale), {
      locale,
      preheader: opts.content?.preheader ?? text.slice(0, 120),
      eyebrow: opts.content?.eyebrow ?? "Spotlight Nigeria",
      heading: opts.content?.heading ?? opts.subject,
      paragraphs: opts.content?.paragraphs ?? (opts.content || rows ? [] : [text]),
      rows,
      buttons: opts.content?.buttons,
      note: opts.content?.note,
    });
  } catch (err) {
    // Settings unreadable: still send, in plain form, rather than lose the email.
    console.error("email layout failed:", err instanceof Error ? err.message : "unknown error");
    html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(text)}</div>`;
  }
  await getTransport().sendMail({ from: sender(), to: opts.to, replyTo: opts.replyTo, subject: opts.subject, text, html });
}
