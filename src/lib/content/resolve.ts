import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { findRedirect, getPublishedPage, getPublishedPost, getPublishedSpeaker, livePostWhere } from "./public";

export type ArchiveKind =
  | { kind: "category"; slug: string; name: string }
  | { kind: "tag"; slug: string; name: string }
  | { kind: "author"; slug: string; name: string }
  | { kind: "date"; year: number; month?: number; day?: number };

export type Resolved =
  | { type: "page"; data: NonNullable<Awaited<ReturnType<typeof getPublishedPage>>>; listPage: number; basePath: string }
  | { type: "post"; data: NonNullable<Awaited<ReturnType<typeof getPublishedPost>>> }
  | { type: "speaker"; data: NonNullable<Awaited<ReturnType<typeof getPublishedSpeaker>>> }
  | { type: "speakers"; page: number }
  | { type: "archive"; archive: ArchiveKind; page: number; basePath: string }
  | { type: "redirect"; to: string; permanent: boolean }
  | { type: "notFound" };

/** Split a trailing "/page/N" off a path. */
function splitPagination(segments: string[]): { segs: string[]; page: number } | null {
  const n = segments.length;
  if (n >= 2 && segments[n - 2] === "page") {
    const p = Number(segments[n - 1]);
    if (!Number.isInteger(p) || p < 1) return null;
    return { segs: segments.slice(0, -2), page: p };
  }
  return { segs: segments, page: 1 };
}

const SLUG = /^[a-z0-9][a-z0-9-_%.]*$/i;

export const resolvePath = cache(async (locale: Locale, rawSegments: string[]): Promise<Resolved> => {
  const segments = rawSegments.map((s) => decodeURIComponent(s));
  const split = splitPagination(segments);
  if (!split) return { type: "notFound" };
  const { segs, page } = split;
  const prefix = locale === "fr" ? "/fr" : "";
  const base = (s: string[]) => `${prefix}/${s.length ? s.join("/") + "/" : ""}`;

  // 1. CMS pages (any depth). Pagination is allowed for pages that list posts.
  const pagePath = segs.join("/");
  if (segs.every((s) => SLUG.test(s)) || segs.length === 0) {
    const pageHit = await getPublishedPage(locale, pagePath);
    if (pageHit) {
      const blocks = Array.isArray(pageHit.page.blocks) ? (pageHit.page.blocks as { type?: string }[]) : [];
      if (page > 1 && !blocks.some((b) => b?.type === "postList")) return { type: "notFound" };
      return { type: "page", data: pageHit, listPage: page, basePath: base(segs) };
    }
  }

  const [first, second, third] = segs;

  // 2. Speakers archive and single speakers.
  if (first === "speakers") {
    if (segs.length === 1) return { type: "speakers", page };
    if (segs.length === 2 && page === 1) {
      const sp = await getPublishedSpeaker(locale, second);
      if (sp) return { type: "speaker", data: sp };
    }
  }

  // 3. Taxonomy and author archives.
  if ((first === "category" || first === "tag" || first === "author") && segs.length === 2) {
    if (first === "category") {
      const c = await db.category.findUnique({ where: { slug: second } });
      if (c) return { type: "archive", archive: { kind: "category", slug: c.slug, name: (locale === "fr" && c.nameFr) || c.name }, page, basePath: base(segs) };
    } else if (first === "tag") {
      const tg = await db.tag.findUnique({ where: { slug: second } });
      if (tg) return { type: "archive", archive: { kind: "tag", slug: tg.slug, name: (locale === "fr" && tg.nameFr) || tg.name }, page, basePath: base(segs) };
    } else {
      // WordPress author archive (all posts were published by one account).
      const any = await db.post.findFirst({ where: { locale, ...livePostWhere() }, select: { authorDisplayName: true } });
      if (any && second === "blueinctech") {
        return { type: "archive", archive: { kind: "author", slug: second, name: any.authorDisplayName ?? second }, page, basePath: base(segs) };
      }
    }
  }

  // 4. Date archives: /2018/, /2018/09/, /2018/09/28/
  if (/^\d{4}$/.test(first ?? "") && segs.length <= 3) {
    const year = Number(first);
    const month = second ? Number(second) : undefined;
    const day = third ? Number(third) : undefined;
    const valid = (!second || /^\d{2}$/.test(second)) && (!third || /^\d{2}$/.test(third)) && (!month || (month >= 1 && month <= 12)) && (!day || (day >= 1 && day <= 31));
    if (valid) return { type: "archive", archive: { kind: "date", year, month, day }, page, basePath: base(segs) };
  }

  // 5. Single posts live at the root, like WordPress "/%postname%/".
  if (segs.length === 1 && page === 1) {
    const post = await getPublishedPost(locale, first);
    if (post) return { type: "post", data: post };
  }

  // 6. Redirect table.
  const redirect = await findRedirect(base(segments));
  if (redirect && redirect.statusCode !== 410 && redirect.toPath) {
    db.redirect.update({ where: { id: redirect.id }, data: { hits: { increment: 1 } } }).catch(() => {});
    return { type: "redirect", to: redirect.toPath, permanent: redirect.statusCode === 301 || redirect.statusCode === 308 };
  }
  return { type: "notFound" };
});
