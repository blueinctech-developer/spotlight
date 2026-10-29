"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, isUniqueError, revalidatePublic, UserError } from "@/lib/admin/action";
import { saveAutosave, saveRevision, listRevisions } from "@/lib/admin/revisions";
import { syncMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { blocksSchema, collectMediaIds, parseBlocks, type Block, type LeafBlock } from "@/lib/blocks/schema";
import { sanitizeRichText } from "@/lib/sanitize";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth/session";

// ───────── Helpers ─────────

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, "Use lowercase letters, numbers and hyphens only.");

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));

/** Sanitize every rich-text field of a block tree. */
function sanitizeBlock<T extends Block | LeafBlock>(b: T): T {
  const s = (v: string) => sanitizeRichText(v);
  const x = { ...b } as Record<string, unknown> & T;
  switch (b.type) {
    case "introBand":
    case "glance":
    case "splitCta":
    case "featureSplit":
    case "organizer":
      (x as { body: string }).body = s((b as { body: string }).body);
      break;
    case "richText":
      (x as { html: string }).html = s(b.html);
      break;
    case "tabs":
      Object.assign(x, { intro: s(b.intro), items: b.items.map((i) => ({ ...i, body: s(i.body) })) });
      break;
    case "pricing":
      Object.assign(x, { intro: s(b.intro), helpText: s(b.helpText) });
      break;
    case "form":
      Object.assign(x, { intro: s(b.intro) });
      break;
    case "contactAside":
      Object.assign(x, { text: s(b.text) });
      break;
    case "columns":
      Object.assign(x, { columns: b.columns.map((c) => ({ blocks: c.blocks.map((cb) => sanitizeBlock(cb)) })) });
      break;
  }
  return x;
}

function htmlFields(blocks: Block[]): string[] {
  const out: string[] = [];
  const visit = (b: Block | LeafBlock) => {
    const r = b as Record<string, unknown>;
    for (const k of ["body", "html", "intro", "helpText", "text"]) if (typeof r[k] === "string") out.push(r[k] as string);
    if (b.type === "tabs") b.items.forEach((i) => out.push(i.body));
    if (b.type === "columns") b.columns.forEach((c) => c.blocks.forEach(visit));
  };
  blocks.forEach(visit);
  return out;
}

async function computePath(locale: "en" | "fr", slug: string, parentId: string | null, selfId?: string): Promise<string> {
  if (!parentId) return slug;
  const chain: string[] = [slug];
  let current: string | null = parentId;
  const seen = new Set<string>(selfId ? [selfId] : []);
  while (current) {
    if (seen.has(current)) throw new UserError("A page cannot be its own parent.", { parentId: "This would create a loop." });
    seen.add(current);
    const p: { slug: string; parentId: string | null; locale: string } | null = await db.page.findUnique({
      where: { id: current },
      select: { slug: true, parentId: true, locale: true },
    });
    if (!p) break;
    if (p.locale !== locale) throw new UserError("The parent page must be in the same language.", { parentId: "Choose a page in the same language." });
    if (p.slug) chain.unshift(p.slug);
    current = p.parentId;
  }
  return chain.filter(Boolean).join("/");
}

/** Recompute paths of all descendants after a page's path changed. */
async function updateDescendantPaths(tx: Prisma.TransactionClient, parentId: string, parentPath: string) {
  const children = await tx.page.findMany({ where: { parentId }, select: { id: true, slug: true } });
  for (const c of children) {
    const path = [parentPath, c.slug].filter(Boolean).join("/");
    await tx.page.update({ where: { id: c.id }, data: { path } });
    await updateDescendantPaths(tx, c.id, path);
  }
}

