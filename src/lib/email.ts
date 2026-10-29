import "server-only";
import nodemailer from "nodemailer";

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransport() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Send a plain notification. Throws on failure so callers can record the error. */
export async function sendEmail(opts: { to: string; subject: string; rows?: [string, string][]; text?: string; replyTo?: string }) {
  if (!emailConfigured()) throw new Error("Email is not configured (SMTP_HOST / SMTP_FROM).");
  const text = opts.text ?? (opts.rows ?? []).map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = opts.rows
    ? `<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${opts.rows
        .map(([k, v]) => `<tr><th align="left" style="border-bottom:1px solid #eee">${escape(k)}</th><td style="border-bottom:1px solid #eee;white-space:pre-wrap">${escape(v)}</td></tr>`)
        .join("")}</table>`
    : `<pre style="font-family:sans-serif">${escape(text)}</pre>`;
  await getTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text,
    html,
  });
}
