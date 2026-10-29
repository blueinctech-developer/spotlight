"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction } from "@/lib/admin/action";
import { mediaUrl } from "@/lib/media-url";

export type PickerItem = {
  id: string; url: string; filename: string; alt: string; mimeType: string; width: number | null; height: number | null; size: number; createdAt: string;
};

/** Paged media listing for the picker dialog used inside every editor. */
export const listMediaForPicker = adminAction(
  "media.upload",
  z.object({
    search: z.string().max(100).default(""),
    type: z.enum(["all", "image", "document"]).default("all"),
    page: z.number().int().min(1).default(1),
  }),
  async ({ search, type, page }) => {
    const perPage = 40;
    const where = {
      ...(search ? { OR: [{ filename: { contains: search, mode: "insensitive" as const } }, { alt: { contains: search, mode: "insensitive" as const } }, { title: { contains: search, mode: "insensitive" as const } }] } : {}),
      ...(type === "image" ? { mimeType: { startsWith: "image/" } } : type === "document" ? { NOT: { mimeType: { startsWith: "image/" } } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.mediaAsset.count({ where }),
      db.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }),
    ]);
    return {
      total,
      hasMore: page * perPage < total,
      items: rows.map<PickerItem>((r) => ({
        id: r.id, url: mediaUrl(r.storageKey), filename: r.filename, alt: r.alt, mimeType: r.mimeType,
        width: r.width, height: r.height, size: r.size, createdAt: r.createdAt.toISOString(),
      })),
    };
  },
);

/** Resolve ids → preview data (for showing currently selected media in forms). */
export const getMediaByIds = adminAction(null, z.object({ ids: z.array(z.string().max(64)).max(200) }), async ({ ids }) => {
  if (!ids.length) return [];
  const rows = await db.mediaAsset.findMany({ where: { id: { in: ids } } });
  return rows.map<PickerItem>((r) => ({
    id: r.id, url: mediaUrl(r.storageKey), filename: r.filename, alt: r.alt, mimeType: r.mimeType,
    width: r.width, height: r.height, size: r.size, createdAt: r.createdAt.toISOString(),
  }));
});
