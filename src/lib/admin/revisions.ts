import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type Kind = "PAGE" | "POST";
const KEEP = 50; // revisions kept per entity

/** Store a snapshot after a save. Old revisions beyond KEEP are pruned. */
export async function saveRevision(entityType: Kind, entityId: string, data: Prisma.InputJsonValue, authorId: string, note?: string) {
  await db.revision.create({ data: { entityType, entityId, kind: "REVISION", data, authorId, note } });
  const old = await db.revision.findMany({
    where: { entityType, entityId, kind: "REVISION" },
    orderBy: { createdAt: "desc" },
    skip: KEEP,
    select: { id: true },
  });
  if (old.length) await db.revision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  // A real save supersedes the user's autosave.
  await db.revision.deleteMany({ where: { entityType, entityId, kind: "AUTOSAVE", authorId } });
}

/** One autosave row per user + entity, overwritten on every autosave. */
export async function saveAutosave(entityType: Kind, entityId: string, data: Prisma.InputJsonValue, authorId: string) {
  const existing = await db.revision.findFirst({ where: { entityType, entityId, kind: "AUTOSAVE", authorId }, select: { id: true } });
  if (existing) await db.revision.update({ where: { id: existing.id }, data: { data, createdAt: new Date() } });
  else await db.revision.create({ data: { entityType, entityId, kind: "AUTOSAVE", data, authorId } });
}

export async function getAutosave(entityType: Kind, entityId: string, authorId: string) {
  return db.revision.findFirst({ where: { entityType, entityId, kind: "AUTOSAVE", authorId } });
}

export async function listRevisions(entityType: Kind, entityId: string) {
  return db.revision.findMany({
    where: { entityType, entityId, kind: "REVISION" },
    orderBy: { createdAt: "desc" },
    take: KEEP,
    select: { id: true, createdAt: true, note: true, author: { select: { name: true } } },
  });
}
