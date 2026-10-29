"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, isUniqueError, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { sanitizeRichText } from "@/lib/sanitize";
import { clearMediaUsage, syncMediaUsage } from "@/lib/media/usage";
import { isValidTimeZone, localToUtc } from "@/components/admin/events/tz";
import { slugify } from "@/components/admin/events/slug";

const optText = (max: number) => z.string().trim().max(max).default("").transform((v) => v || null);
const time = z
  .string()
  .trim()
  .max(20)
  .transform((v) => v || null);

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "event";
  for (let i = 0; i < 50; i++) {
    const candidate = i ? `${root}-${i + 1}` : root;
    const hit = await db.event.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit || hit.id === excludeId) return candidate;
  }
  throw new UserError("Could not create a unique slug.");
}

export const createEvent = adminAction(
  "events.manage",
  z.object({ title: z.string().trim().min(1, "Title is required.").max(200), year: z.number().int().min(2000).max(2100) }),
  async ({ title, year }, user) => {
    const row = await db.event.create({ data: { title, year, slug: await uniqueSlug(title) } });
    await audit({ userId: user.id, action: "event.create", entityType: "EVENT", entityId: row.id, summary: `Created event ${title}` });
    return { id: row.id };
  },
);

const detailsInput = z
  .object({
    id: z.string(),
    title: z.string().trim().min(1, "Title is required.").max(200),
    titleFr: optText(200),
    slug: z.string().trim().max(100),
    edition: z.number().int().min(1).max(1000).nullable(),
    year: z.number().int().min(2000).max(2100),
    timezone: z.string().trim().max(60).refine(isValidTimeZone, "Unknown time zone."),
    startsAtLocal: z.string().max(20).default(""),
    endsAtLocal: z.string().max(20).default(""),
    venueName: optText(200),
    venueAddress: optText(300),
    theme: optText(300),
    themeFr: optText(300),
    description: z.string().max(100_000).default(""),
    descriptionFr: z.string().max(100_000).default(""),
    registrationUrl: z
      .string()
      .trim()
      .max(1000)
      .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v) || /^\/(?!\/)\S*$/.test(v), "Enter a full URL or a site path.")
      .transform((v) => v || null),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    isCurrent: z.boolean(),
    bannerId: z.string().max(64).nullable(),
    galleryIds: z.array(z.string().max(64)).max(300),
  })
  .superRefine((v, ctx) => {
    const s = v.startsAtLocal ? localToUtc(v.startsAtLocal, v.timezone) : null;
    const e = v.endsAtLocal ? localToUtc(v.endsAtLocal, v.timezone) : null;
    if (v.startsAtLocal && !s) ctx.addIssue({ code: "custom", path: ["startsAtLocal"], message: "Invalid date." });
    if (v.endsAtLocal && !e) ctx.addIssue({ code: "custom", path: ["endsAtLocal"], message: "Invalid date." });
    if (s && e && e < s) ctx.addIssue({ code: "custom", path: ["endsAtLocal"], message: "The end must be after the start." });
  });

