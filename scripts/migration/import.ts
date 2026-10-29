/**
 * Step 2 of the WordPress migration: import the cached site into the CMS database.
 *
 *   npm run migrate:import
 *
 * Safe to re-run: every record is matched on a stable legacy key (WordPress id, slug,
 * original URL) and updated in place, so nothing is duplicated. Pages that editors have
 * changed since the last import are skipped unless MIGRATE_OVERWRITE=1 is set.
 * Writes migration/report.json.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { db } from "@/lib/db";
import type { Block } from "@/lib/blocks/schema";
import { collectMediaIds } from "@/lib/blocks/schema";
import { sanitizeRichText } from "@/lib/sanitize";
import { saveSetting } from "@/lib/settings";
import {
  block, cssBackground, clean, count, genericBlocks, hiddenEverywhere, imgSrc, importMedia, loadPage, originalUrl,
  migrateInlineImages, readRest, report, rewriteLinks, SITE, toSiteUrl, w, warn, wHtml, wText, type Lang,
} from "./context";

const OVERWRITE = process.env.MIGRATE_OVERWRITE === "1";
const LANGS: Lang[] = ["en", "fr"];
const titleSuffix = / [-–] Spotlight (Nigeria|Nigéria)$/;

type PageSpec = {
  wpId: number;
  slug: string;
  header?: "light" | "dark";
  footer?: "default" | "seat";
  build: ($: CheerioAPI, lang: Lang, ctx: BuildCtx) => Promise<Block[]>;
};
type BuildCtx = { partnerIds: Map<string, string>; eventIds: Record<string, string>; themeTitle: string };

// ───────── Shared helpers ─────────

/** Title shown by the theme's inner title bar (Yoast title, e.g. "Gallery - Spotlight Nigeria"). */
function themeTitle($: CheerioAPI): string {
  const h1 = $(".jws-title-bar-wrap-inner h1, .jws_title_bar h1, .title-bar h1").first();
  if (h1.length) return clean(h1.text());
  return clean($("title").text()).replace(/ - Spotlight (Nigeria|Nigéria)$/, "") + " - Spotlight Nigeria";
}

function headingParts($: CheerioAPI, id: string) {
  const el = w($, id);
  return {
    eyebrow: clean(el.find(".subtitle").first().text()),
    title: clean(el.find("h1,h2,h3,h4,h5,h6").first().text()),
    des: sanitizeRichText(el.find(".des").first().html() ?? ""),
  };
}

function link($: CheerioAPI, id: string) {
  const a = w($, id).find("a").first();
  return { label: clean(a.text()), href: relHref(a.attr("href") ?? ""), newTab: a.attr("target") === "_blank" };
}

/** Absolute WordPress links → site-relative paths (keeps external links). */
function relHref(href: string): string {
  const h = toSiteUrl(href);
  if (h.startsWith(SITE)) {
    const p = h.slice(SITE.length) || "/";
    return p.includes(".") || p.endsWith("/") || p.includes("#") || p.includes("?") ? p : `${p}/`;
  }
  if (h.startsWith("/") && !h.endsWith("/") && !h.includes(".") && !h.includes("#")) return `${h}/`;
  return h;
}

async function galleryImages($: CheerioAPI, id: string) {
  const items = [];
  for (const item of w($, id).find(".jws_gallery_item").toArray()) {
    const it = $(item);
    const href = it.find("a").attr("href") ?? "";
    const src = /\.(jpe?g|png|gif|webp|svg)$/i.test(href) ? href : imgSrc(it);
    const alt = it.find("img").attr("alt") ?? "";
    const image = await importMedia(src, { alt });
    if (image) items.push({ image, title: clean(it.find(".title").text()), caption: clean(it.find(".description").text()) });
  }
  return items;
}

