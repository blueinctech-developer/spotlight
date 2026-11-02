import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { mediaUrl, type MediaRef } from "@/lib/media-url";
import { collectMediaIds, collectRefs, parseBlocks, type Block } from "@/lib/blocks/schema";
import { localizePath, type Locale } from "@/lib/i18n";
import { safeHref } from "@/lib/sanitize";
import type { Prisma } from "@/generated/prisma/client";

/** Published, not trashed, and not scheduled in the future. */
export function livePageWhere(): Prisma.PageWhereInput {
  return { status: "PUBLISHED", deletedAt: null, OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] };
}
export function livePostWhere(): Prisma.PostWhereInput {
  return { status: "PUBLISHED", deletedAt: null, OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] };
}

// ───────── Media ─────────

export type MediaMap = Record<string, MediaRef>;

export function toMediaRef(
  m: { id: string; storageKey: string; alt: string; altFr?: string | null; width: number | null; height: number | null; mimeType: string },
  locale: Locale = "en",
): MediaRef {
  return {
    id: m.id,
    url: mediaUrl(m.storageKey),
    alt: (locale === "fr" && m.altFr) || m.alt,
    width: m.width,
    height: m.height,
    mimeType: m.mimeType,
  };
}

export async function getMediaMap(ids: string[], locale: Locale = "en"): Promise<MediaMap> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const rows = await db.mediaAsset.findMany({
    where: { id: { in: unique } },
    select: { id: true, storageKey: true, alt: true, altFr: true, width: true, height: true, mimeType: true },
  });
  return Object.fromEntries(rows.map((r) => [r.id, toMediaRef(r, locale)]));
}

// ───────── Settings / menus ─────────

export type NavItem = { id: string; label: string; href: string; newTab: boolean; children: NavItem[] };
export type Menus = Record<string, { name: string; items: NavItem[] }>;

export const getMenus = cache(async (locale: Locale): Promise<Menus> => {
  const menus = await db.menu.findMany({
    where: { locale },
    include: { items: { where: { visible: true }, orderBy: { order: "asc" } } },
  });
  const groups = [...new Set(menus.flatMap((m) => m.items.map((i) => i.pageGroup).filter((g): g is string => !!g)))];
  const pages = groups.length
    ? await db.page.findMany({
        where: { translationGroup: { in: groups }, ...livePageWhere() },
        select: { translationGroup: true, locale: true, path: true },
      })
    : [];
  const pathFor = (group: string) => {
    const own = pages.find((p) => p.translationGroup === group && p.locale === locale);
    const fallback = pages.find((p) => p.translationGroup === group);
    const target = own ?? fallback;
    return target ? localizePath(target.path, own ? locale : target.locale) : null;
  };
  const out: Menus = {};
  for (const menu of menus) {
    const build = (parentId: string | null): NavItem[] => {
      const result: NavItem[] = [];
      for (const i of menu.items.filter((x) => x.parentId === parentId)) {
        const pageHref = i.pageGroup ? pathFor(i.pageGroup) : null;
        // A link to a page that is not published disappears rather than pointing nowhere.
        if (i.pageGroup && !pageHref) continue;
        result.push({
          id: i.id,
          label: i.label,
          href: pageHref ?? safeHref(i.url),
          newTab: i.openInNewTab,
          children: build(i.id),
        });
      }
      return result;
    };
    out[menu.location] = { name: menu.name, items: build(null) };
  }
  return out;
});

// ───────── Pages ─────────

export type Alternate = { locale: Locale; href: string };

async function alternatesForPage(group: string): Promise<Alternate[]> {
  const rows = await db.page.findMany({
    where: { translationGroup: group, ...livePageWhere() },
    select: { locale: true, path: true },
  });
  return rows.map((r) => ({ locale: r.locale as Locale, href: localizePath(r.path, r.locale as Locale) }));
}

