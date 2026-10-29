import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formKeys } from "@/lib/blocks/schema";

export const SUBMISSION_STATUSES = ["NEW", "READ", "ARCHIVED", "SPAM"] as const;
export type SubmissionFilters = { form: string; status: string; q: string; from: string; to: string; page: number };

const str = (v: string | string[] | undefined | null) => (Array.isArray(v) ? v[0] : v ?? "").trim();

/** Parse list/export query parameters (shared by the list page and the CSV export). */
export function parseSubmissionFilters(sp: Record<string, string | string[] | undefined> | URLSearchParams): SubmissionFilters {
  const get = (k: string) => (sp instanceof URLSearchParams ? sp.get(k) : str(sp[k] as string | string[] | undefined)) ?? "";
  const form = get("form");
  const status = get("status");
  const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  return {
    form: (formKeys as readonly string[]).includes(form) ? form : "",
    status: (SUBMISSION_STATUSES as readonly string[]).includes(status) ? status : "",
    q: get("q").slice(0, 100),
    from: date(get("from")),
    to: date(get("to")),
    page: Math.max(1, Number(get("page")) || 1),
  };
}

export async function submissionWhere(f: SubmissionFilters): Promise<Prisma.FormSubmissionWhereInput> {
  let contentIds: string[] = [];
  if (f.q) {
    const pattern = `%${f.q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
    const rows = await db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "FormSubmission" WHERE "data"::text ILIKE ${pattern} LIMIT 2000`;
    contentIds = rows.map((r) => r.id);
  }
  return {
    ...(f.form ? { formKey: f.form } : {}),
    // Spam is hidden unless explicitly requested.
    ...(f.status ? { status: f.status as (typeof SUBMISSION_STATUSES)[number] } : { status: { not: "SPAM" } }),
    ...(f.from || f.to
      ? {
          createdAt: {
            ...(f.from ? { gte: new Date(`${f.from}T00:00:00Z`) } : {}),
            ...(f.to ? { lt: new Date(new Date(`${f.to}T00:00:00Z`).getTime() + 86400_000) } : {}),
          },
        }
      : {}),
    ...(f.q
      ? {
          OR: [
            { name: { contains: f.q, mode: "insensitive" as const } },
            { email: { contains: f.q, mode: "insensitive" as const } },
            { id: { in: contentIds } },
          ],
        }
      : {}),
  };
}
