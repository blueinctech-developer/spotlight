import "server-only";
import { db } from "@/lib/db";
import type { EntityType } from "@/generated/prisma/enums";

/**
 * Record which media an entity references. Call after every save of a record that can
 * reference media, so the media library knows what is safe to delete.
 * Accepts media ids and/or storage keys found in rich text ("/media/<key>" URLs).
 */
export async function syncMediaUsage(entityType: EntityType, entityId: string, label: string, refs: (string | null | undefined)[], html: string[] = []) {
  const ids = new Set(refs.filter((x): x is string => !!x));
  const keys = html.flatMap((h) => [...h.matchAll(/\/media\/([a-z0-9][a-z0-9/_.-]*)/gi)].map((m) => m[1]));
  if (keys.length) {
    const rows = await db.mediaAsset.findMany({ where: { storageKey: { in: keys } }, select: { id: true } });
    rows.forEach((r) => ids.add(r.id));
  }
  await db.$transaction([
    db.mediaUsage.deleteMany({ where: { entityType, entityId } }),
    ...(ids.size
      ? [db.mediaUsage.createMany({ data: [...ids].map((mediaId) => ({ mediaId, entityType, entityId, label })), skipDuplicates: true })]
      : []),
  ]);
}

export async function clearMediaUsage(entityType: EntityType, entityId: string) {
  await db.mediaUsage.deleteMany({ where: { entityType, entityId } });
}