export const getPublishedPage = cache(async (locale: Locale, path: string) => {
  const page = await db.page.findFirst({
    where: { locale, path, ...livePageWhere() },
    include: { featuredImage: true, ogImage: true },
  });
  if (!page) return null;
  const alternates = await alternatesForPage(page.translationGroup);
  return { page, alternates };
});

// ───────── Block data ─────────

export type SpeakerCard = {
  id: string; slug: string; name: string; jobTitle: string; organization: string; photo: MediaRef | null;
};
export type PartnerLogo = { id: string; name: string; websiteUrl: string | null; logo: MediaRef | null };
export type TestimonialCard = {
  id: string; quote: string; name: string; role: string; photo: MediaRef | null; logo: MediaRef | null;
};
export type ScheduleSession = {
  id: string; day: number; startTime: string | null; endTime: string | null; title: string; theme: string | null;
  description: string | null; location: string | null; kind: string;
  /** `label` is the editor-written tag text (localized), or null to show the role name. */
  speakers: { role: string; label: string | null; speaker: SpeakerCard }[];
};
export type ScheduleEvent = {
  id: string; title: string; startsAt: Date | null; venueName: string | null; venueAddress: string | null;
  sessions: ScheduleSession[];
};

export type BlockData = {
  media: MediaMap;
  partners: Record<string, PartnerLogo>;
  speakers: SpeakerCard[];
  speakersById: Record<string, SpeakerCard>;
  testimonials: TestimonialCard[];
  events: Record<string, ScheduleEvent>;
  posts?: unknown;
};

const speakerSelect = {
  id: true, slug: true, name: true, jobTitle: true, jobTitleFr: true, organization: true,
  photo: { select: { id: true, storageKey: true, alt: true, altFr: true, width: true, height: true, mimeType: true } },
} as const;

type SpeakerRow = Prisma.SpeakerGetPayload<{ select: typeof speakerSelect }>;
export function toSpeakerCard(s: SpeakerRow, locale: Locale): SpeakerCard {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    jobTitle: (locale === "fr" && s.jobTitleFr) || s.jobTitle || "",
    organization: s.organization ?? "",
    photo: s.photo ? toMediaRef(s.photo, locale) : null,
  };
}

