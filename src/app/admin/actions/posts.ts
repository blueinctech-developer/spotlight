"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, isUniqueError, revalidatePublic, UserError } from "@/lib/admin/action";
import { can, canEditPost } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { sanitizeRichText } from "@/lib/sanitize";
import { saveAutosave, saveRevision } from "@/lib/admin/revisions";
import { syncMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { audit } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

// ───────── Shared ─────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const optText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));
const id = z.string().min(1).max(64);

const postFields = z.object({
  title: z.string().trim().min(1, "Add a title.").max(300),
  slug: z
    .string()
    .trim()
    .max(160)
    .transform((v) => slugify(v))
    .default(""),
  excerpt: optText(1000),
  content: z.string().max(500_000).default(""),
  featuredImageId: id.nullish().transform((v) => v ?? null),
  categoryIds: z.array(id).max(50).default([]),
  tagIds: z.array(id).max(100).default([]),
  authorDisplayName: optText(150),
  seoTitle: optText(200),
  seoDescription: optText(400),
  canonicalUrl: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .refine((v) => !v || /^(https?:\/\/|\/)/.test(v), "Use a full URL or a path starting with /.")
    .transform((v) => v || null),
  ogTitle: optText(200),
  ogDescription: optText(400),
  ogImageId: id.nullish().transform((v) => v ?? null),
  noindex: z.boolean().default(false),
});
export type PostFields = z.input<typeof postFields>;

export type PostSnapshot = z.infer<typeof postFields>;

const intentSchema = z.enum(["draft", "review", "publish", "update", "unpublish"]);

type PostRow = NonNullable<Awaited<ReturnType<typeof loadPost>>>;
async function loadPost(postId: string) {
  return db.post.findUnique({ where: { id: postId }, include: { categories: true, tags: true } });
}

async function requirePost(postId: string, user: SessionUser): Promise<PostRow> {
  const post = await loadPost(postId);
  if (!post) throw new UserError("This post no longer exists.");
  if (!canEditPost(user, post)) throw new UserError("You do not have permission to edit this post.");
  return post;
}

function snapshotOf(post: PostRow): PostSnapshot {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    featuredImageId: post.featuredImageId,
    categoryIds: post.categories.map((c) => c.categoryId),
    tagIds: post.tags.map((t) => t.tagId),
    authorDisplayName: post.authorDisplayName,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    canonicalUrl: post.canonicalUrl,
    ogTitle: post.ogTitle,
    ogDescription: post.ogDescription,
    ogImageId: post.ogImageId,
    noindex: post.noindex,
  };
}

async function afterChange(postId: string, user: SessionUser, action: string, summary: string, opts: { revision?: boolean } = {}) {
  const post = await loadPost(postId);
  if (!post) return;
  if (opts.revision !== false) await saveRevision("POST", post.id, snapshotOf(post) as unknown as Prisma.InputJsonValue, user.id, summary);
  await syncMediaUsage("POST", post.id, `Post: ${post.title}`, [post.featuredImageId, post.ogImageId], [post.content]);
  await audit({ userId: user.id, action, entityType: "POST", entityId: post.id, summary });
  revalidatePublic();
}

/** Only existing taxonomy ids are linked (ignore stale ids silently). */
async function validTaxonomies(categoryIds: string[], tagIds: string[]) {
  const [cats, tags] = await Promise.all([
    categoryIds.length ? db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true } }) : [],
    tagIds.length ? db.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true } }) : [],
  ]);
  return { categoryIds: cats.map((c) => c.id), tagIds: tags.map((t) => t.id) };
}