export const updateEventDetails = adminAction("events.manage", detailsInput, async (input, user) => {
  const slug = slugify(input.slug);
  if (!slug) throw new UserError("Enter a valid slug.", { slug: "Use letters, numbers and dashes." });
  const data = {
    title: input.title,
    titleFr: input.titleFr,
    slug,
    edition: input.edition,
    year: input.year,
    timezone: input.timezone,
    startsAt: input.startsAtLocal ? localToUtc(input.startsAtLocal, input.timezone) : null,
    endsAt: input.endsAtLocal ? localToUtc(input.endsAtLocal, input.timezone) : null,
    venueName: input.venueName,
    venueAddress: input.venueAddress,
    theme: input.theme,
    themeFr: input.themeFr,
    description: sanitizeRichText(input.description) || null,
    descriptionFr: sanitizeRichText(input.descriptionFr) || null,
    registrationUrl: input.registrationUrl,
    status: input.status,
    isCurrent: input.isCurrent,
    bannerId: input.bannerId,
    galleryIds: input.galleryIds,
  };
  try {
    // Only one edition can be "current": unset the others in the same transaction.
    const row = await db.$transaction(async (tx) => {
      if (input.isCurrent) await tx.event.updateMany({ where: { isCurrent: true, NOT: { id: input.id } }, data: { isCurrent: false } });
      return tx.event.update({ where: { id: input.id }, data });
    });
    await syncMediaUsage("EVENT", row.id, `Event: ${row.title}`, [row.bannerId, ...row.galleryIds], [row.description ?? "", row.descriptionFr ?? ""]);
    await audit({ userId: user.id, action: "event.update", entityType: "EVENT", entityId: row.id, summary: `Updated event ${row.title}` });
    revalidatePublic();
    return { slug: row.slug };
  } catch (err) {
    if (isUniqueError(err)) throw new UserError("Another event already uses this slug.", { slug: "Already in use." });
    throw err;
  }
});

const sessionInput = z.object({
  id: z.string().optional(),
  day: z.number().int().min(1).max(30),
  startTime: time,
  endTime: time,
  title: z.string().trim().min(1, "Each session needs a title.").max(300),
  titleFr: optText(300),
  theme: optText(500),
  themeFr: optText(500),
  description: z.string().max(50_000).default(""),
  descriptionFr: z.string().max(50_000).default(""),
  location: optText(300),
  kind: z.enum(["session", "plenary", "panel", "break", "networking"]),
  speakers: z
    .array(z.object({ speakerId: z.string(), role: z.enum(["SPEAKER", "MODERATOR", "PANELIST", "KEYNOTE"]) }))
    .max(50),
});

/** Replace the whole programme of an event atomically (order = position within each day). */
export const saveSessions = adminAction(
  "events.manage",
  z.object({ eventId: z.string(), sessions: z.array(sessionInput).max(300) }),
  async ({ eventId, sessions }, user) => {
    const event = await db.event.findUnique({ where: { id: eventId }, select: { title: true } });
    if (!event) throw new UserError("Event not found.");
    const speakerIds = [...new Set(sessions.flatMap((s) => s.speakers.map((x) => x.speakerId)))];
    if (speakerIds.length) {
      const found = await db.speaker.count({ where: { id: { in: speakerIds } } });
      if (found !== speakerIds.length) throw new UserError("One of the selected speakers no longer exists. Reload the page.");
    }
    const dayCounters = new Map<number, number>();
    await db.$transaction(async (tx) => {
      const keepIds = sessions.map((s) => s.id).filter((x): x is string => !!x);
      await tx.eventSession.deleteMany({ where: { eventId, id: { notIn: keepIds } } });
      for (const s of sessions) {
        const order = dayCounters.get(s.day) ?? 0;
        dayCounters.set(s.day, order + 1);
        const data = {
          day: s.day, order, startTime: s.startTime, endTime: s.endTime, title: s.title, titleFr: s.titleFr,
          theme: s.theme, themeFr: s.themeFr, location: s.location, kind: s.kind,
          description: sanitizeRichText(s.description) || null,
          descriptionFr: sanitizeRichText(s.descriptionFr) || null,
        };
        const existing = s.id ? await tx.eventSession.findFirst({ where: { id: s.id, eventId }, select: { id: true } }) : null;
        const row = existing
          ? await tx.eventSession.update({ where: { id: existing.id }, data })
          : await tx.eventSession.create({ data: { ...data, eventId } });
        await tx.sessionSpeaker.deleteMany({ where: { sessionId: row.id } });
        const unique = s.speakers.filter((x, i, a) => a.findIndex((y) => y.speakerId === x.speakerId) === i);
        if (unique.length) {
          await tx.sessionSpeaker.createMany({ data: unique.map((x, i) => ({ sessionId: row.id, speakerId: x.speakerId, role: x.role, order: i })) });
        }
      }
    });
    await audit({ userId: user.id, action: "event.programme", entityType: "EVENT", entityId: eventId, summary: `Saved programme of ${event.title} (${sessions.length} sessions)` });
    revalidatePublic();
    return null;
  },
);

