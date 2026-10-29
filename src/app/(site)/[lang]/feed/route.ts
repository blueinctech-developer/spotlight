import { isLocale, localizePath, type Locale } from "@/lib/i18n";
import { siteUrl } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { tr } from "@/lib/settings-schema";
import { listPublishedPosts } from "@/lib/content/public";
import { htmlToText, truncate } from "@/lib/sanitize";

/**
 * RSS 2.0 feed of the latest posts, at the WordPress URLs /feed/ and /fr/feed/ so existing
 * feed readers and aggregators keep working after the move.
 */
export const revalidate = 300;

const xml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function GET(_req: Request, ctx: { params: Promise<{ lang: string }> }) {
  const { lang } = await ctx.params;
  if (!isLocale(lang)) return new Response("Not found", { status: 404 });
  const locale: Locale = lang;
  const base = siteUrl();
  const [general, seo, { posts }] = await Promise.all([
    getSetting("general"),
    getSetting("seo"),
    listPublishedPosts({ locale, perPage: 20 }),
  ]);
  const home = base + localizePath("", locale);
  const self = base + localizePath("feed", locale);
  const items = posts
    .map((p) => {
      const url = base + localizePath(p.slug, locale);
      const summary = p.excerpt?.trim() || truncate(htmlToText(p.content), 300);
      return [
        "<item>",
        `<title>${xml(p.title)}</title>`,
        `<link>${xml(url)}</link>`,
        `<guid isPermaLink="true">${xml(url)}</guid>`,
        p.publishedAt ? `<pubDate>${p.publishedAt.toUTCString()}</pubDate>` : "",
        p.authorDisplayName ? `<dc:creator>${xml(p.authorDisplayName)}</dc:creator>` : "",
        `<description>${xml(summary)}</description>`,
        "</item>",
      ].join("");
    })
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${xml(general.siteName)}</title>
<link>${xml(home)}</link>
<atom:link href="${xml(self)}" rel="self" type="application/rss+xml" />
<description>${xml(tr(seo.defaultDescription, locale) || tr(general.tagline, locale) || general.siteName)}</description>
<language>${locale === "fr" ? "fr-FR" : "en-US"}</language>
${items}
</channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
