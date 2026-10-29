"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, isUniqueError, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { clearMediaUsage, syncMediaUsage } from "@/lib/media/usage";
import { slugify } from "@/components/admin/events/slug";

const TIERS = ["CO_ORGANIZER", "SUPPORTER", "SPONSOR", "PARTNER", "MEDIA_PARTNER"] as const;

const partnerInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: z.string().trim().max(100).default(""),
  logoId: z.string().max(64).nullable().default(null),
  websiteUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Enter a full URL starting with https://")
    .transform((v) => v || null),
  tier: z.enum(TIERS).default("PARTNER"),
  order: z.number().int().min(0).max(100_000).default(0),
  published: z.boolean().default(true),
});

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "partner";
  for (let i = 0; i < 50; i++) {
    const candidate = i ? `${root}-${i + 1}` : root;
    const hit = await db.partner.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit || hit.id === excludeId) return candidate;
  }
  throw new UserError("Could not create a unique slug.");
}

export const savePartner = adminAction("events.manage", partnerInput, async (input, user) => {
  const slug = input.slug ? slugify(input.slug) : await uniqueSlug(input.name, input.id);
  const data = { name: input.name, slug, logoId: input.logoId, websiteUrl: input.websiteUrl, tier: input.tier, order: input.order, published: input.published };
  try {
    const row = input.id
      ? await db.partner.update({ where: { id: input.id }, data })
      : await db.partner.create({ data: { ...data, order: input.order || (await db.partner.count()) } });
    await syncMediaUsage("PARTNER", row.id, `Partner: ${row.name}`, [row.logoId]);
    await audit({ userId: user.id, action: input.id ? "partner.update" : "partner.create", entityType: "PARTNER", entityId: row.id, summary: `${input.id ? "Updated" : "Created"} partner ${row.name}` });
    revalidatePublic();
    return { id: row.id };
  } catch (err) {
    if (isUniqueError(err)) throw new UserError("Another partner already uses this slug.", { slug: "Already in use." });
    throw err;
  }
});

export const setPartnerPublished = adminAction("events.manage", z.object({ id: z.string(), published: z.boolean() }), async ({ id, published }, user) => {
  const row = await db.partner.update({ where: { id }, data: { published } });
  await audit({ userId: user.id, action: published ? "partner.publish" : "partner.unpublish", entityType: "PARTNER", entityId: id, summary: `${published ? "Published" : "Hid"} partner ${row.name}` });
  revalidatePublic();
  return null;
});

export const reorderPartners = adminAction("events.manage", z.object({ ids: z.array(z.string()).max(2000) }), async ({ ids }, user) => {
  await db.$transaction(ids.map((id, order) => db.partner.update({ where: { id }, data: { order } })));
  await audit({ userId: user.id, action: "partner.reorder", entityType: "PARTNER", summary: `Reordered ${ids.length} partners` });
  revalidatePublic();
  return null;
});

/** Remove from every page's partner blocks too, so no page keeps a dangling id. */
export const deletePartner = adminAction("events.manage", z.object({ id: z.string() }), async ({ id }, user) => {
  const row = await db.partner.findUnique({ where: { id } });
  if (!row) throw new UserError("Partner not found.");
  const pages = await db.page.findMany({ select: { id: true, blocks: true } });
  await db.$transaction(async (tx) => {
    for (const p of pages) {
      if (!JSON.stringify(p.blocks).includes(`"${id}"`)) continue;
      const blocks = (Array.isArray(p.blocks) ? p.blocks : []) as Record<string, unknown>[];
      const strip = (list: Record<string, unknown>[]): Record<string, unknown>[] =>
        list.map((b) => {
          if (b.type === "partners" && Array.isArray(b.groups)) {
            return { ...b, groups: (b.groups as { partnerIds: string[] }[]).map((g) => ({ ...g, partnerIds: g.partnerIds.filter((x) => x !== id) })) };
          }
          if (b.type === "columns" && Array.isArray(b.columns)) {
            return { ...b, columns: (b.columns as { blocks: Record<string, unknown>[] }[]).map((c) => ({ ...c, blocks: strip(c.blocks ?? []) })) };
          }
          return b;
        });
      await tx.page.update({ where: { id: p.id }, data: { blocks: strip(blocks) as object[] } });
    }
    await tx.partner.delete({ where: { id } });
  });
  await clearMediaUsage("PARTNER", id);
  await audit({ userId: user.id, action: "partner.delete", entityType: "PARTNER", entityId: id, summary: `Deleted partner ${row.name}` });
  revalidatePublic();
  return null;
});

export const searchPartners = adminAction("events.manage", z.object({ q: z.string().max(100).default("") }), async ({ q }) => {
  const rows = await db.partner.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    orderBy: [{ order: "asc" }, { name: "asc" }],
    take: 40,
    include: { logo: { select: { storageKey: true } } },
  });
  const { mediaUrl } = await import("@/lib/media-url");
  return rows.map((r) => ({ id: r.id, name: r.name, tier: r.tier, logoUrl: r.logo ? mediaUrl(r.logo.storageKey) : null }));
});
