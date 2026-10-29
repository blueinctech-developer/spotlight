import { z } from "zod";

/**
 * Structured page content. Every page stores an array of blocks validated by this schema.
 * Blocks reference media, speakers, partners, testimonials and events by id, so shared records
 * are edited once and reused everywhere. Rich text fields hold HTML that is sanitized on save
 * and on render (src/lib/sanitize.ts). No block can carry scripts or arbitrary embeds.
 */

const id = z.string().min(1).max(64);
const mediaId = z.string().max(64).nullable().default(null);
const text = (max = 500) => z.string().max(max).default("");
const html = z.string().max(100_000).default("");
const href = z.string().max(2000).default("");

export const linkSchema = z.object({
  label: text(120),
  href,
  newTab: z.boolean().default(false),
});
export type LinkValue = z.infer<typeof linkSchema>;

const base = {
  id,
  /** Hidden blocks stay in the page (and in revisions) but are not rendered publicly. */
  hidden: z.boolean().default(false),
  /** Optional anchor id so menus/buttons can link to "#section". */
  anchor: z.string().max(60).regex(/^[a-z0-9-]*$/i).default(""),
};

export const iconNames = [
  "location", "calendar", "quote", "phone", "email", "clock", "user", "ticket", "check", "info", "globe",
] as const;
export const iconSchema = z.enum(iconNames).default("info");

/** Hero with headline, event facts, register button, video popup and shaped image. */
const hero = z.object({
  ...base,
  type: z.literal("hero"),
  eyebrow: text(120),
  title: text(200),
  subtitle: text(200),
  facts: z.array(z.object({ icon: iconSchema, text: text(300), highlight: z.boolean().default(false) })).max(6).default([]),
  primary: linkSchema.default({ label: "", href: "", newTab: false }),
  videoUrl: href,
  videoLabel: text(120),
  image: mediaId,
});

/** Centered statement on a tinted band ("The highly anticipated Spotlight Nigeria 2026"). */
const introBand = z.object({
  ...base,
  type: z.literal("introBand"),
  title: text(300),
  body: html,
  tone: z.enum(["grey", "white", "green", "navy"]).default("grey"),
});

/** "At a glance": photo collage + video, text and a ticket-shaped statistics strip. */
const glance = z.object({
  ...base,
  type: z.literal("glance"),
  title: text(200),
  /** Words of the title shown in the accent (dark) colour, e.g. "at a glance". */
  titleAccent: text(120),
  images: z.array(mediaId).max(3).default([]),
  videoUrl: href,
  body: html,
  stats: z.array(z.object({ value: z.number().int().min(0).max(10_000_000), suffix: text(8), label: text(80) })).max(6).default([]),
});

const stats = z.object({
  ...base,
  type: z.literal("stats"),
  items: z.array(z.object({ value: z.number().int().min(0).max(10_000_000), suffix: text(8), label: text(80) })).max(8).default([]),
});

/** Split image + dark panel call to action ("Are you interested in sponsoring?"). */
const splitCta = z.object({
  ...base,
  type: z.literal("splitCta"),
  image: mediaId,
  eyebrow: text(120),
  title: text(200),
  body: html,
  button: linkSchema.default({ label: "", href: "", newTab: false }),
  imageSide: z.enum(["left", "right"]).default("left"),
});

/** Logo walls. Each group lists partner ids in display order. */
const partners = z.object({
  ...base,
  type: z.literal("partners"),
  title: text(200),
  subtitle: text(300),
  groups: z.array(z.object({ heading: text(120), partnerIds: z.array(id).max(200).default([]) })).max(10).default([]),
});

/** Photo tiles with overlay captions ("PRESENTATIONS @Spotlight Nigeria"). */
const highlights = z.object({
  ...base,
  type: z.literal("highlights"),
  title: text(200),
  items: z.array(z.object({ image: mediaId, title: text(120), caption: text(200) })).max(24).default([]),
});

const testimonials = z.object({
  ...base,
  type: z.literal("testimonials"),
  title: text(200),
  /** Empty = all visible testimonials in their configured order. */
  testimonialIds: z.array(id).max(50).default([]),
});

/** Inner-page title banner (H1). */
const pageTitle = z.object({
  ...base,
  type: z.literal("pageTitle"),
  title: text(200),
  subtitle: text(1000),
  /** plain: white with breadcrumb; dark: dark texture (used with dark header); image: photo with overlay. */
  variant: z.enum(["plain", "dark", "image"]).default("plain"),
  showBreadcrumb: z.boolean().default(true),
  background: mediaId,
});

const richText = z.object({
  ...base,
  type: z.literal("richText"),
  html,
  width: z.enum(["narrow", "normal", "wide"]).default("normal"),
  align: z.enum(["left", "center"]).default("left"),
});