/** Load everything a list of blocks needs in a few batched queries. */
export async function loadBlockData(blocks: Block[], locale: Locale): Promise<BlockData> {
  const refs = collectRefs(blocks);
  const hasAllSpeakers = blocks.some((b) => b.type === "speakers" && b.speakerIds.length === 0);
  const hasAllTestimonials = blocks.some((b) => b.type === "testimonials" && b.testimonialIds.length === 0);
  const hasTestimonials = blocks.some((b) => b.type === "testimonials");
  const mediaSelect = { select: { id: true, storageKey: true, alt: true, altFr: true, width: true, height: true, mimeType: true } } as const;

  const [media, partners, speakers, testimonials, events] = await Promise.all([
    getMediaMap(collectMediaIds(blocks), locale),
    refs.partners.length
      ? db.partner.findMany({ where: { id: { in: refs.partners }, published: true }, include: { logo: mediaSelect } })
      : [],
    refs.speakers.length || hasAllSpeakers
      ? db.speaker.findMany({
          where: { published: true, ...(hasAllSpeakers ? {} : { id: { in: refs.speakers } }) },
          orderBy: [{ order: "asc" }, { name: "asc" }],
          select: speakerSelect,
        })
      : [],
    hasTestimonials
      ? db.testimonial.findMany({
          where: { visible: true, ...(hasAllTestimonials ? {} : { id: { in: refs.testimonials } }) },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: { photo: mediaSelect, logo: mediaSelect },
        })
      : [],
    refs.events.length
      ? db.event.findMany({
          where: { id: { in: refs.events }, status: { in: ["PUBLISHED", "ARCHIVED"] } },
          include: {
            // Hidden sessions never leave the server; hidden days are dropped below.
            sessions: {
              where: { hidden: false },
              orderBy: [{ day: "asc" }, { order: "asc" }],
              include: { speakers: { orderBy: { order: "asc" }, include: { speaker: { select: speakerSelect } } } },
            },
          },
        })
      : [],
  ]);

  const speakerCards = speakers.map((s) => toSpeakerCard(s, locale));
  return {
    media,
    partners: Object.fromEntries(
      partners.map((p) => [p.id, { id: p.id, name: p.name, websiteUrl: p.websiteUrl, logo: p.logo ? toMediaRef(p.logo, locale) : null }]),
    ),
    speakers: speakerCards,
    speakersById: Object.fromEntries(speakerCards.map((s) => [s.id, s])),
    testimonials: testimonials.map((t) => ({
      id: t.id,
      quote: (locale === "fr" && t.quoteFr) || t.quote,
      name: t.name,
      role: (locale === "fr" && t.roleFr) || t.role || "",
      photo: t.photo ? toMediaRef(t.photo, locale) : null,
      logo: t.logo ? toMediaRef(t.logo, locale) : null,
    })),
    events: Object.fromEntries(
      events.map((e) => [
        e.id,
        {
          id: e.id,
          title: (locale === "fr" && e.titleFr) || e.title,
          startsAt: e.startsAt,
          venueName: e.venueName,
          venueAddress: e.venueAddress,
          sessions: e.sessions.filter((s) => !e.hiddenDays.includes(s.day)).map((s) => ({
            id: s.id,
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            title: (locale === "fr" && s.titleFr) || s.title,
            theme: (locale === "fr" && s.themeFr) || s.theme,
            description: (locale === "fr" && s.descriptionFr) || s.description,
            location: s.location,
            kind: s.kind,
            speakers: s.speakers.map((sp) => ({
              role: sp.role,
              label: (locale === "fr" && sp.labelFr) || sp.label || null,
              speaker: toSpeakerCard(sp.speaker, locale),
            })),
          })),
        },
      ]),
    ),
  };
}

export function blocksFrom(value: unknown): Block[] {
  return parseBlocks(value).blocks.filter((b) => !b.hidden);
}

// ───────── Posts ─────────

export const postCardInclude = {
  featuredImage: { select: { id: true, storageKey: true, alt: true, altFr: true, width: true, height: true, mimeType: true } },
  categories: { include: { category: true } },
} as const;

export type PostListFilter = {
  locale: Locale;
  categorySlug?: string;
  tagSlug?: string;
  year?: number;
  month?: number;
  day?: number;
  authorSlug?: string;
  search?: string;
  page?: number;
  perPage?: number;
};

export async function listPublishedPosts(f: PostListFilter) {
  const perPage = f.perPage ?? 12;
  const page = Math.max(1, f.page ?? 1);
  let dateRange: Prisma.DateTimeNullableFilter | undefined;
  if (f.year) {
    const start = new Date(Date.UTC(f.year, (f.month ?? 1) - 1, f.day ?? 1));
    const end = f.day
      ? new Date(Date.UTC(f.year, (f.month ?? 1) - 1, f.day + 1))
      : f.month
        ? new Date(Date.UTC(f.year, f.month, 1))
        : new Date(Date.UTC(f.year + 1, 0, 1));
    dateRange = { gte: start, lt: end };
  }
  const where: Prisma.PostWhereInput = {
    locale: f.locale,
    AND: [
      livePostWhere(),
      ...(dateRange ? [{ publishedAt: dateRange }] : []),
      ...(f.categorySlug ? [{ categories: { some: { category: { slug: f.categorySlug } } } }] : []),
      ...(f.tagSlug ? [{ tags: { some: { tag: { slug: f.tagSlug } } } }] : []),
      ...(f.search ? [{ OR: [{ title: { contains: f.search, mode: "insensitive" as const } }, { content: { contains: f.search, mode: "insensitive" as const } }] }] : []),
    ],
  };
  const [total, posts] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: postCardInclude,
    }),
  ]);
  return { posts, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export type PostCardData = Awaited<ReturnType<typeof listPublishedPosts>>["posts"][number];

export const getPublishedPost = cache(async (locale: Locale, slug: string) => {
  const post = await db.post.findFirst({
    where: { locale, slug, ...livePostWhere() },
    include: {
      ...postCardInclude,
      ogImage: true,
      tags: { include: { tag: true } },
    },
  });
  if (!post) return null;
  const [siblings, translations] = await Promise.all([
    db.post.findMany({
      where: { locale, ...livePostWhere() },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, slug: true, title: true },
    }),
    db.post.findMany({
      where: { translationGroup: post.translationGroup, ...livePostWhere() },
      select: { locale: true, slug: true },
    }),
  ]);
  const idx = siblings.findIndex((s) => s.id === post.id);
  const categoryIds = post.categories.map((c) => c.categoryId);
  const related = categoryIds.length
    ? await db.post.findMany({
        where: {
          locale,
          id: { not: post.id },
          ...livePostWhere(),
          categories: { some: { categoryId: { in: categoryIds } } },
        },
        orderBy: { publishedAt: "desc" },
        take: 2,
        include: postCardInclude,
      })
    : [];
  return {
    post,
    newer: idx > 0 ? siblings[idx - 1] : null,
    older: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
    related,
    alternates: translations.map((t) => ({ locale: t.locale as Locale, href: localizePath(t.slug, t.locale as Locale) })),
  };
});

