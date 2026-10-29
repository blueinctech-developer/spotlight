"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { mediaUrl } from "@/lib/media-url";
import { getAllSettings } from "@/lib/settings";
import type { Prisma } from "@/generated/prisma/client";

export type LibraryItem = {
  id: string;
  url: string;
  filename: string;
  title: string | null;
  alt: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  size: number;
  createdAt: string;
  usageCount: number;
};

const listSchema = z.object({
  search: z.string().max(100).default(""),
  type: z.enum(["all", "image", "document", "svg"]).default("all"),
  unusedOnly: z.boolean().default(false),
  sort: z.enum(["newest", "oldest", "name", "size"]).default("newest"),
  page: z.number().int().min(1).default(1),
});

/** Ids referenced outside MediaUsage (relations, galleries, settings). */
async function relationRefs(): Promise<Set<string>> {
  const [speakers, partners, testimonials, events, settings] = await Promise.all([
    db.speaker.findMany({ where: { photoId: { not: null } }, select: { photoId: true } }),
    db.partner.findMany({ where: { logoId: { not: null } }, select: { logoId: true } }),
    db.testimonial.findMany({ select: { photoId: true, logoId: true } }),
    db.event.findMany({ select: { bannerId: true, galleryIds: true } }),
    getAllSettings(),
  ]);
  const ids = new Set<string>();
  speakers.forEach((s) => s.photoId && ids.add(s.photoId));
  partners.forEach((p) => p.logoId && ids.add(p.logoId));
  testimonials.forEach((t) => { if (t.photoId) ids.add(t.photoId); if (t.logoId) ids.add(t.logoId); });
  events.forEach((e) => { if (e.bannerId) ids.add(e.bannerId); e.galleryIds.forEach((g) => ids.add(g)); });
  [settings.general.logoId, settings.general.faviconId, settings.seo.ogImageId].forEach((x) => x && ids.add(x));
  return ids;
}