const heading = z.object({
  ...base,
  type: z.literal("heading"),
  text: text(300),
  level: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).default("h2"),
  align: z.enum(["left", "center", "right"]).default("left"),
  tone: z.enum(["dark", "brand", "muted"]).default("dark"),
  subtitle: text(500),
});

const image = z.object({
  ...base,
  type: z.literal("image"),
  image: mediaId,
  caption: text(300),
  link: href,
  size: z.enum(["avatar", "small", "medium", "full"]).default("full"),
  align: z.enum(["left", "center"]).default("center"),
});

const gallery = z.object({
  ...base,
  type: z.literal("gallery"),
  images: z.array(z.object({ image: mediaId, title: text(120), caption: text(200) })).max(200).default([]),
  columns: z.number().int().min(2).max(6).default(4),
  /** grid: equal tiles; mosaic: varied tile sizes like the original gallery page. */
  layout: z.enum(["grid", "mosaic"]).default("grid"),
  lightbox: z.boolean().default(true),
});

const buttons = z.object({
  ...base,
  type: z.literal("buttons"),
  items: z.array(linkSchema.extend({ variant: z.enum(["primary", "dark", "outline"]).default("primary") })).max(4).default([]),
  align: z.enum(["left", "center", "right"]).default("left"),
});

const video = z.object({
  ...base,
  type: z.literal("video"),
  url: href,
  title: text(200),
});

const spacer = z.object({ ...base, type: z.literal("spacer"), size: z.enum(["sm", "md", "lg", "xl"]).default("md") });
const divider = z.object({ ...base, type: z.literal("divider") });

/** Icon cards for contact details. */
const infoCards = z.object({
  ...base,
  type: z.literal("infoCards"),
  items: z.array(z.object({ icon: iconSchema, title: text(120), text: text(500), href })).max(8).default([]),
});

/** Text with "Where / When" facts beside an image collage (About page). */
const featureSplit = z.object({
  ...base,
  type: z.literal("featureSplit"),
  title: text(200),
  body: html,
  facts: z.array(z.object({ label: text(60), text: text(300) })).max(4).default([]),
  images: z.array(mediaId).max(3).default([]),
  button: linkSchema.default({ label: "", href: "", newTab: false }),
  imageSide: z.enum(["left", "right"]).default("right"),
});

/** Vertical tabs with image per tab ("5 reasons to attend"). */
const tabs = z.object({
  ...base,
  type: z.literal("tabs"),
  title: text(200),
  intro: html,
  items: z.array(z.object({ label: text(120), body: html, image: mediaId })).max(10).default([]),
});

/** Registration options with feature lists and a button each, plus optional help panel. */
const pricing = z.object({
  ...base,
  type: z.literal("pricing"),
  intro: html,
  title: text(300),
  items: z.array(z.object({
    title: text(200),
    price: text(40),
    features: z.array(text(200)).max(12).default([]),
    button: linkSchema.default({ label: "", href: "", newTab: false }),
    highlight: z.boolean().default(false),
  })).max(4).default([]),
  helpTitle: text(120),
  helpText: html,
  helpContacts: z.array(z.object({ icon: iconSchema, text: text(200), href })).max(6).default([]),
});

/** Organizer / about-the-organisation block: logo + text. */
const organizer = z.object({
  ...base,
  type: z.literal("organizer"),
  title: text(200),
  logo: mediaId,
  body: html,
});

const speakers = z.object({
  ...base,
  type: z.literal("speakers"),
  title: text(200),
  subtitle: text(300),
  /** Empty = all published speakers. */
  speakerIds: z.array(id).max(200).default([]),
  columns: z.number().int().min(2).max(5).default(4),
});

/** Programme for an event edition, pulled from Events → Sessions. */
const schedule = z.object({
  ...base,
  type: z.literal("schedule"),
  title: text(200),
  eventId: z.string().max(64).nullable().default(null),
  /** Shown instead of the programme when the event has no sessions yet. */
  emptyTitle: text(200),
  emptySubtitle: text(200),
});

const postList = z.object({
  ...base,
  type: z.literal("postList"),
  title: text(200),
  categorySlug: z.string().max(100).default(""),
  perPage: z.number().int().min(1).max(50).default(12),
});

export const formKeys = ["contact", "sponsorship", "report-download", "press", "newsletter"] as const;
export type FormKey = (typeof formKeys)[number];

const form = z.object({
  ...base,
  type: z.literal("form"),
  form: z.enum(formKeys).default("contact"),
  title: text(200),
  intro: html,
  /** Closed forms show this message instead of the fields. */
  closed: z.boolean().default(false),
  closedMessage: text(300),
  /** Optional document offered after a successful submission (report download). */
  download: mediaId,
});

/** Third-party embeds limited to an allow-list of hosts (Google Forms, YouTube, Flickr, Weezevent). */
const embed = z.object({
  ...base,
  type: z.literal("embed"),
  url: href,
  title: text(200),
  height: z.number().int().min(200).max(3000).default(660),
});