function snapshot(p: Record<string, unknown>) {
  const keys = [
    "title", "slug", "parentId", "excerpt", "featuredImageId", "blocks", "status", "publishedAt", "menuOrder",
    "headerVariant", "footerVariant", "seoTitle", "seoDescription", "canonicalUrl", "ogTitle", "ogDescription", "ogImageId", "noindex",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = p[k] instanceof Date ? (p[k] as Date).toISOString() : p[k] ?? null;
  return out as Prisma.InputJsonValue;
}

async function afterChange(page: { id: string; title: string; locale: string; blocks: unknown; featuredImageId: string | null; ogImageId: string | null }) {
  const blocks = parseBlocks(page.blocks).blocks;
  await syncMediaUsage(
    "PAGE",
    page.id,
    `Page: ${page.title} (${page.locale.toUpperCase()})`,
    [...collectMediaIds(blocks), page.featuredImageId, page.ogImageId],
    htmlFields(blocks),
  );
  revalidatePublic();
}

function requirePublish(user: SessionUser, status: string) {
  if (status === "PUBLISHED" && !can(user.role, "content.publish")) {
    throw new UserError("You do not have permission to publish pages.");
  }
}

// ───────── Create ─────────

export const createPage = adminAction(
  "pages.manage",
  z.object({
    title: z.string().trim().min(1, "Enter a title.").max(200),
    slug: slugSchema,
    locale: z.enum(["en", "fr"]).default("en"),
    parentId: z.string().max(64).nullable().optional(),
    /** Create as a translation of this group, copying blocks from the source language. */
    translationOf: z.string().max(64).nullable().optional(),
  }),
  async (input, user) => {
    let blocks: Block[] = [];
    let group = `page-${randomUUID()}`;
    let extra: Partial<Prisma.PageUncheckedCreateInput> = {};
    if (input.translationOf) {
      const source = await db.page.findFirst({ where: { translationGroup: input.translationOf, deletedAt: null }, orderBy: { locale: "asc" } });
      if (!source) throw new UserError("The original page was not found.");
      if (await db.page.findUnique({ where: { translationGroup_locale: { translationGroup: source.translationGroup, locale: input.locale } } })) {
        throw new UserError("A translation in this language already exists.");
      }
      group = source.translationGroup;
      blocks = parseBlocks(source.blocks).blocks;
      extra = {
        headerVariant: source.headerVariant,
        footerVariant: source.footerVariant,
        featuredImageId: source.featuredImageId,
        ogImageId: source.ogImageId,
        excerpt: source.excerpt,
      };
      // Translate the parent too when it exists in the target language.
      if (source.parentId && !input.parentId) {
        const parent = await db.page.findUnique({ where: { id: source.parentId } });
        const tParent = parent ? await db.page.findUnique({ where: { translationGroup_locale: { translationGroup: parent.translationGroup, locale: input.locale } } }) : null;
        if (tParent) input.parentId = tParent.id;
      }
    }
    const path = await computePath(input.locale, input.slug, input.parentId ?? null);
    try {
      const page = await db.page.create({
        data: {
          translationGroup: group,
          locale: input.locale,
          title: input.title,
          slug: input.slug,
          path,
          parentId: input.parentId ?? null,
          blocks: blocks as object[],
          status: "DRAFT",
          authorId: user.id,
          ...extra,
        },
      });
      await saveRevision("PAGE", page.id, snapshot(page), user.id, input.translationOf ? "Translation created" : "Created");
      await audit({ userId: user.id, action: "page.create", entityType: "PAGE", entityId: page.id, summary: `Created page “${page.title}” (${page.locale.toUpperCase()})` });
      await afterChange(page);
      return { id: page.id };
    } catch (err) {
      if (isUniqueError(err)) throw new UserError("Another page already uses this address.", { slug: "This URL is already used in this language." });
      throw err;
    }
  },
);

// ───────── Save ─────────

const pageInput = z.object({
  id: z.string().max(64),
  title: z.string().trim().min(1, "Enter a title.").max(200),
  slug: slugSchema,
  parentId: z.string().max(64).nullable(),
  excerpt: optionalText(500),
  featuredImageId: z.string().max(64).nullable(),
  blocks: z.unknown(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.string().datetime({ offset: true }).nullable().or(z.literal("")).transform((v) => (v ? new Date(v) : null)),
  menuOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
  headerVariant: z.enum(["light", "dark"]),
  footerVariant: z.enum(["default", "seat", "none"]),
  seoTitle: optionalText(200),
  seoDescription: optionalText(400),
  canonicalUrl: z.union([z.literal(""), z.string().trim().max(500).regex(/^(https?:\/\/|\/)/, "Use a full URL or a path starting with /.")]).nullable().optional().transform((v) => v || null),
  ogTitle: optionalText(200),
  ogDescription: optionalText(400),
  ogImageId: z.string().max(64).nullable(),
  noindex: z.boolean(),
  note: z.string().max(200).optional(),
});

export type PageInput = z.input<typeof pageInput>;

export const savePage = adminAction("pages.manage", pageInput, async (input, user) => {
  const existing = await db.page.findUnique({ where: { id: input.id } });
  if (!existing || existing.deletedAt) throw new UserError("This page no longer exists or is in the trash.");
  requirePublish(user, input.status);

  const parsed = blocksSchema.safeParse(input.blocks);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[`blocks.${i.path.join(".")}`] ??= i.message;
    throw new UserError("Some blocks have invalid content. Check the highlighted blocks.", fieldErrors);
  }
  const blocks = parsed.data.map((b) => sanitizeBlock(b));
  if (existing.path === "" && input.slug !== "") throw new UserError("The home page address cannot be changed.", { slug: "The home page has no slug." });
  if (input.slug === "" && existing.path !== "") throw new UserError("Enter a slug.", { slug: "Only the home page can have an empty slug." });

  const path = existing.path === "" ? "" : await computePath(existing.locale, input.slug, input.parentId, existing.id);
  let publishedAt = input.publishedAt;
  if (input.status === "PUBLISHED" && !publishedAt) publishedAt = existing.publishedAt ?? new Date();

  try {
    const page = await db.$transaction(async (tx) => {
      const updated = await tx.page.update({
        where: { id: input.id },
        data: {
          title: input.title,
          slug: input.slug,
          path,
          parentId: input.parentId,
          excerpt: input.excerpt,
          featuredImageId: input.featuredImageId,
          blocks: blocks as object[],
          status: input.status,
          publishedAt,
          menuOrder: input.menuOrder,
          headerVariant: input.headerVariant,
          footerVariant: input.footerVariant,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          canonicalUrl: input.canonicalUrl,
          ogTitle: input.ogTitle,
          ogDescription: input.ogDescription,
          ogImageId: input.ogImageId,
          noindex: input.noindex,
        },
      });
      if (path !== existing.path) await updateDescendantPaths(tx, updated.id, path);
      return updated;
    });
    await saveRevision("PAGE", page.id, snapshot(page), user.id, input.note);
    await audit({
      userId: user.id,
      action: existing.status !== page.status ? `page.status.${page.status.toLowerCase()}` : "page.update",
      entityType: "PAGE",
      entityId: page.id,
      summary: `Updated page “${page.title}” (${page.locale.toUpperCase()})${existing.status !== page.status ? ` → ${page.status}` : ""}`,
    });
    await afterChange(page);
    return { updatedAt: page.updatedAt.toISOString(), path: page.path, publishedAt: page.publishedAt?.toISOString() ?? null, status: page.status };
  } catch (err) {
    if (isUniqueError(err)) throw new UserError("Another page already uses this address.", { slug: "This URL is already used in this language." });
    throw err;
  }
});

export const autosavePage = adminAction(
  "pages.manage",
  z.object({ id: z.string().max(64), data: z.record(z.string(), z.unknown()) }),
  async ({ id, data }, user) => {
    const exists = await db.page.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new UserError("Page not found.");
    // Only structurally valid blocks are kept, so a broken autosave can't break the preview.
    const blocks = parseBlocks(data.blocks).blocks.map((b) => sanitizeBlock(b));
    await saveAutosave("PAGE", id, { ...data, blocks } as Prisma.InputJsonValue, user.id);
    return { savedAt: new Date().toISOString() };
  },
);

export const discardAutosave = adminAction("pages.manage", z.object({ id: z.string().max(64) }), async ({ id }, user) => {
  await db.revision.deleteMany({ where: { entityType: "PAGE", entityId: id, kind: "AUTOSAVE", authorId: user.id } });
  return null;
});

// ───────── Status changes ─────────

const idSchema = z.object({ id: z.string().max(64) });

async function setStatus(id: string, user: SessionUser, data: Prisma.PageUpdateInput, action: string, verb: string) {
  const page = await db.page.update({ where: { id }, data });
  await saveRevision("PAGE", page.id, snapshot(page), user.id, verb);
  await audit({ userId: user.id, action, entityType: "PAGE", entityId: id, summary: `${verb} page “${page.title}” (${page.locale.toUpperCase()})` });
  await afterChange(page);
  return page;
}

export const publishPage = adminAction("content.publish", idSchema, async ({ id }, user) => {
  const p = await db.page.findUnique({ where: { id } });
  if (!p || p.deletedAt) throw new UserError("Page not found.");
  await setStatus(id, user, { status: "PUBLISHED", publishedAt: p.publishedAt && p.publishedAt > new Date() ? p.publishedAt : p.publishedAt ?? new Date() }, "page.publish", "Published");
  return null;
});

export const unpublishPage = adminAction("content.publish", idSchema, async ({ id }, user) => {
  const p = await db.page.findUnique({ where: { id } });
  if (!p) throw new UserError("Page not found.");
  if (p.path === "") throw new UserError("The home page cannot be unpublished.");
  await setStatus(id, user, { status: "DRAFT" }, "page.unpublish", "Unpublished");
  return null;
});

export const schedulePage = adminAction(
  "content.publish",
  z.object({ id: z.string().max(64), publishAt: z.string().datetime({ offset: true }) }),
  async ({ id, publishAt }, user) => {
    const when = new Date(publishAt);
    if (when.getTime() <= Date.now()) throw new UserError("Choose a date in the future.");
    await setStatus(id, user, { status: "PUBLISHED", publishedAt: when }, "page.schedule", "Scheduled");
    return null;
  },
);

export const duplicatePage = adminAction("pages.manage", idSchema, async ({ id }, user) => {
  const src = await db.page.findUnique({ where: { id } });
  if (!src) throw new UserError("Page not found.");
  const baseSlug = (src.slug || "home") + "-copy";
  let slug = baseSlug;
  for (let i = 2; await db.page.findFirst({ where: { locale: src.locale, path: await computePath(src.locale, slug, src.parentId) } }); i++) slug = `${baseSlug}-${i}`;
  const path = await computePath(src.locale, slug, src.parentId);
  const page = await db.page.create({
    data: {
      translationGroup: `page-${randomUUID()}`,
      locale: src.locale,
      title: `${src.title} (copy)`,
      slug,
      path,
      parentId: src.parentId,
      excerpt: src.excerpt,
      featuredImageId: src.featuredImageId,
      blocks: src.blocks as Prisma.InputJsonValue,
      status: "DRAFT",
      headerVariant: src.headerVariant,
      footerVariant: src.footerVariant,
      seoTitle: null,
      seoDescription: src.seoDescription,
      ogImageId: src.ogImageId,
      noindex: src.noindex,
      authorId: user.id,
    },
  });
  await saveRevision("PAGE", page.id, snapshot(page), user.id, `Duplicated from “${src.title}”`);
  await audit({ userId: user.id, action: "page.duplicate", entityType: "PAGE", entityId: page.id, summary: `Duplicated “${src.title}” as “${page.title}”` });
  await afterChange(page);
  return { id: page.id };
});

export const trashPage = adminAction("content.delete", idSchema, async ({ id }, user) => {
  const p = await db.page.findUnique({ where: { id } });
  if (!p) throw new UserError("Page not found.");
  if (p.path === "") throw new UserError("The home page cannot be moved to the trash.");
  await setStatus(id, user, { deletedAt: new Date() }, "page.trash", "Moved to trash");
  return null;
});

export const restorePage = adminAction("content.delete", idSchema, async ({ id }, user) => {
  const p = await db.page.findUnique({ where: { id } });
  if (!p) throw new UserError("Page not found.");
  await setStatus(id, user, { deletedAt: null, status: "DRAFT" }, "page.restore", "Restored");
  return null;
});

export const deletePagePermanently = adminAction("content.delete", idSchema, async ({ id }, user) => {
  const p = await db.page.findUnique({ where: { id } });
  if (!p) throw new UserError("Page not found.");
  if (!p.deletedAt) throw new UserError("Move the page to the trash before deleting it permanently.");
  if (p.path === "") throw new UserError("The home page cannot be deleted.");
  await db.$transaction([
    db.page.updateMany({ where: { parentId: id }, data: { parentId: null } }),
    db.revision.deleteMany({ where: { entityType: "PAGE", entityId: id } }),
    db.page.delete({ where: { id } }),
  ]);
  await clearMediaUsage("PAGE", id);
  await audit({ userId: user.id, action: "page.delete", entityType: "PAGE", entityId: id, summary: `Permanently deleted page “${p.title}” (${p.locale.toUpperCase()})` });
  revalidatePublic();
  return null;
});

export const bulkPages = adminAction(
  "pages.manage",
  z.object({ ids: z.array(z.string().max(64)).min(1).max(200), action: z.enum(["publish", "unpublish", "trash", "restore", "delete"]) }),
  async ({ ids, action }, user) => {
    const needs = action === "publish" || action === "unpublish" ? "content.publish" : "content.delete";
    if (!can(user.role, needs)) throw new UserError("You do not have permission to do that.");
    const pages = await db.page.findMany({ where: { id: { in: ids } } });
    let done = 0;
    const skipped: string[] = [];
    for (const p of pages) {
      const home = p.path === "";
      if (action === "publish" && !p.deletedAt) {
        await setStatus(p.id, user, { status: "PUBLISHED", publishedAt: p.publishedAt ?? new Date() }, "page.publish", "Published");
      } else if (action === "unpublish" && !home) {
        await setStatus(p.id, user, { status: "DRAFT" }, "page.unpublish", "Unpublished");
      } else if (action === "trash" && !home && !p.deletedAt) {
        await setStatus(p.id, user, { deletedAt: new Date() }, "page.trash", "Moved to trash");
      } else if (action === "restore" && p.deletedAt) {
        await setStatus(p.id, user, { deletedAt: null, status: "DRAFT" }, "page.restore", "Restored");
      } else if (action === "delete" && p.deletedAt && !home) {
        await db.$transaction([
          db.page.updateMany({ where: { parentId: p.id }, data: { parentId: null } }),
          db.revision.deleteMany({ where: { entityType: "PAGE", entityId: p.id } }),
          db.page.delete({ where: { id: p.id } }),
        ]);
        await clearMediaUsage("PAGE", p.id);
        await audit({ userId: user.id, action: "page.delete", entityType: "PAGE", entityId: p.id, summary: `Permanently deleted page “${p.title}”` });
      } else {
        skipped.push(p.title);
        continue;
      }
      done++;
    }
    revalidatePublic();
    return { done, skipped };
  },
);

// ───────── Revisions ─────────

export const getPageRevisions = adminAction("pages.manage", idSchema, async ({ id }) => {
  const rows = await listRevisions("PAGE", id);
  return rows.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString(), note: r.note, author: r.author?.name ?? "Unknown" }));
});

