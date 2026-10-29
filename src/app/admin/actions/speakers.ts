"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, isUniqueError, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { sanitizeRichText } from "@/lib/sanitize";
import { clearMediaUsage, syncMediaUsage } from "@/lib/media/usage";
import { slugify } from "@/components/admin/events/slug";

const optUrl = z
  .string()
  .trim()
  .max(500)
  .default("")
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Enter a full URL starting with https://")
  .transform((v) => v || null);
const optText = (max: number) => z.string().trim().max(max).default("").transform((v) => v || null);

const speakerInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required.").max(150),
  slug: z.string().trim().max(100).default(""),
  jobTitle: optText(200),
  jobTitleFr: optText(200),
  organization: optText(200),
  bio: z.string().max(50_000).default(""),
  bioFr: z.string().max(50_000).default(""),
  photoId: z.string().max(64).nullable().default(null),
  website: optUrl,
  linkedin: optUrl,
  twitter: optUrl,
  order: z.number().int().min(0).max(100_000).default(0),
  published: z.boolean().default(true),
});

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "speaker";
  for (let i = 0; i < 50; i++) {
    const candidate = i ? `${root}-${i + 1}` : root;
    const hit = await db.speaker.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit || hit.id === excludeId) return candidate;
  }
  throw new UserError("Could not create a unique slug.");
}

export const saveSpeaker = adminAction("events.manage", speakerInput, async (input, user) => {
  const slug = input.slug ? slugify(input.slug) : await uniqueSlug(input.name, input.id);
  if (!slug) throw new UserError("Enter a valid slug.", { slug: "Use letters, numbers and dashes." });
  const data = {
    name: input.name,
    slug,
    jobTitle: input.jobTitle,
    jobTitleFr: input.jobTitleFr,
    organization: input.organization,
    bio: sanitizeRichText(input.bio) || null,
    bioFr: sanitizeRichText(input.bioFr) || null,
    photoId: input.photoId,
    website: input.website,
    linkedin: input.linkedin,
    twitter: input.twitter,
    order: input.order,
    published: input.published,
  };
  try {
    const row = input.id
      ? await db.speaker.update({ where: { id: input.id }, data })
      : await db.speaker.create({ data: { ...data, order: input.order || (await db.speaker.count()) } });
    await syncMediaUsage("SPEAKER", row.id, `Speaker: ${row.name}`, [row.photoId], [row.bio ?? "", row.bioFr ?? ""]);
    await audit({ userId: user.id, action: input.id ? "speaker.update" : "speaker.create", entityType: "SPEAKER", entityId: row.id, summary: `${input.id ? "Updated" : "Created"} speaker ${row.name}` });
    revalidatePublic();
    return { id: row.id, slug: row.slug };
  } catch (err) {
    if (isUniqueError(err)) throw new UserError("Another speaker already uses this slug.", { slug: "Already in use." });
    throw err;
  }
});

/** Minimal create used from the programme editor. */
export const quickCreateSpeaker = adminAction(
  "events.manage",
  z.object({ name: z.string().trim().min(1).max(150), jobTitle: z.string().trim().max(200).default("") }),
  async ({ name, jobTitle }, user) => {
    const row = await db.speaker.create({
      data: { name, slug: await uniqueSlug(name), jobTitle: jobTitle || null, order: await db.speaker.count() },
    });
    await audit({ userId: user.id, action: "speaker.create", entityType: "SPEAKER", entityId: row.id, summary: `Created speaker ${row.name}` });
    revalidatePublic();
    return { id: row.id, name: row.name, jobTitle: row.jobTitle, organization: row.organization, photoUrl: null as string | null };
  },
);

export const setSpeakerPublished = adminAction(
  "events.manage",
  z.object({ id: z.string(), published: z.boolean() }),
  async ({ id, published }, user) => {
    const row = await db.speaker.update({ where: { id }, data: { published } });
    await audit({ userId: user.id, action: published ? "speaker.publish" : "speaker.unpublish", entityType: "SPEAKER", entityId: id, summary: `${published ? "Published" : "Unpublished"} speaker ${row.name}` });
    revalidatePublic();
    return null;
  },
);

export const reorderSpeakers = adminAction(
  "events.manage",
  z.object({ ids: z.array(z.string()).max(1000) }),
  async ({ ids }, user) => {
    await db.$transaction(ids.map((id, order) => db.speaker.update({ where: { id }, data: { order } })));
    await audit({ userId: user.id, action: "speaker.reorder", entityType: "SPEAKER", summary: `Reordered ${ids.length} speakers` });
    revalidatePublic();
    return null;
  },
);

export const deleteSpeaker = adminAction("events.manage", z.object({ id: z.string() }), async ({ id }, user) => {
  const row = await db.speaker.findUnique({ where: { id } });
  if (!row) throw new UserError("Speaker not found.");
  await db.$transaction([db.sessionSpeaker.deleteMany({ where: { speakerId: id } }), db.speaker.delete({ where: { id } })]);
  await clearMediaUsage("SPEAKER", id);
  await audit({ userId: user.id, action: "speaker.delete", entityType: "SPEAKER", entityId: id, summary: `Deleted speaker ${row.name}` });
  revalidatePublic();
  return null;
});

/** Search for the session speaker picker. */
export const searchSpeakers = adminAction(
  "events.manage",
  z.object({ q: z.string().max(100).default("") }),
  async ({ q }) => {
    const rows = await db.speaker.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { organization: { contains: q, mode: "insensitive" } }, { jobTitle: { contains: q, mode: "insensitive" } }] } : {},
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 30,
      include: { photo: { select: { storageKey: true } } },
    });
    const { mediaUrl } = await import("@/lib/media-url");
    return rows.map((r) => ({ id: r.id, name: r.name, jobTitle: r.jobTitle, organization: r.organization, photoUrl: r.photo ? mediaUrl(r.photo.storageKey) : null }));
  },
);
