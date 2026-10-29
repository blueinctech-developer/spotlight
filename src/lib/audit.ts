import "server-only";
import { db } from "@/lib/db";
import type { EntityType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(entry: {
  userId?: string | null;
  action: string;
  entityType?: EntityType;
  entityId?: string;
  summary: string;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({ data: { ...entry, userId: entry.userId ?? null } });
  } catch (err) {
    // Auditing must never break the user's action, but failures should be visible in logs.
    console.error("audit log write failed", err);
  }
}
