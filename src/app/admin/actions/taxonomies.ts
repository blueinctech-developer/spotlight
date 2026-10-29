"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, isUniqueError, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

const kind = z.enum(["category", "tag"]);
const termSchema = z.object({
  kind,
  id: z.string().max(64).optional(),
  name: z.string().trim().min(1, "Enter a name.").max(120),
  nameFr: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((v) => v || null),
  slug: z.string().trim().max(100).default(""),
  description: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),
});

async function upsertTerm(input: z.infer<typeof termSchema>, userId: string) {
  const slug = toSlug(input.slug || input.name);
  if (!slug) throw new UserError("Choose a slug made of letters or numbers.", { slug: "Invalid slug." });
  try {
    if (input.kind === "category") {
      const data = { name: input.name, nameFr: input.nameFr, slug, description: input.description };
      const row = input.id ? await db.category.update({ where: { id: input.id }, data }) : await db.category.create({ data });
      await audit({ userId, action: input.id ? "category.update" : "category.create", summary: `${input.id ? "Updated" : "Created"} category “${row.name}”` });
      return { id: row.id, name: row.name, slug: row.slug, nameFr: row.nameFr };
    }
    const data = { name: input.name, nameFr: input.nameFr, slug };
    const row = input.id ? await db.tag.update({ where: { id: input.id }, data }) : await db.tag.create({ data });
    await audit({ userId, action: input.id ? "tag.update" : "tag.create", summary: `${input.id ? "Updated" : "Created"} tag “${row.name}”` });
    return { id: row.id, name: row.name, slug: row.slug, nameFr: row.nameFr };
  } catch (err) {
    if (isUniqueError(err)) throw new UserError(`A ${input.kind} with this slug already exists.`, { slug: "This slug is already in use." });
    throw err;
  }
}

/** Full create/edit, for the category and tag management screens (editors and admins). */
export const saveTerm = adminAction("content.edit_any", termSchema, async (input, user) => {
  const row = await upsertTerm(input, user.id);
  revalidatePublic();
  return row;
});

/**
 * Quick-create from the post editor (anyone who can write posts). If a term with the same
 * slug exists it is returned instead of failing, so authors can't create duplicates.
 */
export const quickCreateTerm = adminAction(
  "content.edit_own",
  z.object({ kind, name: z.string().trim().min(1).max(120) }),
  async ({ kind: k, name }, user) => {
    const slug = toSlug(name);
    if (!slug) throw new UserError("Enter a name made of letters or numbers.");
    const existing = k === "category" ? await db.category.findUnique({ where: { slug } }) : await db.tag.findUnique({ where: { slug } });
    if (existing) return { id: existing.id, name: existing.name, slug: existing.slug, nameFr: existing.nameFr };
    return upsertTerm({ kind: k, name, slug, nameFr: null, description: null }, user.id);
  },
);

/** Deleting a term only detaches it from posts; the posts themselves are untouched. */
export const deleteTerm = adminAction("content.edit_any", z.object({ kind, id: z.string().max(64) }), async ({ kind: k, id }, user) => {
  if (k === "category") {
    const row = await db.category.findUnique({ where: { id } });
    if (!row) throw new UserError("Category not found.");
    await db.$transaction([db.postCategory.deleteMany({ where: { categoryId: id } }), db.category.delete({ where: { id } })]);
    await audit({ userId: user.id, action: "category.delete", summary: `Deleted category “${row.name}”` });
  } else {
    const row = await db.tag.findUnique({ where: { id } });
    if (!row) throw new UserError("Tag not found.");
    await db.$transaction([db.postTag.deleteMany({ where: { tagId: id } }), db.tag.delete({ where: { id } })]);
    await audit({ userId: user.id, action: "tag.delete", summary: `Deleted tag “${row.name}”` });
  }
  revalidatePublic();
  return null;
});
