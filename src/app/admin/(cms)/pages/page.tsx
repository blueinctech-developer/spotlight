import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/admin/ui";
import { PagesTable, type PageRow } from "@/components/admin/page-editor/pages-table";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Pages" };

const PER_PAGE = 25;

export default async function PagesListPage(props: PageProps<"/admin/pages">) {
  const user = await requireUser("pages.manage");
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").trim().slice(0, 100);
  const status = str("status") || "all";
  const lang = str("lang") || "all";
  const sort = ["path", "title", "updated", "published"].includes(str("sort")) ? str("sort") : "path";
  const dir = str("dir") === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(str("page")) || 1);
  const now = new Date();

  const statusWhere: Prisma.PageWhereInput =
    status === "trash"
      ? { deletedAt: { not: null } }
      : {
          deletedAt: null,
          ...(status === "published" ? { status: "PUBLISHED", OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] } : {}),
          ...(status === "scheduled" ? { status: "PUBLISHED", publishedAt: { gt: now } } : {}),
          ...(status === "draft" ? { status: "DRAFT" } : {}),
          ...(status === "review" ? { status: "PENDING_REVIEW" } : {}),
          ...(status === "archived" ? { status: "ARCHIVED" } : {}),
        };
  // "?missing=fr" (linked from the dashboard): pages in the other language with no translation yet.
  const missing = str("missing") === "fr" || str("missing") === "en" ? (str("missing") as "en" | "fr") : null;
  const translatedGroups = missing
    ? (await db.page.findMany({ where: { locale: missing, deletedAt: null }, select: { translationGroup: true } })).map((g) => g.translationGroup)
    : [];
  const where: Prisma.PageWhereInput = {
    ...statusWhere,
    ...(missing
      ? { locale: missing === "fr" ? "en" : "fr", translationGroup: { notIn: translatedGroups } }
      : lang === "en" || lang === "fr"
        ? { locale: lang }
        : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { path: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const orderBy: Prisma.PageOrderByWithRelationInput[] =
    sort === "title" ? [{ title: dir }] : sort === "updated" ? [{ updatedAt: dir }] : sort === "published" ? [{ publishedAt: { sort: dir, nulls: "last" } }] : [{ path: dir }, { locale: "asc" }];

  const [total, rows, counts, trashCount, groups] = await Promise.all([
    db.page.count({ where }),
    db.page.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, title: true, path: true, locale: true, status: true, publishedAt: true, updatedAt: true, deletedAt: true,
        translationGroup: true, author: { select: { name: true } },
      },
    }),
    db.page.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    db.page.count({ where: { deletedAt: { not: null } } }),
    db.page.findMany({ where: { deletedAt: null }, select: { translationGroup: true, locale: true, id: true } }),
  ]);

  const byGroup = new Map<string, { en?: string; fr?: string }>();
  for (const g of groups) {
    const e = byGroup.get(g.translationGroup) ?? {};
    e[g.locale as "en" | "fr"] = g.id;
    byGroup.set(g.translationGroup, e);
  }
  const data: PageRow[] = rows.map((r) => {
    const tr = byGroup.get(r.translationGroup) ?? {};
    const other = r.locale === "en" ? "fr" : "en";
    return {
      id: r.id,
      title: r.title,
      path: r.path,
      locale: r.locale as "en" | "fr",
      status: r.status,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
      deletedAt: r.deletedAt?.toISOString() ?? null,
      author: r.author?.name ?? null,
      translationGroup: r.translationGroup,
      translationId: tr[other] ?? null,
      depth: sort === "path" && !q ? Math.max(0, r.path.split("/").filter(Boolean).length - 1) : 0,
    };
  });
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        title="Pages"
        description="Static pages of the website, in English and French."
        actions={
          <Link href="/admin/pages/new/" className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-800 [&_svg]:size-4">
            <Plus /> New page
          </Link>
        }
      />
      <PagesTable
        rows={data}
        total={total}
        page={page}
        perPage={PER_PAGE}
        filters={{ q, status, lang, sort, dir }}
        tabs={[
          { key: "all", label: "All", count: counts.reduce((a, c) => a + c._count, 0) },
          { key: "published", label: "Published", count: countOf("PUBLISHED") },
          { key: "draft", label: "Drafts", count: countOf("DRAFT") },
          { key: "review", label: "In review", count: countOf("PENDING_REVIEW") },
          { key: "scheduled", label: "Scheduled" },
          { key: "archived", label: "Archived", count: countOf("ARCHIVED") },
          { key: "trash", label: "Trash", count: trashCount },
        ]}
        canDelete={can(user.role, "content.delete")}
        canPublish={can(user.role, "content.publish")}
      />
    </>
  );
}