export const getRevisionData = adminAction("pages.manage", z.object({ revisionId: z.string().max(64) }), async ({ revisionId }) => {
  const rev = await db.revision.findUnique({ where: { id: revisionId } });
  if (!rev || rev.entityType !== "PAGE") throw new UserError("Revision not found.");
  return rev.data as Record<string, unknown>;
});

export const restoreRevision = adminAction("pages.manage", z.object({ revisionId: z.string().max(64) }), async ({ revisionId }, user) => {
  const rev = await db.revision.findUnique({ where: { id: revisionId } });
  if (!rev || rev.entityType !== "PAGE") throw new UserError("Revision not found.");
  const page = await db.page.findUnique({ where: { id: rev.entityId } });
  if (!page) throw new UserError("Page not found.");
  const d = rev.data as Record<string, unknown>;
  const blocks = parseBlocks(d.blocks).blocks.map((b) => sanitizeBlock(b));
  // Content and SEO are restored; the address and status stay as they are now, to avoid
  // silently unpublishing or moving a live page.
  const updated = await db.page.update({
    where: { id: page.id },
    data: {
      title: typeof d.title === "string" ? d.title : page.title,
      excerpt: (d.excerpt as string | null) ?? null,
      featuredImageId: (d.featuredImageId as string | null) ?? null,
      blocks: blocks as object[],
      headerVariant: typeof d.headerVariant === "string" ? d.headerVariant : page.headerVariant,
      footerVariant: typeof d.footerVariant === "string" ? d.footerVariant : page.footerVariant,
      seoTitle: (d.seoTitle as string | null) ?? null,
      seoDescription: (d.seoDescription as string | null) ?? null,
      ogTitle: (d.ogTitle as string | null) ?? null,
      ogDescription: (d.ogDescription as string | null) ?? null,
      ogImageId: (d.ogImageId as string | null) ?? null,
    },
  });
  await saveRevision("PAGE", page.id, snapshot(updated), user.id, `Restored revision from ${rev.createdAt.toISOString().slice(0, 16).replace("T", " ")}`);
  await audit({ userId: user.id, action: "page.restore_revision", entityType: "PAGE", entityId: page.id, summary: `Restored an earlier revision of “${updated.title}”` });
  await afterChange(updated);
  return null;
});