async function uniqueSlug(locale: "en" | "fr", base: string, excludeId?: string) {
  const root = base || "post";
  for (let i = 0; i < 200; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await db.post.findFirst({ where: { locale, slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (!hit) return candidate;
  }
  return `${root}-${Date.now()}`;
}

// ───────── Save / create ─────────

const saveSchema = postFields.extend({
  id: id.optional(),
  locale: z.enum(["en", "fr"]).default("en"),
  translationOf: id.optional(),
  intent: intentSchema,
  /** ISO date-time for publication; future = scheduled. */
  publishedAt: z
    .string()
    .nullish()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date.")
    .transform((v) => (v ? new Date(v) : null)),
});

export const savePost = adminAction("content.edit_own", saveSchema, async (input, user) => {
  const canPublish = can(user.role, "content.publish");
  if (!canPublish && !["draft", "review"].includes(input.intent)) {
    throw new UserError("You can save drafts and submit posts for review. An editor will publish them.");
  }

  const existing = input.id ? await requirePost(input.id, user) : null;
  const locale = existing ? existing.locale : input.locale;

  // Translation group: new standalone post, or translation of an existing one.
  let translationGroup = existing?.translationGroup;
  if (!existing) {
    if (input.translationOf) {
      const source = await db.post.findUnique({ where: { id: input.translationOf }, select: { translationGroup: true } });
      if (!source) throw new UserError("The original post no longer exists.");
      const clash = await db.post.findFirst({ where: { translationGroup: source.translationGroup, locale }, select: { id: true } });
      if (clash) throw new UserError(`A ${locale.toUpperCase()} version of this post already exists.`);
      translationGroup = source.translationGroup;
    } else {
      translationGroup = `post-${crypto.randomUUID()}`;
    }
  }

  let status = existing?.status ?? "DRAFT";
  let publishedAt = existing?.publishedAt ?? null;
  switch (input.intent) {
    case "draft":
      if (existing?.status === "PUBLISHED") throw new UserError("Use Update to save a published post, or Unpublish it first.");
      status = "DRAFT";
      publishedAt = input.publishedAt;
      break;
    case "review":
      status = "PENDING_REVIEW";
      publishedAt = input.publishedAt;
      break;
    case "publish":
      status = "PUBLISHED";
      publishedAt = input.publishedAt ?? new Date();
      break;
    case "update":
      if (status === "PUBLISHED") publishedAt = input.publishedAt ?? publishedAt ?? new Date();
      else publishedAt = input.publishedAt;
      break;
    case "unpublish":
      status = "DRAFT";
      break;
  }

  const slug = input.slug || slugify(input.title) || "post";
  const { categoryIds, tagIds } = await validTaxonomies(input.categoryIds, input.tagIds);
  const data = {
    title: input.title,
    slug,
    excerpt: input.excerpt,
    content: sanitizeRichText(input.content),
    featuredImageId: input.featuredImageId,
    authorDisplayName: input.authorDisplayName,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    canonicalUrl: input.canonicalUrl,
    ogTitle: input.ogTitle,
    ogDescription: input.ogDescription,
    ogImageId: input.ogImageId,
    noindex: input.noindex,
    status,
    publishedAt,
  };

  let postId: string;
  try {
    postId = await db.$transaction(async (tx) => {
      const row = existing
        ? await tx.post.update({ where: { id: existing.id }, data })
        : await tx.post.create({ data: { ...data, locale, translationGroup: translationGroup!, authorId: user.id } });
      await tx.postCategory.deleteMany({ where: { postId: row.id } });
      await tx.postTag.deleteMany({ where: { postId: row.id } });
      if (categoryIds.length) await tx.postCategory.createMany({ data: categoryIds.map((categoryId) => ({ postId: row.id, categoryId })) });
      if (tagIds.length) await tx.postTag.createMany({ data: tagIds.map((tagId) => ({ postId: row.id, tagId })) });
      return row.id;
    });
  } catch (err) {
    if (isUniqueError(err)) {
      throw new UserError("Another post in this language already uses this URL slug.", { slug: "This slug is already used by another post." });
    }
    throw err;
  }

  const verb =
    input.intent === "publish"
      ? publishedAt && publishedAt.getTime() > Date.now() ? "Scheduled" : "Published"
      : input.intent === "review" ? "Submitted for review" : input.intent === "unpublish" ? "Unpublished" : existing ? "Updated" : "Created";
  await afterChange(postId, user, `post.${input.intent}`, `${verb} post “${input.title}” (${locale.toUpperCase()})`);
  const saved = await db.post.findUniqueOrThrow({ where: { id: postId }, select: { id: true, slug: true, status: true, publishedAt: true, updatedAt: true } });
  return { ...saved, publishedAt: saved.publishedAt?.toISOString() ?? null, updatedAt: saved.updatedAt.toISOString(), message: verb };
});

// ───────── Autosave ─────────

export const autosavePost = adminAction(
  "content.edit_own",
  postFields.partial().extend({ id, title: z.string().max(300).default("") }),
  async (input, user) => {
    const post = await requirePost(input.id, user);
    const { id: _id, ...rest } = input;
    const snapshot = { ...snapshotOf(post), ...rest, content: sanitizeRichText(rest.content ?? post.content) };
    await saveAutosave("POST", post.id, snapshot as unknown as Prisma.InputJsonValue, user.id);
    return { savedAt: new Date().toISOString() };
  },
);

export const discardAutosave = adminAction("content.edit_own", z.object({ id }), async ({ id: postId }, user) => {
  await requirePost(postId, user);
  await db.revision.deleteMany({ where: { entityType: "POST", entityId: postId, kind: "AUTOSAVE", authorId: user.id } });
  return null;
});

// ───────── Revisions ─────────

export const getRevision = adminAction("content.edit_own", z.object({ revisionId: id }), async ({ revisionId }, user) => {
  const rev = await db.revision.findUnique({ where: { id: revisionId } });
  if (!rev || rev.entityType !== "POST") throw new UserError("Revision not found.");
  await requirePost(rev.entityId, user);
  const parsed = postFields.safeParse(rev.data);
  if (!parsed.success) throw new UserError("This revision could not be read.");
  return parsed.data;
});

// ───────── Status changes, trash, duplicate ─────────

export const setPostStatus = adminAction(
  "content.publish",
  z.object({ id, action: z.enum(["publish", "unpublish", "archive"]) }),
  async ({ id: postId, action }, user) => {
    const post = await requirePost(postId, user);
    if (post.deletedAt) throw new UserError("Restore the post from the trash first.");
    const data =
      action === "publish"
        ? { status: "PUBLISHED" as const, publishedAt: post.publishedAt ?? new Date() }
        : action === "unpublish"
          ? { status: "DRAFT" as const }
          : { status: "ARCHIVED" as const };
    await db.post.update({ where: { id: postId }, data });
    await afterChange(postId, user, `post.${action}`, `${action === "publish" ? "Published" : action === "unpublish" ? "Unpublished" : "Archived"} post “${post.title}”`);
    return null;
  },
);

async function trashOne(postId: string, user: SessionUser) {
  const post = await requirePost(postId, user);
  if (post.status === "PUBLISHED" && !can(user.role, "content.publish")) throw new UserError("Only editors can trash published posts.");
  await db.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
  await afterChange(postId, user, "post.trash", `Moved post “${post.title}” to trash`, { revision: false });
}

async function restoreOne(postId: string, user: SessionUser) {
  const post = await requirePost(postId, user);
  await db.post.update({ where: { id: postId }, data: { deletedAt: null } });
  await afterChange(postId, user, "post.restore", `Restored post “${post.title}” from trash`, { revision: false });
}

async function deleteOne(postId: string, user: SessionUser) {
  if (!can(user.role, "content.delete")) throw new UserError("You do not have permission to delete posts permanently.");
  const post = await requirePost(postId, user);
  if (!post.deletedAt) throw new UserError("Move the post to the trash before deleting it permanently.");
  await db.$transaction([
    db.revision.deleteMany({ where: { entityType: "POST", entityId: postId } }),
    db.post.delete({ where: { id: postId } }),
  ]);
  await clearMediaUsage("POST", postId);
  await audit({ userId: user.id, action: "post.delete", entityType: "POST", entityId: postId, summary: `Permanently deleted post “${post.title}”` });
  revalidatePublic();
}

export const trashPost = adminAction("content.edit_own", z.object({ id }), async ({ id: postId }, user) => {
  await trashOne(postId, user);
  return null;
});
export const restorePost = adminAction("content.edit_own", z.object({ id }), async ({ id: postId }, user) => {
  await restoreOne(postId, user);
  return null;
});
export const deletePost = adminAction("content.delete", z.object({ id }), async ({ id: postId }, user) => {
  await deleteOne(postId, user);
  return null;
});

export const duplicatePost = adminAction("content.edit_own", z.object({ id }), async ({ id: postId }, user) => {
  const post = await requirePost(postId, user);
  const slug = await uniqueSlug(post.locale, `${post.slug}-copy`);
  const copy = await db.post.create({
    data: {
      translationGroup: `post-${crypto.randomUUID()}`,
      locale: post.locale,
      title: `${post.title} (copy)`,
      slug,
      excerpt: post.excerpt,
      content: post.content,
      featuredImageId: post.featuredImageId,
      authorDisplayName: post.authorDisplayName,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      ogTitle: post.ogTitle,
      ogDescription: post.ogDescription,
      ogImageId: post.ogImageId,
      noindex: post.noindex,
      status: "DRAFT",
      authorId: user.id,
      categories: { create: post.categories.map((c) => ({ categoryId: c.categoryId })) },
      tags: { create: post.tags.map((t) => ({ tagId: t.tagId })) },
    },
  });
  await afterChange(copy.id, user, "post.duplicate", `Duplicated post “${post.title}”`);
  return { id: copy.id };
});

// ───────── Bulk ─────────

export const bulkPosts = adminAction(
  "content.edit_own",
  z.object({ ids: z.array(id).min(1).max(200), action: z.enum(["trash", "restore", "delete", "publish", "unpublish"]) }),
  async ({ ids, action }, user) => {
    let done = 0;
    const failed: string[] = [];
    for (const postId of ids) {
      try {
        if (action === "trash") await trashOne(postId, user);
        else if (action === "restore") await restoreOne(postId, user);
        else if (action === "delete") await deleteOne(postId, user);
        else {
          if (!can(user.role, "content.publish")) throw new UserError("Only editors can publish.");
          const post = await requirePost(postId, user);
          if (post.deletedAt) throw new UserError("In trash");
          await db.post.update({
            where: { id: postId },
            data: action === "publish" ? { status: "PUBLISHED", publishedAt: post.publishedAt ?? new Date() } : { status: "DRAFT" },
          });
          await afterChange(postId, user, `post.${action}`, `${action === "publish" ? "Published" : "Unpublished"} post “${post.title}” (bulk)`);
        }
        done++;
      } catch (e) {
        failed.push(e instanceof Error ? e.message : postId);
      }
    }
    return { done, failed: failed.length, firstError: failed[0] ?? null };
  },
);