export const listLibrary = adminAction("media.upload", listSchema, async ({ search, type, unusedOnly, sort, page }) => {
  const perPage = 48;
  const and: Prisma.MediaAssetWhereInput[] = [];
  if (search) {
    and.push({
      OR: [
        { filename: { contains: search, mode: "insensitive" } },
        { alt: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (type === "image") and.push({ mimeType: { startsWith: "image/" }, NOT: { mimeType: "image/svg+xml" } });
  if (type === "svg") and.push({ mimeType: "image/svg+xml" });
  if (type === "document") and.push({ NOT: { mimeType: { startsWith: "image/" } } });
  if (unusedOnly) {
    const refs = await relationRefs();
    and.push({ usages: { none: {} } });
    if (refs.size) and.push({ id: { notIn: [...refs] } });
  }
  const where: Prisma.MediaAssetWhereInput = and.length ? { AND: and } : {};
  const orderBy: Prisma.MediaAssetOrderByWithRelationInput =
    sort === "oldest" ? { createdAt: "asc" } : sort === "name" ? { filename: "asc" } : sort === "size" ? { size: "desc" } : { createdAt: "desc" };
  const [total, rows] = await Promise.all([
    db.mediaAsset.count({ where }),
    db.mediaAsset.findMany({ where, orderBy, skip: (page - 1) * perPage, take: perPage, include: { _count: { select: { usages: true } } } }),
  ]);
  return {
    total,
    hasMore: page * perPage < total,
    items: rows.map<LibraryItem>((r) => ({
      id: r.id, url: mediaUrl(r.storageKey), filename: r.filename, title: r.title, alt: r.alt, mimeType: r.mimeType,
      width: r.width, height: r.height, size: r.size, createdAt: r.createdAt.toISOString(), usageCount: r._count.usages,
    })),
  };
});

export type UsageRef = { label: string; href: string | null };

async function usageFor(id: string): Promise<UsageRef[]> {
  const asset = await db.mediaAsset.findUnique({
    where: { id },
    include: {
      usages: true,
      speakerPhotos: { select: { id: true, name: true } },
      partnerLogos: { select: { id: true, name: true } },
      testimonialPhotos: { select: { id: true, name: true } },
      testimonialLogos: { select: { id: true, name: true } },
      eventBanners: { select: { id: true, title: true } },
    },
  });
  if (!asset) return [];
  const hrefFor: Record<string, (eid: string) => string> = {
    PAGE: (e) => `/admin/pages/${e}/`,
    POST: (e) => `/admin/posts/${e}/`,
    EVENT: (e) => `/admin/events/${e}/`,
    SPEAKER: () => "/admin/speakers/",
    PARTNER: () => "/admin/partners/",
    TESTIMONIAL: () => "/admin/testimonials/",
    SETTINGS: () => "/admin/settings/",
  };
  const out: UsageRef[] = asset.usages.map((u) => ({ label: u.label, href: hrefFor[u.entityType]?.(u.entityId) ?? null }));
  asset.speakerPhotos.forEach((s) => out.push({ label: `Speaker photo: ${s.name}`, href: "/admin/speakers/" }));
  asset.partnerLogos.forEach((p) => out.push({ label: `Partner logo: ${p.name}`, href: "/admin/partners/" }));
  asset.testimonialPhotos.forEach((t) => out.push({ label: `Testimonial photo: ${t.name}`, href: "/admin/testimonials/" }));
  asset.testimonialLogos.forEach((t) => out.push({ label: `Testimonial logo: ${t.name}`, href: "/admin/testimonials/" }));
  asset.eventBanners.forEach((e) => out.push({ label: `Event banner: ${e.title}`, href: `/admin/events/${e.id}/` }));
  const galleries = await db.event.findMany({ where: { galleryIds: { has: id } }, select: { id: true, title: true } });
  galleries.forEach((e) => out.push({ label: `Event gallery: ${e.title}`, href: `/admin/events/${e.id}/` }));
  const s = await getAllSettings();
  if (s.general.logoId === id) out.push({ label: "Site logo (Settings)", href: "/admin/settings/" });
  if (s.general.faviconId === id) out.push({ label: "Favicon (Settings)", href: "/admin/settings/" });
  if (s.seo.ogImageId === id) out.push({ label: "Default social image (Settings)", href: "/admin/settings/" });
  return out;
}

export type MediaDetail = LibraryItem & {
  altFr: string | null;
  caption: string | null;
  description: string | null;
  uploadedBy: string | null;
  storageKey: string;
  usage: UsageRef[];
};

export const getMediaDetail = adminAction("media.upload", z.object({ id: z.string().max(64) }), async ({ id }) => {
  const r = await db.mediaAsset.findUnique({ where: { id }, include: { uploadedBy: { select: { name: true } }, _count: { select: { usages: true } } } });
  if (!r) throw new UserError("This file no longer exists.");
  const usage = await usageFor(id);
  return {
    id: r.id, url: mediaUrl(r.storageKey), filename: r.filename, title: r.title, alt: r.alt, altFr: r.altFr, caption: r.caption,
    description: r.description, mimeType: r.mimeType, width: r.width, height: r.height, size: r.size,
    createdAt: r.createdAt.toISOString(), usageCount: usage.length, uploadedBy: r.uploadedBy?.name ?? null,
    storageKey: r.storageKey, usage,
  } satisfies MediaDetail;
});

const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null);

export const updateMediaMeta = adminAction(
  "media.manage",
  z.object({
    id: z.string().max(64),
    title: opt(200),
    alt: z.string().trim().max(300),
    altFr: opt(300),
    caption: opt(500),
    description: opt(2000),
  }),
  async ({ id, ...data }, user) => {
    const row = await db.mediaAsset.update({ where: { id }, data });
    await audit({ userId: user.id, action: "media.update", entityType: "MEDIA", entityId: id, summary: `Updated details of ${row.filename}` });
    revalidatePublic();
    return { id };
  },
);

async function deleteOne(id: string, userId: string): Promise<{ deleted: boolean; filename: string; reason?: string }> {
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return { deleted: false, filename: id, reason: "not found" };
  const usage = await usageFor(id);
  if (usage.length) return { deleted: false, filename: asset.filename, reason: `in use (${usage.length})` };
  await db.mediaAsset.delete({ where: { id } });
  await storage().delete(asset.storageKey).catch((e) => console.error("storage delete failed", e));
  await audit({ userId, action: "media.delete", entityType: "MEDIA", entityId: id, summary: `Deleted ${asset.filename}` });
  return { deleted: true, filename: asset.filename };
}

export const deleteMedia = adminAction("media.manage", z.object({ id: z.string().max(64) }), async ({ id }, user) => {
  const r = await deleteOne(id, user.id);
  if (!r.deleted) throw new UserError(r.reason?.startsWith("in use") ? "This file is still used on the site. Remove it from those places first." : "File not found.");
  return r;
});

export const bulkDeleteMedia = adminAction("media.manage", z.object({ ids: z.array(z.string().max(64)).min(1).max(200) }), async ({ ids }, user) => {
  const results = [];
  for (const id of ids) results.push(await deleteOne(id, user.id));
  return {
    deleted: results.filter((r) => r.deleted).length,
    skipped: results.filter((r) => !r.deleted).map((r) => `${r.filename} (${r.reason})`),
  };
});
