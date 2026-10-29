import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import sharp from "sharp";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { Block } from "@/lib/blocks/schema";
import { blockSchema } from "@/lib/blocks/schema";
import { sanitizeRichText } from "@/lib/sanitize";
import { mediaUrl } from "@/lib/media-url";

export const SITE = process.env.WP_SITE_URL ?? "https://spotlightnigeria-france.com";
export const CACHE = path.join(process.cwd(), "migration", "cache");
export type Lang = "en" | "fr";

// ───────── Report ─────────

export const report = {
  startedAt: new Date().toISOString(),
  created: {} as Record<string, number>,
  updated: {} as Record<string, number>,
  warnings: [] as string[],
  missingMedia: [] as string[],
  skipped: [] as string[],
};
export function count(kind: string, created: boolean) {
  const bucket = created ? report.created : report.updated;
  bucket[kind] = (bucket[kind] ?? 0) + 1;
}
export function warn(msg: string) {
  report.warnings.push(msg);
  console.warn("  ! " + msg);
}

// ───────── HTML ─────────

export function htmlPath(urlPath: string, lang: Lang = "en"): string {
  const p = (lang === "fr" ? `fr/${urlPath}` : urlPath).replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || "index";
  return path.join(CACHE, "html", p.replace(/\//g, "__") + ".html");
}

export function loadPage(urlPath: string, lang: Lang = "en"): CheerioAPI | null {
  const f = htmlPath(urlPath, lang);
  if (!fs.existsSync(f)) return null;
  return cheerio.load(fs.readFileSync(f, "utf8"));
}

export function readRest<T = Record<string, unknown>>(type: string): T[] {
  const f = path.join(CACHE, "rest", `${type}.json`);
  if (!fs.existsSync(f)) throw new Error(`Missing ${f}. Run "npm run migrate:fetch" first.`);
  return JSON.parse(fs.readFileSync(f, "utf8"));
}

export const clean = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim();

/** Widget wrapper by Elementor data-id. */
export function w($: CheerioAPI, id: string): Cheerio<Element> {
  return $(`[data-id="${id}"]`).first() as Cheerio<Element>;
}
export function wText($: CheerioAPI, id: string, sel?: string): string {
  const el = w($, id);
  return clean((sel ? el.find(sel).first() : el).text());
}
export function wHtml($: CheerioAPI, id: string, sel: string): string {
  const el = w($, id).find(sel).first();
  return sanitizeRichText(el.html() ?? "");
}

/** Is an Elementor element hidden on every device? */
export function hiddenEverywhere(el: Cheerio<AnyNode>): boolean {
  const cls = el.attr("class") ?? "";
  return ["desktop", "tablet", "mobile"].every((d) => cls.includes(`elementor-hidden-${d}`));
}

/** Background image of an Elementor element from its page CSS file. */
export function cssBackground(pageId: number | string, elementId: string): string | null {
  const dir = path.join(CACHE, "css");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const ordered = [`post-${pageId}.css`, ...files.filter((f) => f !== `post-${pageId}.css`)];
  for (const f of ordered) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    const css = fs.readFileSync(p, "utf8");
    const re = new RegExp(`elementor-element-${elementId}[^{]*\\{[^}]*background-image:url\\("?([^")]+)"?\\)`);
    const m = css.match(re);
    if (m) return m[1];
  }
  return null;
}

// ───────── Ids ─────────

export const newId = () => randomUUID().slice(0, 12);

export function block<T extends Block["type"]>(type: T, props: Record<string, unknown>): Block {
  const r = blockSchema.safeParse({ id: newId(), type, ...props });
  if (!r.success) throw new Error(`Invalid ${type} block: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  return r.data;
}

// ───────── Media ─────────

type WpMedia = { id: number; source_url: string; alt_text: string; title: { rendered: string }; caption?: { rendered: string }; mime_type: string };
let mediaIndex: Map<string, WpMedia> | null = null;
function wpMedia(): Map<string, WpMedia> {
  if (!mediaIndex) {
    mediaIndex = new Map();
    for (const m of readRest<WpMedia>("media")) mediaIndex.set(new URL(m.source_url).pathname, m);
  }
  return mediaIndex;
}

/**
 * Map any WordPress image URL (resized "-300x200", Elementor thumbs, protocol variants)
 * to the best available original.
 */
export function originalUrl(raw: string): string {
  let u = raw.trim().replace(/^http:\/\//, "https://");
  if (u.startsWith("/")) u = SITE + u;
  const url = new URL(u);
  // 2018 posts embed images from the old hosting IP (unreachable); the same files live on the current domain.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
    const i = url.pathname.indexOf("/wp-content/");
    if (i >= 0) return originalUrl(SITE + url.pathname.slice(i));
  }
  let p = decodeURIComponent(url.pathname);
  // Elementor thumbnails: /uploads/elementor/thumbs/<name>-<hash>.<ext>
  const thumb = p.match(/\/uploads\/elementor\/thumbs\/(.+)-[a-z0-9]{30,}\.(\w+)$/i);
  if (thumb) {
    const [, base, ext] = thumb;
    for (const key of wpMedia().keys()) {
      if (key.endsWith(`/${base}.${ext}`)) return SITE + key;
    }
    return url.href;
  }
  p = p.replace(/-\d{2,5}x\d{2,5}(\.\w+)$/, "$1").replace(/-scaled(\.\w+)$/, "$1");
  return SITE + p;
}

const mediaCache = new Map<string, string | null>();

/** Download a WordPress asset (once) into storage and the media library. Returns the media id. */
export async function importMedia(rawUrl: string | null | undefined, opts: { alt?: string; altFr?: string; title?: string } = {}): Promise<string | null> {
  if (!rawUrl || rawUrl.startsWith("data:")) return null;
  let src: string;
  try {
    src = originalUrl(rawUrl);
  } catch {
    return null;
  }
  if (!new URL(src).pathname.startsWith("/wp-content/uploads/")) return null;
  if (/\.(csv|xlsx?|sql|zip)$/i.test(src)) {
    warn(`Skipped non-media upload ${src}`);
    return null;
  }
  if (mediaCache.has(src)) return mediaCache.get(src)!;

  const existing = await db.mediaAsset.findUnique({ where: { legacyUrl: src } });
  if (existing) {
    if (opts.alt && !existing.alt) await db.mediaAsset.update({ where: { id: existing.id }, data: { alt: opts.alt } });
    mediaCache.set(src, existing.id);
    count("media", false);
    return existing.id;
  }

  let buf: Buffer | null = null;
  let finalUrl = src;
  for (const candidate of [src, rawUrl.startsWith("http") ? rawUrl.replace(/^http:/, "https:") : null].filter(Boolean) as string[]) {
    try {
      const res = await fetch(candidate, { headers: { "user-agent": "SpotlightMigration/1.0" } });
      if (res.ok) {
        buf = Buffer.from(await res.arrayBuffer());
        finalUrl = candidate;
        break;
      }
    } catch {
      /* try next */
    }
  }
  if (!buf) {
    report.missingMedia.push(src);
    mediaCache.set(src, null);
    return null;
  }

  const pathname = decodeURIComponent(new URL(finalUrl).pathname);
  const rel = pathname.replace(/^\/wp-content\/uploads\//, "");
  const ext = path.extname(rel).toLowerCase();
  const mimeType =
    { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".mp4": "video/mp4" }[ext] ??
    "application/octet-stream";
  const safeName = path.basename(rel).toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const storageKey = `uploads/${path.dirname(rel).replace(/[^0-9/]/g, "") || "misc"}/${safeName}`.replace(/\/+/g, "/");

  let width: number | null = null;
  let height: number | null = null;
  if (mimeType.startsWith("image/") && mimeType !== "image/svg+xml") {
    try {
      const meta = await sharp(buf).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      /* unreadable image: keep without dimensions */
    }
  }
  await storage().put(storageKey, buf, mimeType);
  const wp = wpMedia().get(pathname);
  const row = await db.mediaAsset.upsert({
    where: { storageKey },
    create: {
      storageKey,
      filename: path.basename(rel),
      mimeType,
      size: buf.length,
      width,
      height,
      title: wp ? clean(cheerio.load(wp.title.rendered).text()) : opts.title ?? null,
      alt: clean(wp?.alt_text) || opts.alt || "",
      altFr: opts.altFr ?? null,
      caption: wp?.caption ? clean(cheerio.load(wp.caption.rendered).text()) || null : null,
      sha256: createHash("sha256").update(buf).digest("hex"),
      legacyId: wp?.id ?? null,
      legacyUrl: src,
    },
    update: { legacyUrl: src },
  });
  mediaCache.set(src, row.id);
  count("media", true);
  return row.id;
}

export function imgSrc(el: Cheerio<AnyNode>): string | null {
  const img = el.is("img") ? el : el.find("img").first();
  if (!img.length) return null;
  const srcset = img.attr("srcset") || img.attr("data-srcset");
  // Prefer the largest srcset candidate, then data-src (lazy loading), then src.
  if (srcset) {
    const best = srcset
      .split(",")
      .map((s) => s.trim().split(/\s+/))
      .sort((a, b) => parseInt(b[1] ?? "0") - parseInt(a[1] ?? "0"))[0]?.[0];
    if (best) return best;
  }
  return img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || null;
}

/**
 * Other addresses the WordPress site has been reachable at (http, www, and the old hosting
 * mirror that older posts still link to). Links to them are links to the site itself.
 */
const SITE_ALIASES = [
  /^https?:\/\/(www\.)?spotlightnigeria-france\.com/i,
  /^https?:\/\/172\.104\.245\.184\/~friends1\/spotlightnigeria-france\.com/i,
];
/** Old internal paths that WordPress itself redirected; link straight to the target. */
const PATH_ALIASES: Record<string, string> = { "/new/sponsorship-registration/": "/sponsorship-registration/" };

/** Normalise a link that points at the old site (any alias) to SITE + path; others unchanged. */
export function toSiteUrl(href: string): string {
  const alias = (path: string) => {
    const withSlash = path.includes("?") || path.includes("#") || path.endsWith("/") ? path : `${path}/`;
    const fr = withSlash.startsWith("/fr/");
    const target = PATH_ALIASES[fr ? withSlash.slice(3) : withSlash];
    return target ? (fr ? `/fr${target}` : target) : null;
  };
  if (href.startsWith("/") && !href.startsWith("//")) {
    const target = alias(href);
    return target ? SITE + target : href;
  }
  for (const re of SITE_ALIASES) {
    if (re.test(href)) {
      const rest = href.replace(re, "") || "/";
      return SITE + (alias(rest) ?? rest);
    }
  }
  return href;
}

/** Make links to the old site (any alias) site-relative so they work on any domain. */
export function rewriteLinks(html: string): string {
  const $ = cheerio.load(html, null, false);
  $("a[href]").each((_, a) => {
    const href = toSiteUrl($(a).attr("href")!);
    if (href.startsWith(SITE) && !href.includes("/wp-content/")) $(a).attr("href", href.slice(SITE.length) || "/");
  });
  return $.html();
}

/** Rewrite <img> URLs inside imported HTML to migrated media. */
export async function migrateInlineImages(html: string): Promise<string> {
  const $ = cheerio.load(html, null, false);
  for (const el of $("img").toArray()) {
    const src = imgSrc($(el));
    const alt = $(el).attr("alt") ?? "";
    const id = src ? await importMedia(src, { alt }) : null;
    if (id) {
      const m = await db.mediaAsset.findUnique({ where: { id } });
      $(el).attr("src", mediaUrl(m!.storageKey)).removeAttr("srcset").removeAttr("sizes").removeAttr("class");
      if (m!.width) $(el).attr("width", String(m!.width));
      if (m!.height) $(el).attr("height", String(m!.height));
    } else {
      warn(`Inline image could not be migrated: ${src}`);
      $(el).remove();
    }
  }
  // Internal links: make relative so they work on any domain.
  return sanitizeRichText(rewriteLinks($.html()));
}

// ───────── Generic Elementor → blocks ─────────

/**
 * Converts the visible widgets of an Elementor document into blocks, in order.
 * Used for pages without a hand-written mapping (and reported as such).
 */
export async function genericBlocks($: CheerioAPI, root: Cheerio<Element>, label: string): Promise<Block[]> {
  // Sections with several visible columns keep their side-by-side layout as a columns block.
  const out: Block[] = [];
  for (const sec of root.children().toArray()) {
    const s = $(sec);
    if (hiddenEverywhere(s)) continue;
    const cols = s
      .find("> .elementor-container > .elementor-column, > .e-con-inner > .e-con, > .e-con")
      .toArray()
      .filter((c) => !hiddenEverywhere($(c)) && $(c).find(".elementor-widget").length > 0);
    if (cols.length >= 2 && cols.length <= 4) {
      const columns = [];
      for (const c of cols) columns.push({ blocks: await widgetBlocks($, $(c) as Cheerio<Element>, label) });
      out.push(block("columns", { ratio: cols.length === 2 ? "1-1" : cols.length === 3 ? "1-1-1" : "1-1-1-1", columns }));
    } else {
      out.push(...(await widgetBlocks($, s as Cheerio<Element>, label)));
    }
  }
  return out;
}

async function widgetBlocks($: CheerioAPI, root: Cheerio<Element>, label: string): Promise<Block[]> {
  const out: Block[] = [];
  const widgets = root.find(".elementor-widget").toArray();
  for (const node of widgets) {
    const el = $(node);
    if (el.parents().toArray().some((p) => hiddenEverywhere($(p))) || hiddenEverywhere(el)) continue;
    const type = (el.attr("data-widget_type") ?? "").split(".")[0];
    const c = el.find(".elementor-widget-container").first();
    c.find("style,script").remove();
    switch (type) {
      case "heading":
      case "jws_widget_heading": {
        const h = c.find("h1,h2,h3,h4,h5,h6").first();
        if (h.length) out.push(block("heading", { text: clean(h.text()), level: h.get(0)!.tagName, align: c.find(".center").length ? "center" : "left" }));
        const des = c.find(".des").first();
        if (des.length && clean(des.text())) out.push(block("richText", { html: await migrateInlineImages(des.html() ?? ""), align: c.find(".center").length ? "center" : "left" }));
        break;
      }
      case "text-editor":
        out.push(block("richText", { html: await migrateInlineImages(c.html() ?? "") }));
        break;
      case "image": {
        const src = imgSrc(c);
        const id = src ? await importMedia(src, { alt: c.find("img").attr("alt") }) : null;
        // Small images on the original (speaker portraits) become round avatars.
        const shownWidth = Number(c.find("img").attr("width") ?? 0);
        const caption = clean(c.find("figcaption").text());
        if (id) out.push(block("image", { image: id, size: shownWidth && shownWidth <= 200 ? "avatar" : "medium", caption }));
        break;
      }
      case "icon-list": {
        const items = c.find(".elementor-icon-list-text").toArray().map((x) => `<li>${$(x).html()}</li>`).join("");
        out.push(block("richText", { html: sanitizeRichText(`<ul>${items}</ul>`) }));
        break;
      }
      case "button":
      case "bloompixel-gradient-button": {
        const a = c.find("a").first();
        if (a.length) out.push(block("buttons", { items: [{ label: clean(a.text()), href: a.attr("href") ?? "", newTab: a.attr("target") === "_blank" }], align: "center" }));
        break;
      }
      case "spacer":
        out.push(block("spacer", { size: "md" }));
        break;
      case "divider":
        out.push(block("divider", {}));
        break;
      case "html": {
        const src = c.find("iframe").attr("src");
        if (src) out.push(block("embed", { url: src, title: label, height: Number(c.find("iframe").attr("height")) || 660 }));
        break;
      }
      default: {
        const text = clean(c.text());
        if (text) {
          out.push(block("richText", { html: await migrateInlineImages(c.html() ?? "") }));
          warn(`${label}: widget "${type}" converted to rich text`);
        }
      }
    }
  }
  return out;
}
