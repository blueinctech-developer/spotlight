"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { clearMediaUsage, syncMediaUsage } from "@/lib/media/usage";

const optText = (max: number) => z.string().trim().max(max).default("").transform((v) => v || null);

const input = z.object({
  id: z.string().optional(),
  quote: z.string().trim().min(1, "The quote is required.").max(3000),
  quoteFr: optText(3000),
  name: z.string().trim().min(1, "Name is required.").max(150),
  role: optText(200),
  roleFr: optText(200),
  organization: optText(200),
  photoId: z.string().max(64).nullable().default(null),
  logoId: z.string().max(64).nullable().default(null),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(100_000).default(0),
});

export const saveTestimonial = adminAction("events.manage", input, async (v, user) => {
  const { id, ...data } = v;
  const row = id
    ? await db.testimonial.update({ where: { id }, data })
    : await db.testimonial.create({ data: { ...data, order: data.order || (await db.testimonial.count()) } });
  await syncMediaUsage("TESTIMONIAL", row.id, `Testimonial: ${row.name}`, [row.photoId, row.logoId]);
  await audit({ userId: user.id, action: id ? "testimonial.update" : "testimonial.create", entityType: "TESTIMONIAL", entityId: row.id, summary: `${id ? "Updated" : "Created"} testimonial by ${row.name}` });
  revalidatePublic();
  return { id: row.id };
});

export const setTestimonialVisible = adminAction("events.manage", z.object({ id: z.string(), visible: z.boolean() }), async ({ id, visible }, user) => {
  const row = await db.testimonial.update({ where: { id }, data: { visible } });
  await audit({ userId: user.id, action: visible ? "testimonial.show" : "testimonial.hide", entityType: "TESTIMONIAL", entityId: id, summary: `${visible ? "Showed" : "Hid"} testimonial by ${row.name}` });
  revalidatePublic();
  return null;
});

export const reorderTestimonials = adminAction("events.manage", z.object({ ids: z.array(z.string()).max(500) }), async ({ ids }, user) => {
  await db.$transaction(ids.map((id, order) => db.testimonial.update({ where: { id }, data: { order } })));
  await audit({ userId: user.id, action: "testimonial.reorder", entityType: "TESTIMONIAL", summary: `Reordered ${ids.length} testimonials` });
  revalidatePublic();
  return null;
});

export const deleteTestimonial = adminAction("events.manage", z.object({ id: z.string() }), async ({ id }, user) => {
  const row = await db.testimonial.findUnique({ where: { id } });
  if (!row) throw new UserError("Testimonial not found.");
  await db.testimonial.delete({ where: { id } });
  await clearMediaUsage("TESTIMONIAL", id);
  await audit({ userId: user.id, action: "testimonial.delete", entityType: "TESTIMONIAL", entityId: id, summary: `Deleted testimonial by ${row.name}` });
  revalidatePublic();
  return null;
});