export const saveEventPartners = adminAction(
  "events.manage",
  z.object({
    eventId: z.string(),
    partners: z.array(z.object({ partnerId: z.string(), tier: z.enum(["CO_ORGANIZER", "SUPPORTER", "SPONSOR", "PARTNER", "MEDIA_PARTNER"]) })).max(500),
  }),
  async ({ eventId, partners }, user) => {
    const event = await db.event.findUnique({ where: { id: eventId }, select: { title: true } });
    if (!event) throw new UserError("Event not found.");
    const unique = partners.filter((p, i, a) => a.findIndex((x) => x.partnerId === p.partnerId) === i);
    await db.$transaction([
      db.eventPartner.deleteMany({ where: { eventId } }),
      db.eventPartner.createMany({ data: unique.map((p, order) => ({ eventId, partnerId: p.partnerId, tier: p.tier, order })) }),
    ]);
    await audit({ userId: user.id, action: "event.partners", entityType: "EVENT", entityId: eventId, summary: `Saved ${unique.length} partners for ${event.title}` });
    revalidatePublic();
    return null;
  },
);

export const duplicateEvent = adminAction("events.manage", z.object({ id: z.string() }), async ({ id }, user) => {
  const src = await db.event.findUnique({ where: { id }, include: { sessions: { include: { speakers: true } }, partners: true } });
  if (!src) throw new UserError("Event not found.");
  const row = await db.$transaction(async (tx) => {
    const { id: _id, createdAt: _c, updatedAt: _u, sessions, partners, ...rest } = src;
    const ev = await tx.event.create({
      data: { ...rest, title: `${src.title} (copy)`, slug: await uniqueSlug(`${src.slug}-copy`), status: "DRAFT", isCurrent: false },
    });
    for (const s of sessions) {
      const { id: _sid, eventId: _e, speakers, ...sd } = s;
      const ns = await tx.eventSession.create({ data: { ...sd, eventId: ev.id } });
      if (speakers.length) await tx.sessionSpeaker.createMany({ data: speakers.map((sp) => ({ sessionId: ns.id, speakerId: sp.speakerId, role: sp.role, order: sp.order })) });
    }
    if (partners.length) await tx.eventPartner.createMany({ data: partners.map((p) => ({ eventId: ev.id, partnerId: p.partnerId, tier: p.tier, order: p.order })) });
    return ev;
  });
  await audit({ userId: user.id, action: "event.duplicate", entityType: "EVENT", entityId: row.id, summary: `Duplicated event ${src.title}` });
  return { id: row.id };
});

export const deleteEvent = adminAction("events.manage", z.object({ id: z.string() }), async ({ id }, user) => {
  const row = await db.event.findUnique({ where: { id } });
  if (!row) throw new UserError("Event not found.");
  // Pages whose schedule block points at this event would silently lose their programme.
  const pages = await db.page.findMany({ where: { deletedAt: null }, select: { title: true, locale: true, blocks: true } });
  const users = pages.filter((p) => JSON.stringify(p.blocks).includes(`"eventId":"${id}"`));
  if (users.length) {
    throw new UserError(`This event is shown on: ${users.map((p) => `${p.title} (${p.locale.toUpperCase()})`).join(", ")}. Remove it from those pages first, or archive the event instead.`);
  }
  await db.event.delete({ where: { id } });
  await clearMediaUsage("EVENT", id);
  await audit({ userId: user.id, action: "event.delete", entityType: "EVENT", entityId: id, summary: `Deleted event ${row.title}` });
  revalidatePublic();
  return null;
});
