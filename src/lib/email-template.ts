/**
 * Branded HTML email layout (Spotlight Nigeria site style), built with tables and inline styles so
 * it renders the same in Gmail, Outlook and Apple Mail. Pure functions: no database access here, so
 * it can be previewed and tested. Colours and fonts follow docs/DESIGN_SYSTEM.md.
 */

export type EmailBrand = {
  siteUrl: string;
  siteName: string;
  tagline: string;
  email: string;
  phones: string[];
  addresses: { label: string; text: string }[];
  social: { label: string; url: string }[];
  copyright: string;
};

export type EmailContent = {
  locale: "en" | "fr";
  /** Short line shown after the subject in the inbox list. */
  preheader: string;
  eyebrow: string;
  heading: string;
  /** Paragraphs of plain text (line breaks are kept). */
  paragraphs?: string[];
  rows?: [string, string][];
  buttons?: { label: string; href: string; secondary?: boolean }[];
  /** Small print under the card, e.g. why the reader got this email. */
  note?: string;
};

const C = {
  brand: "#21B354",
  brandDark: "#17803C",
  tint: "#E9F7EE",
  ink: "#39364F",
  text: "#323232",
  muted: "#717488",
  line: "#EBEBEB",
  page: "#F4F4F4",
  night: "#0B1620",
};
const HEAD = "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
const BODY = "Urbanist, 'Segoe UI', Arial, sans-serif";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const br = (s: string) => esc(s).replace(/\r?\n/g, "<br>");
const isEmail = (s: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);

function button(b: { label: string; href: string; secondary?: boolean }) {
  const bg = b.secondary ? "#FFFFFF" : C.brand;
  const fg = b.secondary ? C.brandDark : "#FFFFFF";
  const border = b.secondary ? `1px solid ${C.brand}` : `1px solid ${C.brand}`;
  return `<td style="padding:0 12px 12px 0"><a href="${esc(b.href)}" style="display:inline-block;background:${bg};color:${fg};border:${border};border-radius:8px;padding:12px 22px;font-family:${BODY};font-size:15px;font-weight:700;line-height:1;text-decoration:none">${esc(b.label)}</a></td>`;
}

export function renderEmail(brand: EmailBrand, c: EmailContent): string {
  const site = brand.siteUrl.replace(/\/$/, "");
  const host = site.replace(/^https?:\/\//, "");
  const rows = (c.rows ?? []).filter(([, v]) => v !== "");
  const contactLine = [brand.email && `<a href="mailto:${esc(brand.email)}" style="color:#FFFFFF;text-decoration:underline">${esc(brand.email)}</a>`, ...brand.phones.map(esc)]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  return `<!doctype html>
<html lang="${c.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(c.heading)}</title>
<style>
  @media (max-width: 620px) { .card { width: 100% !important; border-radius: 0 !important; } .pad { padding-left: 22px !important; padding-right: 22px !important; } .row td { display: block !important; width: 100% !important; } }
  a { color: ${C.brandDark}; }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page}">${esc(c.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid ${C.line}">
    <tr><td style="height:6px;background:${C.brand};font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td class="pad" style="padding:28px 40px 4px">
      <a href="${esc(site)}/" style="text-decoration:none"><img src="${esc(site)}/brand/logo.png" width="158" height="44" alt="${esc(brand.siteName)}" style="display:block;border:0;width:158px;height:44px"></a>
    </td></tr>
    <tr><td class="pad" style="padding:24px 40px 8px">
      <p style="margin:0 0 10px;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${C.brandDark}">${esc(c.eyebrow)}</p>
      <h1 style="margin:0;font-family:${HEAD};font-size:24px;line-height:1.3;font-weight:700;color:${C.ink}">${esc(c.heading)}</h1>
    </td></tr>
    ${(c.paragraphs ?? [])
      .map((p) => `<tr><td class="pad" style="padding:14px 40px 0;font-family:${BODY};font-size:16px;line-height:1.65;color:${C.text}">${br(p)}</td></tr>`)
      .join("\n    ")}
    ${
      rows.length
        ? `<tr><td class="pad" style="padding:22px 40px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:10px;border-collapse:separate;overflow:hidden">
        ${rows
          .map(
            ([k, v], i) => `<tr class="row">
          <td valign="top" width="34%" style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ""}background:#FAFBFA;font-family:${BODY};font-size:13px;font-weight:600;color:${C.muted}">${esc(k)}</td>
          <td valign="top" style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${BODY};font-size:15px;line-height:1.55;color:${C.text};word-break:break-word">${isEmail(v) ? `<a href="mailto:${esc(v)}" style="color:${C.brandDark}">${esc(v)}</a>` : br(v)}</td>
        </tr>`,
          )
          .join("")}
      </table>
    </td></tr>`
        : ""
    }
    ${
      c.buttons?.length
        ? `<tr><td class="pad" style="padding:26px 40px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${c.buttons.map(button).join("")}</tr></table></td></tr>`
        : ""
    }
    <tr><td style="padding:28px 0 0;font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td class="pad" style="background:${C.night};padding:28px 40px 30px;font-family:${BODY};font-size:13px;line-height:1.6;color:#C9CED6">
      <p style="margin:0 0 4px;font-family:${HEAD};font-size:15px;font-weight:700;color:#FFFFFF">${esc(brand.siteName)}</p>
      <p style="margin:0 0 14px;color:${C.brand};font-weight:600">${esc(brand.tagline)}</p>
      ${brand.addresses.map((a) => `<p style="margin:0 0 6px"><span style="color:#FFFFFF;font-weight:600">${esc(a.label)}:</span> ${esc(a.text)}</p>`).join("")}
      ${contactLine ? `<p style="margin:10px 0 0;color:#FFFFFF">${contactLine}</p>` : ""}
      ${
        brand.social.length
          ? `<p style="margin:14px 0 0">${brand.social.map((s) => `<a href="${esc(s.url)}" style="color:${C.brand};text-decoration:none;font-weight:600">${esc(s.label)}</a>`).join(" &nbsp;·&nbsp; ")}</p>`
          : ""
      }
      <p style="margin:16px 0 0;font-size:12px;color:#8C93A0">${esc(brand.copyright)} &nbsp;·&nbsp; <a href="${esc(site)}/" style="color:#8C93A0">${esc(host)}</a></p>
    </td></tr>
  </table>
  ${c.note ? `<p style="max-width:560px;margin:16px auto 0;font-family:${BODY};font-size:12px;line-height:1.5;color:${C.muted};text-align:center">${esc(c.note)}</p>` : ""}
</td></tr>
</table>
</body>
</html>`;
}