export async function getBlogSidebar(locale: Locale) {
  const [categories, latest, tags] = await Promise.all([
    db.category.findMany({
      where: { posts: { some: { post: { locale, ...livePostWhere() } } } },
      orderBy: { name: "asc" },
    }),
    db.post.findMany({
      where: { locale, ...livePostWhere() },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: postCardInclude,
    }),
    db.tag.findMany({
      where: { posts: { some: { post: { locale, ...livePostWhere() } } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return { categories, latest, tags };
}

// ───────── Speakers ─────────

export async function listPublishedSpeakers(locale: Locale, page = 1, perPage = 6) {
  const where = { published: true };
  const [total, rows] = await Promise.all([
    db.speaker.count({ where }),
    db.speaker.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: speakerSelect,
    }),
  ]);
  return { speakers: rows.map((s) => toSpeakerCard(s, locale)), total, totalPages: Math.max(1, Math.ceil(total / perPage)), page };
}

export const getPublishedSpeaker = cache(async (locale: Locale, slug: string) => {
  const speaker = await db.speaker.findFirst({
    where: { slug, published: true },
    include: {
      photo: true,
      sessions: {
        include: { session: { include: { event: true } } },
      },
    },
  });
  if (!speaker) return null;
  const others = await db.speaker.findMany({
    where: { published: true, id: { not: speaker.id } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    take: 3,
    select: speakerSelect,
  });
  const sessions = speaker.sessions
    .filter((s) => s.session.event.status === "PUBLISHED" || s.session.event.status === "ARCHIVED")
    .filter((s) => !s.session.hidden && !s.session.event.hiddenDays.includes(s.session.day))
    .map((s) => ({
      id: s.session.id,
      day: s.session.day,
      date: s.session.event.startsAt,
      title: (locale === "fr" && s.session.titleFr) || s.session.title,
      description: (locale === "fr" && s.session.descriptionFr) || s.session.description,
      startTime: s.session.startTime,
      endTime: s.session.endTime,
      location: s.session.location ?? s.session.event.venueName,
    }));
  return { speaker, sessions, others: others.map((o) => toSpeakerCard(o, locale)) };
});

// ───────── Redirects ─────────

export async function findRedirect(path: string) {
  const variants = [path, path.endsWith("/") ? path.slice(0, -1) : `${path}/`];
  return db.redirect.findFirst({ where: { fromPath: { in: variants } } });
}

export async function getCurrentEvent() {
  return db.event.findFirst({
    where: { isCurrent: true, status: { in: ["PUBLISHED"] } },
    orderBy: { year: "desc" },
  });
}
