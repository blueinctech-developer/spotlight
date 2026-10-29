"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction, isUniqueError, revalidatePublic, UserError } from "@/lib/admin/action";
import { audit } from "@/lib/audit";

function normalizeFrom(v: string) {
  let p = v.trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    /* keep as typed */
  }
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.endsWith("/") && !/\.[a-z0-9]{2,5}$/i.test(p)) p = `${p}/`;
  return p;
}

const schema = z
  .object({
    id: z.string().max(64).optional(),
    fromPath: z.string().trim().min(1, "Enter the old path.").max(500).transform(normalizeFrom),
    toPath: z.string().trim().max(1000).default(""),
    statusCode: z.union([z.literal(301), z.literal(302), z.literal(410)]),
    note: z.string().trim().max(300).transform((v) => v || null),
  })
  .superRefine((v, ctx) => {
    if (/^\/(admin|api|_next|media)\//.test(v.fromPath)) ctx.addIssue({ code: "custom", path: ["fromPath"], message: "System paths (/admin/, /api/, /media/) cannot be redirected." });
    if (!/^\/[^\s?#]*$/.test(v.fromPath)) ctx.addIssue({ code: "custom", path: ["fromPath"], message: "Use a path like /old-page/ (no spaces or query strings)." });
    if (v.statusCode !== 410) {
      if (!v.toPath) ctx.addIssue({ code: "custom", path: ["toPath"], message: "Enter where visitors should go." });
      else if (!(/^\/(?!\/)/.test(v.toPath) || /^https?:\/\//i.test(v.toPath))) ctx.addIssue({ code: "custom", path: ["toPath"], message: "Use a path like /new-page/ or a full https:// address." });
      else if (normalizeFrom(v.toPath) === v.fromPath) ctx.addIssue({ code: "custom", path: ["toPath"], message: "A page cannot redirect to itself." });
    }
  });

/** Warn about A→B→C chains and loops (they slow visitors and dilute SEO). */
async function chainWarning(fromPath: string, toPath: string, statusCode: number, selfId?: string): Promise<string | null> {
  if (statusCode === 410 || !toPath.startsWith("/")) return null;
  const next = await db.redirect.findFirst({ where: { fromPath: normalizeFrom(toPath), NOT: selfId ? { id: selfId } : undefined } });
  if (next) {
    if (normalizeFrom(next.toPath) === fromPath) throw new UserError("This would create a redirect loop.", { toPath: `${toPath} already redirects back to ${fromPath}.` });
    return `${toPath} itself redirects to ${next.toPath}. Consider pointing directly to ${next.toPath}.`;
  }
  const into = await db.redirect.findFirst({ where: { toPath: { in: [fromPath, fromPath.replace(/\/$/, "")] }, NOT: selfId ? { id: selfId } : undefined } });
  if (into) return `${into.fromPath} already redirects to ${fromPath}, creating a chain. Consider updating it to point to ${toPath}.`;
  return null;
}

export const saveRedirect = adminAction("redirects.manage", schema, async (input, user) => {
  const data = { fromPath: input.fromPath, toPath: input.statusCode === 410 ? "" : input.toPath, statusCode: input.statusCode, note: input.note };
  const warning = await chainWarning(data.fromPath, data.toPath, data.statusCode, input.id);
  try {
    const row = input.id ? await db.redirect.update({ where: { id: input.id }, data }) : await db.redirect.create({ data });
    await audit({
      userId: user.id, action: input.id ? "redirect.update" : "redirect.create", entityType: "REDIRECT", entityId: row.id,
      summary: `${row.fromPath} → ${row.statusCode === 410 ? "410 Gone" : row.toPath} (${row.statusCode})`,
    });
    revalidatePublic();
    return { row: { id: row.id, fromPath: row.fromPath, toPath: row.toPath, statusCode: row.statusCode, hits: row.hits, note: row.note, updatedAt: row.updatedAt.toISOString() }, warning };
  } catch (err) {
    if (isUniqueError(err)) throw new UserError("A redirect for this path already exists.", { fromPath: "Already redirected — edit the existing rule instead." });
    throw err;
  }
});

export const deleteRedirect = adminAction("redirects.manage", z.object({ id: z.string().max(64) }), async ({ id }, user) => {
  const row = await db.redirect.delete({ where: { id } });
  await audit({ userId: user.id, action: "redirect.delete", entityType: "REDIRECT", entityId: id, summary: `Deleted redirect ${row.fromPath}` });
  revalidatePublic();
  return { id };
});
