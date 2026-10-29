import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { localizePath, type Locale } from "@/lib/i18n";
import { livePageWhere, livePostWhere } from "@/lib/content/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  // Taxonomy archives are listed per language, and only when they contain live posts in it.
  const taxonomyFilter = (locale: Locale) => ({ posts: { some: { post: { ...livePostWhere(), locale } } } });
  const [pages, posts, speakers, categoriesEn, categoriesFr, tagsEn, tagsFr] = await Promise.all([
    db.page.findMany({ where: { ...livePageWhere(), noindex: false }, select: { path: true, locale: true, updatedAt: true, translationGroup: true } }),
    db.post.findMany({ where: { ...livePostWhere(), noindex: false }, select: { slug: true, locale: true, updatedAt: true, translationGroup: true } }),
    db.speaker.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: taxonomyFilter("en"), select: { slug: true } }),
    db.category.findMany({ where: taxonomyFilter("fr"), select: { slug: true } }),
    db.tag.findMany({ where: taxonomyFilter("en"), select: { slug: true } }),
    db.tag.findMany({ where: taxonomyFilter("fr"), select: { slug: true } }),
  ]);
  const taxonomyUrls = (kind: "category" | "tag", rows: { slug: string }[], locale: Locale) =>
    rows.map((r) => ({ url: base + localizePath(`${kind}/${r.slug}`, locale) }));
  const langs = (group: string, rows: { translationGroup: string; locale: string; path: string }[]) => {
    const out: Record<string, string> = {};
    for (const r of rows.filter((x) => x.translationGroup === group)) out[r.locale] = base + localizePath(r.path, r.locale as Locale);
    return out;
  };
  const pageRows = pages.map((p) => ({ ...p, path: p.path }));
  const postRows = posts.map((p) => ({ ...p, path: p.slug }));
  return [
    ...pageRows.map((p) => ({
      url: base + localizePath(p.path, p.locale as Locale),
      lastModified: p.updatedAt,
      alternates: { languages: langs(p.translationGroup, pageRows) },
    })),
    ...postRows.map((p) => ({
      url: base + localizePath(p.path, p.locale as Locale),
      lastModified: p.updatedAt,
      alternates: { languages: langs(p.translationGroup, postRows) },
    })),
    ...speakers.flatMap((s) =>
      (["en", "fr"] as const).map((l) => ({ url: base + localizePath(`speakers/${s.slug}`, l), lastModified: s.updatedAt })),
    ),
    ...taxonomyUrls("category", categoriesEn, "en"),
    ...taxonomyUrls("category", categoriesFr, "fr"),
    ...taxonomyUrls("tag", tagsEn, "en"),
    ...taxonomyUrls("tag", tagsFr, "fr"),
  ];
}
