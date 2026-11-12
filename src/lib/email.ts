import "server-only";
import nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

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

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Send a plain notification. Throws on failure so callers can record the error. */
export async function sendEmail(opts: { to: string; subject: string; rows?: [string, string][]; text?: string; replyTo?: string }) {
  if (!emailConfigured()) throw new Error("Email is not configured (EMAIL_FROM plus SES_* or SMTP_HOST).");
  const text = opts.text ?? (opts.rows ?? []).map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = opts.rows
    ? `<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${opts.rows
        .map(([k, v]) => `<tr><th align="left" style="border-bottom:1px solid #eee">${escape(k)}</th><td style="border-bottom:1px solid #eee;white-space:pre-wrap">${escape(v)}</td></tr>`)
        .join("")}</table>`
    : `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${escape(text)}</div>`;
  await getTransport().sendMail({
    from: sender(),
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text,
    html,
  });
}