/** Partner logos from a gallery widget; partners are shared records keyed by logo file. */
async function partnerGroup($: CheerioAPI, galleryId: string, ctx: BuildCtx): Promise<string[]> {
  const ids: string[] = [];
  for (const item of w($, galleryId).find(".jws_gallery_item").toArray()) {
    const it = $(item);
    const href = it.find("a").attr("href") ?? "";
    const src = /\.(jpe?g|png|gif|webp|svg)$/i.test(href) ? href : imgSrc(it);
    if (!src) continue;
    const key = path.basename(new URL(src, SITE).pathname).replace(/-\d+x\d+(\.\w+)$/, "$1").toLowerCase();
    // Identity = the exact original logo file. Files that merely share a name
    // (e.g. 2024/03/5.png and 2024/03/5.jpg) are different partners.
    const fileKey = originalUrl(src);
    let pid = ctx.partnerIds.get(fileKey);
    if (!pid) {
      const alt = clean(it.find("img").attr("alt"));
      const logo = await importMedia(src, { alt });
      const existing = logo ? await db.partner.findFirst({ where: { logoId: logo } }) : null;
      if (existing) {
        count("partners", false);
        pid = existing.id;
      } else {
        const name =
          alt.replace(/\s*(logo|Logo)$/, "").trim() ||
          key.replace(/\.\w+$/, "").replace(/^copy-of-(copy-of-)?/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const base = key.replace(/\.\w+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "partner";
        let slug = base;
        for (let n = 2; await db.partner.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
        const row = await db.partner.create({ data: { slug, name, logoId: logo, order: ctx.partnerIds.size } });
        count("partners", true);
        pid = row.id;
      }
      ctx.partnerIds.set(fileKey, pid);
    }
    if (!ids.includes(pid)) ids.push(pid);
  }
  return ids;
}

function pageTitleBlock($: CheerioAPI, title: string, extra: Record<string, unknown> = {}) {
  return block("pageTitle", { title, variant: "plain", showBreadcrumb: true, ...extra });
}

// ───────── Page builders ─────────

const PAGES: PageSpec[] = [
  {
    wpId: 2,
    slug: "",
    async build($, lang, ctx) {
      const blocks: Block[] = [];
      const hero = headingParts($, "1d00589");
      const subtitle = clean(w($, "1d00589").find("h3").first().text());
      const fact = (id: string) => wText($, id, ".elementor-icon-box-title");
      blocks.push(block("hero", {
        eyebrow: hero.eyebrow,
        title: clean(w($, "1d00589").find("h1").first().text()),
        subtitle,
        facts: [
          { icon: "location", text: fact("1f57817") },
          { icon: "calendar", text: fact("a30ac85") },
          { icon: "quote", text: fact("bc21af3"), highlight: true },
        ],
        primary: link($, "1fb6568"),
        videoUrl: w($, "5801962").find("a").attr("href") ?? "",
        videoLabel: wText($, "46816ff", ".elementor-icon-box-title") || wText($, "46816ff"),
        image: await importMedia(cssBackground(2, "2f116bb") ?? imgSrc(w($, "2842132")), { alt: "Spotlight Nigeria networking" }),
      }));
      const intro = headingParts($, "5b7933a");
      blocks.push(block("introBand", { title: intro.title, body: intro.des, tone: "grey" }));

      const glanceTitle = w($, "057c9a7").find("h2").first();
      const accent = clean(glanceTitle.clone().find("b").remove().end().text());
      const glanceBody = headingParts($, "8375b60");
      const stats = ["e903370", "53a23a6", "693802a", "d8f597b", "f88bfc3"].map((id) => {
        const el = w($, id);
        return {
          value: Number(el.find(".elementor-counter-number").attr("data-to-value") ?? 0),
          suffix: clean(el.find(".elementor-counter-number-suffix").text()),
          label: clean(el.find(".elementor-counter-title").text()),
        };
      });
      blocks.push(block("glance", {
        title: clean(glanceTitle.text()),
        titleAccent: accent,
        images: [
          await importMedia(imgSrc(w($, "147cd7f"))),
          await importMedia(imgSrc(w($, "ebd600a"))),
          await importMedia(cssBackground(2, "a81a4f4")),
        ].filter(Boolean),
        videoUrl: w($, "1fefb52").find("a").attr("href") ?? "",
        body: glanceBody.des,
        stats,
      }));

      const sp = headingParts($, "001f634");
      blocks.push(block("splitCta", {
        image: await importMedia(cssBackground(2, "0c93938"), { alt: "Audience at Spotlight Nigeria" }),
        eyebrow: sp.eyebrow,
        title: sp.title,
        body: sanitizeRichText(rewriteLinks(cheerio.load(w($, "001f634").find(".des").first().html() ?? "", null, false).html().replace(/(<br>\s*)+$/g, ""))),
        button: { label: clean(w($, "001f634").find(".elementor-button-text").text()), href: "/sponsorship-registration/", newTab: false },
      }));

      // Hidden on the live site: retained as hidden blocks so nothing is lost.
      const coTitle = wText($, "b65aa1f", "h2");
      blocks.push(block("partners", {
        hidden: true,
        title: coTitle,
        groups: [
          { heading: "", partnerIds: await partnerGroup($, "256339d", ctx).catch(() => []) },
        ],
      }));

      const pt = headingParts($, "a68d5f1");
      blocks.push(block("partners", {
        title: pt.title,
        subtitle: clean(cheerio.load(pt.des).text()) || clean(w($, "a68d5f1").find(".subtitle,.des").text()),
        groups: [
          { heading: wText($, "0dc3d24", "h5,h2,h3"), partnerIds: await partnerGroup($, "34d55d0", ctx) },
          { heading: wText($, "494a5e5", "h5,h2,h3"), partnerIds: await partnerGroup($, "fbbf303", ctx) },
          { heading: wText($, "ecdb16e", "h5,h2,h3"), partnerIds: await partnerGroup($, "e9bd773", ctx) },
        ],
      }));
      blocks.push(block("partners", {
        hidden: true,
        title: "Retained from WordPress (hidden logo galleries)",
        groups: [
          { heading: "2024 sponsors", partnerIds: await partnerGroup($, "2dd05e2", ctx) },
          { heading: "2023 sponsors", partnerIds: await partnerGroup($, "85e8cd4", ctx) },
          { heading: "Partners (alternate set)", partnerIds: await partnerGroup($, "e8f6195", ctx) },
          { heading: "Media partners (alternate set)", partnerIds: await partnerGroup($, "5664049", ctx) },
        ],
      }));

      blocks.push(block("highlights", { items: await galleryImages($, "45e7d81") }));
      blocks.push(block("testimonials", { title: wText($, "a83645e", "h2") }));
      blocks.push(block("schedule", { hidden: true, title: wText($, "e2c8892", "h2"), eventId: ctx.eventIds["2023"] ?? null }));
      return blocks;
    },
  },
  {
    wpId: 27,
    slug: "about",
    footer: "seat",
    async build($, lang) {
      const fs1 = headingParts($, "7f21c34");
      const fact = (id: string) => ({ label: wText($, id, ".menu-list-title"), text: wText($, id, ".elementor-icon-list-text") });
      const tabEl = w($, "5b43bb9");
      const tabs = [];
      const navs = tabEl.find(".tab_nav a").toArray();
      for (const a of navs) {
        const id = $(a).attr("data-tab");
        const panel = tabEl.find(`#${id}`);
        const src = imgSrc(panel);
        const body = panel.find(".content_text").clone();
        body.find("img").remove();
        tabs.push({ label: clean($(a).text()), body: sanitizeRichText(body.html() ?? "").replace(/<p>\s*<\/p>/g, ""), image: await importMedia(src) });
      }
      const reasons = headingParts($, "8840db8");
      return [
        block("heading", { text: wText($, "90a2256", "h1"), level: "h1", align: "center", tone: "brand" }),
        block("featureSplit", {
          title: fs1.title,
          body: fs1.des,
          facts: [fact("b604334"), fact("e66738a")],
          images: [await importMedia(imgSrc(w($, "eb0216c"))), await importMedia(imgSrc(w($, "6347025"))), await importMedia(imgSrc(w($, "8bf6ea6")))].filter(Boolean),
          imageSide: "right",
        }),
        block("tabs", { title: reasons.title, intro: reasons.des, items: tabs }),
        block("organizer", {
          title: wText($, "cd6ec47", "h2"),
          logo: await importMedia(imgSrc(w($, "288db6e")), { alt: "Friends of Nigeria (FON) Europe" }),
          body: await migrateInlineImages(w($, "079df7d").find(".elementor-widget-container").html() ?? ""),
        }),
      ];
    },
  },
  {
    wpId: 11439,
    slug: "programme",
    async build($, _lang, ctx) {
      return [
        block("pageTitle", {
          title: wText($, "132d749d", "h1"),
          subtitle: wText($, "69a2f47f", "h3"),
          variant: "image",
          showBreadcrumb: false,
          background: await importMedia(cssBackground(11439, "ff5f441")),
        }),
        block("schedule", { eventId: ctx.eventIds["2026"] ?? null }),
        block("spacer", { size: "xl" }),
      ];
    },
  },
  {
    wpId: 5082,
    slug: "registration",
    header: "dark",
    async build($) {
      const top = headingParts($, "99d4fdb");
      const card = (id: string, href: string, highlight: boolean) => ({
        title: wText($, id, ".jws-price-table__heading"),
        features: w($, id).find(".jws-price-table__features-list li").toArray().map((li) => clean($(li).text())),
        button: { label: clean(w($, id).find("a").last().text()), href, newTab: true },
        highlight,
      });
      const european = w($, "6a6237f").find("a").last().attr("href") ?? "";
      const african = $("iframe[src*='docs.google.com']").first().attr("src") ?? "#";
      const help = headingParts($, "17ce51a");
      const contacts = w($, "14de8c2").find(".elementor-icon-list-item").toArray().map((li, i) => ({
        icon: i === 0 ? "phone" : "email",
        text: clean($(li).text()),
        href: i === 0 ? "tel:+33620578844" : "mailto:contact@friendsofnigeria.net",
      }));
      return [
        block("pageTitle", { title: top.title, subtitle: clean(cheerio.load(top.des).text()), variant: "dark", showBreadcrumb: false }),
        block("pricing", {
          items: [card("6a6237f", european.replace(/\?_gl=.*$/, ""), false), card("57f9f68", african.replace("?embedded=true", ""), true)],
          helpTitle: help.title,
          helpText: help.des,
          helpContacts: contacts,
        }),
      ];
    },
  },
  {
    wpId: 4851,
    slug: "get-in-touch",
    async build($, _l, ctx) {
      const card = (id: string, icon: string) => ({
        icon,
        title: wText($, id, ".elementor-icon-box-title"),
        text: wText($, id, ".elementor-icon-box-description"),
        href: icon === "email" ? "mailto:contact@friendsofnigeria.net" : icon === "phone" ? "tel:+33620578844" : "",
      });
      const drop = headingParts($, "a3ec5d1");
      return [
        pageTitleBlock($, ctx.themeTitle),
        block("infoCards", { items: [card("cc73717", "location"), card("d182c20", "location"), card("08124a7", "phone"), card("d5a4970", "email")] }),
        block("form", { form: "contact", title: drop.title, intro: drop.des }),
      ];
    },
  },
  {
    wpId: 10682,
    slug: "previous-editions",
    async build($, _l, ctx) {
      return [
        pageTitleBlock($, ctx.themeTitle),
        block("image", { image: await importMedia(imgSrc(w($, "b96156f"))), size: "medium" }),
        block("heading", { text: wText($, "f150970", "h4"), level: "h4", align: "center" }),
        block("form", { form: "report-download" }),
      ];
    },
  },
  {
    wpId: 10527,
    slug: "sponsorship-registration",
    header: "dark",
    async build($) {
      const f = headingParts($, "9102416");
      const more = headingParts($, "6912ee5");
      const contacts = w($, "546f655").find(".elementor-icon-list-item a").toArray()
        .map((a) => `<li><a href="${$(a).attr("href")}">${clean($(a).text())}</a></li>`).join("");
      return [
        block("pageTitle", { title: wText($, "f639570", "h1"), variant: "dark", showBreadcrumb: false }),
        block("form", { form: "sponsorship", title: f.title, intro: f.des }),
        block("contactAside", { title: more.title, text: sanitizeRichText(`${more.des}<ul>${contacts}</ul>`), showSocial: false }),
        block("contactAside", { title: wText($, "b867117", "h4"), showSocial: true }),
      ];
    },
  },
  {
    wpId: 10681,
    slug: "press-registration",
    async build($, _l, ctx) {
      const iframe = w($, "96cde0e").find("iframe");
      return [
        pageTitleBlock($, ctx.themeTitle),
        block("form", { hidden: true, form: "press", closed: true, closedMessage: wText($, "4a9c88c") }),
        block("embed", { url: iframe.attr("src") ?? "", title: ctx.themeTitle, height: Number(iframe.attr("height")) || 660 }),
      ];
    },
  },
  {
    wpId: 5458,
    slug: "press-releases",
    async build($, _l, ctx) {
      return [pageTitleBlock($, ctx.themeTitle), block("postList", { perPage: 12 })];
    },
  },
  {
    wpId: 4429,
    slug: "gallery",
    async build($, _l, ctx) {
      return [
        pageTitleBlock($, ctx.themeTitle),
        block("gallery", { images: await galleryImages($, "e9c8094"), layout: "mosaic", columns: 4 }),
        block("heading", { text: wText($, "806e9b0", "h3"), level: "h3", align: "center", tone: "brand" }),
        block("buttons", { items: [{ ...link($, "6015a5b"), newTab: true }], align: "center" }),
      ];
    },
  },
  {
    wpId: 3,
    slug: "privacy-policy",
    async build($, lang, ctx) {
      let html = $(".entry_content .content, .entry-content").first().html();
      if (!html) {
        const rest = readRest<{ id: number; content: { rendered: string } }>("pages").find((p) => p.id === 3);
        html = rest?.content.rendered ?? "";
        if (lang === "fr") warn("privacy-policy: French body not found in HTML; English used");
      }
      return [pageTitleBlock($, ctx.themeTitle), block("richText", { html: await migrateInlineImages(html), width: "narrow" })];
    },
  },
  {
    wpId: 11292,
    slug: "2023-programme2",
    async build($) {
      const doc = $('[data-elementor-id="11292"]').first();
      const firstHeading = doc.find("h1,h2").first();
      const firstSection = doc.children().first();
      const bg = cssBackground(11292, firstSection.attr("data-id") ?? "");
      const titleText = clean(firstHeading.text());
      firstHeading.closest(".elementor-widget").remove();
      return [
        block("pageTitle", { title: titleText, variant: "image", showBreadcrumb: false, background: await importMedia(bg) }),
        ...(await genericBlocks($, doc, "2023-programme2")),
      ];
    },
  },
];

// ───────── Taxonomies & posts ─────────

type WpTerm = { id: number; slug: string; name: string; description: string };
type WpPost = {
  id: number; slug: string; date_gmt: string; modified_gmt: string; title: { rendered: string }; content: { rendered: string };
  excerpt: { rendered: string }; featured_media: number; categories: number[]; tags: number[];
  yoast_head_json?: { title?: string; description?: string; og_title?: string; og_description?: string };
};
type WpMediaRow = { id: number; source_url: string; alt_text: string };

function frTermName(kind: "category" | "tag", slug: string): string | null {
  const $ = loadPage(`${kind}/${slug}`, "fr");
  if (!$) return null;
  const t = clean($("h1").first().text()).replace(titleSuffix, "");
  return t || null;
}

async function importTaxonomies() {
  const cats = readRest<WpTerm>("categories");
  const tags = readRest<WpTerm>("tags");
  const catMap = new Map<number, string>();
  const tagMap = new Map<number, string>();
  for (const c of cats) {
    if (c.slug === "uncategorized") continue;
    const name = cheerio.load(c.name).text();
    const existing = await db.category.findUnique({ where: { legacyId: c.id } });
    const row = await db.category.upsert({
      where: { legacyId: c.id },
      create: { legacyId: c.id, slug: c.slug, name, nameFr: frTermName("category", c.slug), description: c.description || null },
      update: { slug: c.slug, name },
    });
    count("categories", !existing);
    catMap.set(c.id, row.id);
  }
  for (const t of tags) {
    const name = cheerio.load(t.name).text();
    const existing = await db.tag.findUnique({ where: { legacyId: t.id } });
    const row = await db.tag.upsert({
      where: { legacyId: t.id },
      create: { legacyId: t.id, slug: t.slug, name, nameFr: frTermName("tag", t.slug) },
      update: { slug: t.slug, name },
    });
    count("tags", !existing);
    tagMap.set(t.id, row.id);
  }
  return { catMap, tagMap };
}

async function importPosts(maps: { catMap: Map<number, string>; tagMap: Map<number, string> }) {
  const posts = readRest<WpPost>("posts");
  const media = new Map(readRest<WpMediaRow>("media").map((m) => [m.id, m]));
  for (const p of posts) {
    const group = `wp-post-${p.id}`;
    let featured: string | null = null;
    if (p.featured_media) {
      const m = media.get(p.featured_media);
      featured = m ? await importMedia(m.source_url, { alt: m.alt_text }) : null;
      if (!m) warn(`post ${p.slug}: featured media ${p.featured_media} not in public media list`);
    }
    for (const lang of LANGS) {
      let title = cheerio.load(p.title.rendered).text();
      let content = p.content.rendered;
      if (lang === "fr") {
        const $ = loadPage(p.slug, "fr");
        const body = $?.(".entry_content .content").first().html();
        if (!$ || !body) {
          warn(`post ${p.slug}: no French version found; skipped FR`);
          continue;
        }
        title = clean($("h1").first().text()).replace(titleSuffix, "") || title;
        content = body;
      }
      const html = await migrateInlineImages(content);
      const existing = await db.post.findUnique({ where: { translationGroup_locale: { translationGroup: group, locale: lang } } });
      if (existing && !OVERWRITE && (await editedInCms("POST", existing.id))) {
        report.skipped.push(`post ${lang}/${p.slug} (edited in CMS)`);
        continue;
      }
      const data = {
        title,
        slug: p.slug,
        content: html,
        excerpt: lang === "en" ? clean(cheerio.load(p.excerpt.rendered).text()).replace(/\s*\[…\]$/, "") || null : null,
        featuredImageId: featured,
        status: "PUBLISHED" as const,
        publishedAt: new Date(p.date_gmt + "Z"),
        authorDisplayName: "Spotlight Nigeria Press Team",
        seoDescription: lang === "en" ? p.yoast_head_json?.description ?? null : null,
        legacyId: p.id,
        legacyUrl: `${SITE}${lang === "fr" ? "/fr" : ""}/${p.slug}/`,
      };
      const row = existing
        ? await db.post.update({ where: { id: existing.id }, data })
        : await db.post.create({ data: { ...data, translationGroup: group, locale: lang } });
      await db.postCategory.deleteMany({ where: { postId: row.id } });
      await db.postTag.deleteMany({ where: { postId: row.id } });
      const catIds = p.categories.map((c) => maps.catMap.get(c)).filter((x): x is string => !!x);
      const tagIds = p.tags.map((t) => maps.tagMap.get(t)).filter((x): x is string => !!x);
      if (catIds.length) await db.postCategory.createMany({ data: catIds.map((categoryId) => ({ postId: row.id, categoryId })) });
      if (tagIds.length) await db.postTag.createMany({ data: tagIds.map((tagId) => ({ postId: row.id, tagId })) });
      await recordUsage("POST", row.id, `Post: ${title}`, [featured, ...extractMediaIdsFromHtml(html)]);
      count("posts", !existing);
    }
  }
}

/** A record counts as edited in the CMS once an editor has saved it (saves create revisions). */
async function editedInCms(entityType: "PAGE" | "POST", entityId: string) {
  return (await db.revision.count({ where: { entityType, entityId, authorId: { not: null } } })) > 0;
}

const mediaKeyCache = new Map<string, string>();
function extractMediaIdsFromHtml(html: string): string[] {
  return [...html.matchAll(/\/media\/([^"'\s)]+)/g)].map((m) => mediaKeyCache.get(m[1]) ?? m[1]);
}

async function recordUsage(entityType: "PAGE" | "POST", entityId: string, label: string, ids: (string | null)[]) {
  // Inline images are referenced by storage key; resolve them to ids.
  const keys = ids.filter((x): x is string => !!x && x.includes("/"));
  const direct = ids.filter((x): x is string => !!x && !x.includes("/"));
  const byKey = keys.length ? await db.mediaAsset.findMany({ where: { storageKey: { in: keys } }, select: { id: true } }) : [];
  const all = [...new Set([...direct, ...byKey.map((m) => m.id)])];
  await db.mediaUsage.deleteMany({ where: { entityType, entityId } });
  if (all.length) await db.mediaUsage.createMany({ data: all.map((mediaId) => ({ mediaId, entityType, entityId, label })), skipDuplicates: true });
}

// ───────── Speakers ─────────

const DEMO_SPEAKERS = new Set(["ralph-edwards", "ralph-edwards-2"]);

async function importSpeakers() {
  const cards = new Map<string, { job: string; photo: string | null; order: number }>();
  let order = 0;
  for (const p of ["speakers", "speakers/page/2", "speakers/page/3"]) {
    const $ = loadPage(p);
    if (!$) continue;
    $(".jws_speaker_inner").each((_, el) => {
      const a = $(el).find(".speaker_title a").attr("href") ?? "";
      const slug = a.split("/speakers/")[1]?.replace(/\/$/, "");
      if (!slug || DEMO_SPEAKERS.has(slug)) return;
      cards.set(slug, { job: clean($(el).find(".speaker_job").text()), photo: imgSrc($(el).find(".jws_speaker_image")), order: order++ });
    });
  }
  const ids: Record<string, string> = {};
  for (const [slug, card] of cards) {
    const $ = loadPage(`speakers/${slug}`);
    const $fr = loadPage(`speakers/${slug}`, "fr");
    const name = $ ? clean($("h1").first().text()) : slug;
    const frCard = $fr ? clean($fr(".speaker_job, .job").first().text()) : "";
    const photo = await importMedia(card.photo, { alt: name });
    const existing = await db.speaker.findUnique({ where: { slug } });
    const row = await db.speaker.upsert({
      where: { slug },
      create: { slug, name, jobTitle: card.job || null, jobTitleFr: frCard && frCard !== card.job ? frCard : null, photoId: photo, order: card.order, legacyUrl: `${SITE}/speakers/${slug}/` },
      update: { name, photoId: photo ?? undefined },
    });
    count("speakers", !existing);
    ids[name.toLowerCase()] = row.id;
    ids[slug] = row.id;
  }
  return ids;
}

// ───────── Testimonials ─────────

async function importTestimonials() {
  const $ = loadPage("/");
  const $fr = loadPage("/", "fr");
  if (!$) return;
  const items = w($, "c38204e").find(".jws_testimonial_item").toArray();
  const frItems = $fr ? w($fr, "c38204e").find(".jws_testimonial_item").toArray() : [];
  for (const [i, el] of items.entries()) {
    const it = $(el);
    const name = clean(it.find(".testimonials_title").text());
    const fr = frItems[i] ? $fr!(frItems[i]) : null;
    const data = {
      quote: clean(it.find(".testimonials-description").text()),
      quoteFr: fr ? clean(fr.find(".testimonials-description").text()) || null : null,
      role: clean(it.find(".testimonials_job").text()) || null,
      roleFr: fr ? clean(fr.find(".testimonials_job").text()) || null : null,
      photoId: await importMedia(imgSrc(it.find(".footer_testimonial")), { alt: name }),
      logoId: await importMedia(imgSrc(it.find(".testimonials_icon")), { alt: `${name} company logo` }),
      order: i,
    };
    const existing = await db.testimonial.findFirst({ where: { name } });
    if (existing) await db.testimonial.update({ where: { id: existing.id }, data });
    else await db.testimonial.create({ data: { name, ...data } });
    count("testimonials", !existing);
  }
}

// ───────── Events ─────────

async function importEvents(speakerIds: Record<string, string>) {
  const ids: Record<string, string> = {};
  // Current edition (from the home page hero and the About page).
  const current = await db.event.upsert({
    where: { slug: "spotlight-nigeria-2026" },
    create: {
      slug: "spotlight-nigeria-2026", title: "Spotlight Nigeria 2026", titleFr: "Spotlight Nigéria 2026", edition: 9, year: 2026,
      startsAt: new Date("2026-10-06T08:00:00+02:00"), venueName: "L'Hôtel de l'Industrie",
      venueAddress: "4 Place Saint Germain des Prés, 75006 Paris", theme: "Translating opportunities to business deals",
      registrationUrl: "https://my.weezevent.com/spotlight-nigeria-business-forum-2026", status: "PUBLISHED", isCurrent: true,
    },
    update: {},
  });
  ids["2026"] = current.id;

  // 2023 edition: sessions from the (hidden) schedule widget on the home page.
  const ev2023 = await db.event.upsert({
    where: { slug: "spotlight-nigeria-2023" },
    create: {
      slug: "spotlight-nigeria-2023", title: "Spotlight Nigeria 2023", titleFr: "Spotlight Nigéria 2023", edition: 6, year: 2023,
      startsAt: new Date("2023-03-04T08:00:00+01:00"), venueName: "L'Hôtel de l'Industrie",
      venueAddress: "4 Place Saint Germain des Prés, 75006 Paris", status: "ARCHIVED",
    },
    update: {},
  });
  ids["2023"] = ev2023.id;
  const $ = loadPage("/");
  const $fr = loadPage("/", "fr");
  const existingSessions = await db.eventSession.count({ where: { eventId: ev2023.id } });
  if ($ && existingSessions === 0) {
    const items = w($, "d4a115f").find(".schedule_item").toArray();
    const frItems = $fr ? w($fr, "d4a115f").find(".schedule_item").toArray() : [];
    for (const [i, el] of items.entries()) {
      const it = $(el);
      const fr = frItems[i] ? $fr!(frItems[i]) : null;
      const time = clean(it.find(".time").text());
      const [start, end] = time.split(/\s*-\s*/);
      const title = clean(it.find(".schedule_content h4").text());
      const kind = /breakfast|lunch|networking|coffee/i.test(title) ? "break" : "session";
      const session = await db.eventSession.create({
        data: {
          eventId: ev2023.id, day: 1, order: i, title, kind,
          titleFr: fr ? clean(fr.find(".schedule_content h4").text()) || null : null,
          description: sanitizeRichText((it.find(".decription").html() ?? "").replace(/●/g, "<br>●").replace(/^<br>/, "")) || null,
          descriptionFr: fr ? sanitizeRichText((fr.find(".decription").html() ?? "").replace(/●/g, "<br>●").replace(/^<br>/, "")) || null : null,
          startTime: start || null, endTime: end || null,
        },
      });
      const speakerName = clean(it.find(".name_speaker").text()).toLowerCase();
      const spHref = it.find(".name_speaker a").attr("href") ?? "";
      const spSlug = spHref.split("/speakers/")[1]?.replace(/\/$/, "");
      const spId = (spSlug && speakerIds[spSlug]) || speakerIds[speakerName];
      if (spId) await db.sessionSpeaker.create({ data: { sessionId: session.id, speakerId: spId, role: "SPEAKER" } });
      count("sessions", true);
    }
  }

  // Link every speaker named in a 2023 session (the theme listed panellists in the description).
  const allSpeakers = await db.speaker.findMany({ select: { id: true, name: true } });
  for (const s of await db.eventSession.findMany({ where: { eventId: ev2023.id } })) {
    const text = `${s.title} ${s.description ?? ""}`.toLowerCase();
    const matches = allSpeakers.filter((sp) => {
      const n = sp.name.toLowerCase().replace(/^(dr|hon|amb)\.?\s+/, "").split(",")[0].trim();
      return n.length > 4 && text.includes(n);
    });
    if (matches.length) {
      await db.sessionSpeaker.createMany({
        data: matches.map((m, i) => ({ sessionId: s.id, speakerId: m.id, role: "PANELIST" as const, order: i + 1 })),
        skipDuplicates: true,
      });
    }
  }

  // Unpublished agenda found hidden on /programme/ — kept as a draft for the editors.
  const draft = await db.event.upsert({
    where: { slug: "programme-draft-from-wordpress" },
    create: {
      slug: "programme-draft-from-wordpress", title: "Programme agenda (hidden on WordPress)", year: 2026, status: "DRAFT",
      description: "This agenda was present but hidden on the WordPress /programme/ page. Review before publishing.",
    },
    update: {},
  });
  const $p = loadPage("programme");
  if ($p && (await db.eventSession.count({ where: { eventId: draft.id } })) === 0) {
    const doc = $p('[data-elementor-id="11439"]').first();
    let order = 0;
    for (const sec of doc.children(".elementor-top-section").toArray()) {
      const s = $p(sec);
      if (!hiddenEverywhere(s)) continue;
      const heads = s.find("h4").toArray().map((h) => clean($p(h).text())).filter(Boolean);
      if (!heads.length) continue;
      const m = heads[0].match(/^\(([^)]+)\)\s*(.*)$/);
      const [start, end] = (m?.[1] ?? "").split(/\s*-\s*/);
      const people = s.find("h5,h6,.elementor-button-text").toArray().map((h) => clean($p(h).text())).filter(Boolean);
      await db.eventSession.create({
        data: {
          eventId: draft.id, order: order++, title: m?.[2] || heads[0], startTime: start?.trim() || null, endTime: end?.trim() || null,
          theme: heads.find((h) => /^theme/i.test(h))?.replace(/^theme\s*:\s*/i, "") ?? null,
          description: people.length ? sanitizeRichText(`<ul>${[...new Set(people)].map((p) => `<li>${p}</li>`).join("")}</ul>`) : null,
          kind: /breakfast|lunch|break|networking|coffee/i.test(heads[0]) ? "break" : "session",
        },
      });
      count("draft sessions", true);
    }
  }
  return ids;
}

// ───────── Pages ─────────

async function importPages(ctx: Omit<BuildCtx, "themeTitle">) {
  const restPages = readRest<{ id: number; slug: string; date_gmt: string; title: { rendered: string }; yoast_head_json?: { title?: string; description?: string } }>("pages");
  for (const spec of PAGES) {
    const rest = restPages.find((p) => p.id === spec.wpId);
    for (const lang of LANGS) {
      const $ = loadPage(spec.slug || "/", lang);
      if (!$) {
        warn(`page ${lang}/${spec.slug}: HTML not cached`);
        continue;
      }
      const group = `wp-page-${spec.wpId}`;
      const existing = await db.page.findUnique({ where: { translationGroup_locale: { translationGroup: group, locale: lang } } });
      if (existing && !OVERWRITE && (await editedInCms("PAGE", existing.id))) {
        report.skipped.push(`page ${lang}/${spec.slug || "home"} (edited in CMS)`);
        continue;
      }
      const tt = themeTitle($);
      const blocks = await spec.build($, lang, { ...ctx, themeTitle: tt });
      const title = lang === "en" ? cheerio.load(rest?.title.rendered ?? spec.slug).text() : clean($("title").text()).replace(titleSuffix, "").replace(titleSuffix, "");
      const yoast = rest?.yoast_head_json;
      const desc = clean($('meta[name="description"]').attr("content")) || (lang === "en" ? yoast?.description : "") || null;
      const data = {
        title: spec.slug === "" ? (lang === "fr" ? "Accueil" : "Home") : title,
        slug: spec.slug,
        path: spec.slug,
        blocks: blocks as object[],
        status: "PUBLISHED" as const,
        publishedAt: rest ? new Date(rest.date_gmt + "Z") : new Date(),
        seoTitle: clean($("title").text()) || null,
        seoDescription: desc,
        headerVariant: spec.header ?? "light",
        footerVariant: spec.footer ?? "default",
        legacyId: spec.wpId,
        legacyUrl: `${SITE}${lang === "fr" ? "/fr" : ""}/${spec.slug ? spec.slug + "/" : ""}`,
      };
      const row = existing
        ? await db.page.update({ where: { id: existing.id }, data })
        : await db.page.create({ data: { ...data, translationGroup: group, locale: lang } });
      await recordUsage("PAGE", row.id, `Page: ${data.title} (${lang.toUpperCase()})`, collectMediaIds(blocks));
      count("pages", !existing);
      console.log(`  page ${lang}/${spec.slug || "(home)"}: ${blocks.length} blocks`);
    }
  }
}

// ───────── Menus & settings ─────────

async function importMenus() {
  for (const lang of LANGS) {
    const $ = loadPage("/", lang);
    if (!$) continue;
    const groups = await db.page.findMany({ where: { locale: lang }, select: { path: true, translationGroup: true } });
    const groupFor = (href: string) => {
      const p = relHref(href).replace(/^\/fr\//, "/").replace(/^\/|\/$/g, "");
      return href.startsWith("http") && !href.includes("spotlightnigeria-france.com") ? null : groups.find((g) => g.path === p)?.translationGroup ?? null;
    };
    type Item = { label: string; href: string; children: Item[] };
    const nav = $(".jws_main_menu").first().find("ul").first();
    const walk = (ul: ReturnType<typeof $>): Item[] =>
      ul.children("li").toArray().map((li) => {
        const a = $(li).children("a").first();
        return { label: clean(a.text()), href: a.attr("href") ?? "#", children: walk($(li).children("ul").first()) };
      });
    const header = walk(nav);

    const footerCols = ["7278d39", "39ab399", "1ccd625", "f4a91ad"].map((id) => {
      const el = w($, id);
      return {
        name: clean(el.find(".menu-list-title").text()),
        items: el.find("li a").toArray().map((a) => ({ label: clean($(a).text()), href: $(a).attr("href") ?? "#", children: [] as Item[] })),
      };
    });

    const save = async (location: string, name: string, items: Item[]) => {
      const already = await db.menu.findUnique({ where: { location_locale: { location, locale: lang } }, include: { _count: { select: { items: true } } } });
      if (already && already._count.items > 0 && !OVERWRITE) {
        report.skipped.push(`menu ${lang}/${location} (already configured)`);
        return;
      }
      const menu = await db.menu.upsert({ where: { location_locale: { location, locale: lang } }, create: { location, locale: lang, name }, update: { name } });
      await db.menuItem.deleteMany({ where: { menuId: menu.id } });
      const create = async (list: Item[], parentId: string | null) => {
        for (const [i, it] of list.entries()) {
          let href = it.href === "#" ? "#" : relHref(it.href);
          if (it.label.match(/^(Sitemap|Plan du site)$/)) href = "/sitemap.xml";
          const group = href !== "#" && href.startsWith("/") && !href.endsWith(".xml") ? groupFor(it.href) : null;
          const row = await db.menuItem.create({
            data: { menuId: menu.id, parentId, label: it.label, order: i, url: group ? null : href, pageGroup: group, openInNewTab: /^https?:/.test(href) },
          });
          await create(it.children, row.id);
        }
      };
      await create(items, null);
      count("menus", true);
    };
    await save("header", lang === "fr" ? "Menu principal" : "Main menu", header);
    await save("footer-1", footerCols[0].name, footerCols[0].items);
    await save("footer-2", footerCols[1].name, footerCols[1].items);
    await save("footer-3", footerCols[2].name, footerCols[2].items);
    await save("footer-legal", lang === "fr" ? "Liens légaux" : "Legal links", footerCols[3].items);
  }
}

async function importSettings() {
  const en = loadPage("/")!;
  const fr = loadPage("/", "fr")!;
  const pair = (fn: ($: CheerioAPI) => string) => ({ en: fn(en), fr: fn(fr) });
  const aboutEn = loadPage("about");
  const aboutFr = loadPage("about", "fr");
  const seatTitle = ($: CheerioAPI | null) => ($ ? clean($('h2:contains("seat"), h2:contains("place")').first().text()) : "");
  const credit = clean(w(en, "3de6d4d").text());
  const creditFr = clean(w(fr, "3de6d4d").text());
  const existing = await db.setting.count();
  if (existing && !OVERWRITE) {
    report.skipped.push("settings (already configured)");
    return;
  }
  await saveSetting("general", {
    siteName: "Spotlight Nigeria",
    tagline: { en: "Business and Investment Forum", fr: "Forum d'affaires et d'investissement" },
    copyright: { en: credit.split(" Designs by")[0], fr: creditFr.split(" Dessins de")[0] },
    creditPrefix: { en: "Designs by", fr: "Dessins de" },
    creditLabel: "Blueinc",
    creditUrl: w(en, "3de6d4d").find("a").attr("href") ?? "",
    // The old site's "Developed and Maintained by Blueinc_Technologies" line was removed at the
    // owner's request (29 Oct 2026); the field stays available in Settings → General.
    bottomNote: { en: "", fr: "" },
  });
  const regHeader = loadPage("registration");
  const regHeaderFr = loadPage("registration", "fr");
  await saveSetting("header", {
    ctaLabel: pair(($) => clean($("header .elementor-button-text").first().text())),
    ctaHref: "/registration/",
    darkCtaLabel: { en: regHeader ? clean(regHeader("header .elementor-button-text").first().text()) : "Register as Sponsor", fr: regHeaderFr ? clean(regHeaderFr("header .elementor-button-text").first().text()) : "" },
    darkCtaHref: "/sponsorship-registration/",
  });
  await saveSetting("footerCta", {
    enabled: true,
    eyebrow: pair(($) => clean(w($, "3f150b0").find(".subtitle").text())),
    title: pair(($) => clean(w($, "3f150b0").find("h2,h3").first().text())),
    buttonLabel: pair(($) => clean(w($, "c7027e6").text())),
    buttonHref: "/registration/",
  });
  await saveSetting("footerSeat", {
    title: { en: seatTitle(aboutEn), fr: seatTitle(aboutFr) },
    buttonLabel: { en: "Register", fr: "S'inscrire" },
    buttonHref: "/registration/",
    newsletterEyebrow: { en: "Subscribe to our Newsletter", fr: aboutFr ? clean(aboutFr('[data-id="9bf6316"] .subtitle').text()) : "" },
    newsletterTitle: { en: "Don't miss a thing! Get updated", fr: aboutFr ? clean(aboutFr('[data-id="9bf6316"] h3').text()) : "" },
  });
  await saveSetting("contact", {
    email: "contact@friendsofnigeria.net",
    phones: ["+33 620578844", "+33 758683771"],
    addresses: [
      { label: { en: "Europe (France)", fr: "Europe (France)" }, text: { en: "229 rue Saint-Honoré, 75001, Paris", fr: "229 rue Saint-Honoré, 75001, Paris" } },
      { label: { en: "Nigeria", fr: "Nigeria" }, text: { en: "Suite A301, Global Plaza, Obafemi Awolowo Way, Jabi, Abuja", fr: "Suite A301, Global Plaza, Obafemi Awolowo Way, Jabi, Abuja" } },
    ],
    hours: { en: "09:00H to 18:00H, Monday to Friday.", fr: "09h00 à 18h00, du lundi au vendredi." },
  });
  await saveSetting("social", {
    facebook: "https://www.facebook.com/Friends-of-Nigeria-805717569606527/",
    twitter: "https://twitter.com/FON_EUROPE",
    linkedin: "https://www.linkedin.com/company/11407971/",
    instagram: "https://instagram.com/friendsofnigeria",
    youtube: "https://www.youtube.com/channel/UC52gKkRlNU5rZ2SiK5R9z4A",
    flickr: "https://www.flickr.com/photos/157014038@N02/",
  });
  await saveSetting("seo", {
    titleTemplate: "%s - Spotlight Nigeria",
    defaultDescription: {
      en: clean(en('meta[name="description"]').attr("content")) || "Spotlight Nigeria is the foremost event in France for companies, business leaders and investors interested in investment and business opportunities in Nigeria.",
      fr: clean(fr('meta[name="description"]').attr("content")),
    },
  });
  await saveSetting("privacy", {
    cookieBanner: true,
    message: {
      en: "We use cookies to measure audience and improve the site. Analytics only run if you accept.",
      fr: "Nous utilisons des cookies pour mesurer l'audience et améliorer le site. Les statistiques ne sont activées que si vous acceptez.",
    },
    privacyHref: "/privacy-policy/",
  });
  count("settings", true);
}

// ───────── Main ─────────

async function main() {
  console.log("Importing taxonomies and posts…");
  const maps = await importTaxonomies();
  await importPosts(maps);
  console.log("Importing speakers, testimonials, events…");
  const speakerIds = await importSpeakers();
  await importTestimonials();
  const eventIds = await importEvents(speakerIds);
  console.log("Importing pages…");
  await importPages({ partnerIds: new Map(), eventIds });
  console.log("Importing menus and settings…");
  await importMenus();
  await importSettings();

  const out = path.join(process.cwd(), "migration", "report.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ ...report, finishedAt: new Date().toISOString() }, null, 2));
  console.log("\nCreated:", report.created, "\nUpdated:", report.updated);
  console.log(`Warnings: ${report.warnings.length}, missing media: ${report.missingMedia.length}, skipped: ${report.skipped.length}`);
  console.log(`Report: ${out}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
