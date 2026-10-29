import sanitizeHtml from "sanitize-html";

/**
 * Rich text is stored as HTML produced by the editor (or imported from WordPress)
 * and always passes through this allow-list on save and on render.
 * No scripts, event handlers, inline styles or iframes can survive.
 */
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
    "h2", "h3", "h4", "h5", "h6", "blockquote", "hr", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td", "span", "sup", "sub", "code", "pre",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "width", "height", "loading"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    span: ["class"],
    p: ["class"],
  },
  allowedClasses: {
    span: ["text-brand", "text-dark", "font-bold"],
    p: ["text-center", "text-right", "lead"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (out.target === "_blank") out.rel = "noopener noreferrer";
      else delete out.target;
      return { tagName, attribs: out };
    },
    b: "strong",
    i: "em",
  },
};

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, options).trim();
}

/** Plain text from HTML, for excerpts and meta descriptions. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : max).trimEnd() + "…";
}

/** Only allow safe link targets in structured fields (buttons, menu items). */
export function safeHref(href: string | null | undefined): string {
  const v = (href ?? "").trim();
  if (!v) return "#";
  if (v.startsWith("//") || v.startsWith("/\\")) return "#";
  if (v.startsWith("/") || v.startsWith("#")) return v;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  return "#";
}