const contactAside = z.object({
  ...base,
  type: z.literal("contactAside"),
  title: text(120),
  text: html,
  showSocial: z.boolean().default(true),
});

const blockList = [
  hero, introBand, glance, stats, splitCta, partners, highlights, testimonials, pageTitle, richText,
  heading, image, gallery, buttons, video, spacer, divider, infoCards, featureSplit, tabs, pricing,
  organizer, speakers, schedule, postList, form, embed, contactAside,
] as const;

const leafBlock = z.discriminatedUnion("type", blockList);
export type LeafBlock = z.infer<typeof leafBlock>;

/** Columns contain leaf blocks only (one nesting level keeps the editor simple). */
const columns = z.object({
  ...base,
  type: z.literal("columns"),
  ratio: z.enum(["1-1", "1-2", "2-1", "1-1-1", "1-1-1-1"]).default("1-1"),
  columns: z.array(z.object({ blocks: z.array(leafBlock).max(30).default([]) })).min(1).max(4),
});

export const blockSchema = z.discriminatedUnion("type", [...blockList, columns]);
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export const blocksSchema = z.array(blockSchema).max(200);

/** Validate stored JSON. Invalid blocks are dropped (and reported) rather than crashing a page. */
export function parseBlocks(value: unknown): { blocks: Block[]; errors: string[] } {
  if (!Array.isArray(value)) return { blocks: [], errors: value == null ? [] : ["Content is not a list"] };
  const blocks: Block[] = [];
  const errors: string[] = [];
  value.forEach((raw, i) => {
    const r = blockSchema.safeParse(raw);
    if (r.success) blocks.push(r.data);
    else errors.push(`Block ${i + 1} (${(raw as { type?: string })?.type ?? "unknown"}): ${r.error.issues[0]?.message}`);
  });
  return { blocks, errors };
}

/** Every media id referenced by a list of blocks (for usage tracking and render prefetch). */
export function collectMediaIds(blocks: Block[]): string[] {
  const ids = new Set<string>();
  const add = (v: unknown) => typeof v === "string" && v && ids.add(v);
  const visit = (b: Block | LeafBlock) => {
    switch (b.type) {
      case "hero": add(b.image); break;
      case "glance": b.images.forEach(add); break;
      case "splitCta": add(b.image); break;
      case "highlights": b.items.forEach((i) => add(i.image)); break;
      case "pageTitle": add(b.background); break;
      case "image": add(b.image); break;
      case "gallery": b.images.forEach((i) => add(i.image)); break;
      case "featureSplit": b.images.forEach(add); break;
      case "tabs": b.items.forEach((i) => add(i.image)); break;
      case "organizer": add(b.logo); break;
      case "form": add(b.download); break;
      case "columns": b.columns.forEach((c) => c.blocks.forEach(visit)); break;
    }
  };
  blocks.forEach(visit);
  return [...ids];
}

export function collectRefs(blocks: Block[]) {
  const partners = new Set<string>();
  const speakers = new Set<string>();
  const testimonials = new Set<string>();
  const events = new Set<string>();
  const visit = (b: Block | LeafBlock) => {
    if (b.type === "partners") b.groups.forEach((g) => g.partnerIds.forEach((p) => partners.add(p)));
    if (b.type === "speakers") b.speakerIds.forEach((s) => speakers.add(s));
    if (b.type === "testimonials") b.testimonialIds.forEach((t) => testimonials.add(t));
    if (b.type === "schedule" && b.eventId) events.add(b.eventId);
    if (b.type === "columns") b.columns.forEach((c) => c.blocks.forEach(visit));
  };
  blocks.forEach(visit);
  return { partners: [...partners], speakers: [...speakers], testimonials: [...testimonials], events: [...events] };
}

/** Create a block with default values. */
export function createBlock<T extends BlockType>(type: T, newId: string): BlockOf<T> {
  const extra = type === "columns" ? { columns: [{ blocks: [] }, { blocks: [] }] } : {};
  return blockSchema.parse({ id: newId, type, ...extra }) as BlockOf<T>;
}

export function isAllowedEmbed(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return [
      "docs.google.com", "www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com",
      "www.flickr.com", "embedr.flickr.com", "widget.weezevent.com", "my.weezevent.com",
    ].includes(u.hostname);
  } catch {
    return false;
  }
}

/** YouTube watch/short URL → privacy-friendly embed URL, or null. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let vid: string | null = null;
    if (u.hostname === "youtu.be") vid = u.pathname.slice(1);
    else if (u.hostname.endsWith("youtube.com")) vid = u.searchParams.get("v") ?? u.pathname.split("/embed/")[1] ?? null;
    if (!vid || !/^[\w-]{6,20}$/.test(vid)) return null;
    return `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`;
  } catch {
    return null;
  }
}
