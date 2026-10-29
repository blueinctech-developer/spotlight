import Link from "next/link";
import { Plus, Tags, FolderTree } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import type { Prisma } from "@/generated/prisma/client";
import { PageHeader } from "@/components/admin/ui";
import { cn, linkButton as buttonVariants } from "@/components/admin/post-editor/server-helpers";
import { PostsTable, type PostRowData } from "@/components/admin/post-editor/posts-table";
import { PostFilters } from "@/components/admin/post-editor/post-filters";

export const metadata = { title: "Posts" };

const PER_PAGE = 20;
const STATUSES = ["all", "DRAFT", "PENDING_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED", "TRASH"] as const;
type StatusKey = (typeof STATUSES)[number];

function statusWhere(status: StatusKey): Prisma.PostWhereInput {
  const now = new Date();
  switch (status) {
    case "TRASH": return { deletedAt: { not: null } };
    case "SCHEDULED": return { deletedAt: null, status: "PUBLISHED", publishedAt: { gt: now } };
    case "PUBLISHED": return { deletedAt: null, status: "PUBLISHED", OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] };
    case "all": return { deletedAt: null };
    default: return { deletedAt: null, status };
  }
}

export default async function PostsPage(props: PageProps<"/admin/posts">) {
  const user = await requireUser("content.edit_own");
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const status = (STATUSES as readonly string[]).includes(str("status")) ? (str("status") as StatusKey) : "all";
  const q = str("q").trim().slice(0, 100);
  const lang = str("lang") === "en" || str("lang") === "fr" ? (str("lang") as "en" | "fr") : "";
  const cat = str("cat");
  const author = str("author");
  const sort = ["updated", "title", "date"].includes(str("sort")) ? str("sort") : "updated";
  const dir = str("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(str("page")) || 1);

  const ownOnly = !can(user.role, "content.edit_any");
  const base: Prisma.PostWhereInput = {
    ...(ownOnly ? { authorId: user.id } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}),
    ...(lang ? { locale: lang } : {}),
    ...(cat ? { categories: { some: { categoryId: cat } } } : {}),
    ...(author && !ownOnly ? { authorId: author } : {}),
  };
  const where: Prisma.PostWhereInput = { AND: [base, statusWhere(status)] };
  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    sort === "title" ? [{ title: dir }] : sort === "date" ? [{ publishedAt: { sort: dir, nulls: "last" } }, { createdAt: dir }] : [{ updatedAt: dir }];

  const [total, rows, counts, categories, authors] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        author: { select: { name: true } },
        categories: { include: { category: { select: { name: true } } } },
      },
    }),
    Promise.all(STATUSES.map((s) => db.post.count({ where: { AND: [base, statusWhere(s)] } }))),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ownOnly ? Promise.resolve([]) : db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const groups = [...new Set(rows.map((r) => r.translationGroup))];
  const siblings = groups.length
    ? await db.post.findMany({ where: { translationGroup: { in: groups } }, select: { id: true, translationGroup: true, locale: true } })
    : [];

  const data: PostRowData[] = rows.map((r) => {
    const other = siblings.find((s) => s.translationGroup === r.translationGroup && s.locale !== r.locale);
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      locale: r.locale,
      status: r.status,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
      deletedAt: r.deletedAt?.toISOString() ?? null,
      author: r.authorDisplayName || r.author?.name || "—",
      categories: r.categories.map((c) => c.category.name),
      translationId: other?.id ?? null,
      canEdit: !ownOnly || r.status !== "PUBLISHED",
    };
  });

  const qs = (patch: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const merged = { q, status: status === "all" ? "" : status, lang, cat, author, sort: sort === "updated" ? "" : sort, dir: dir === "desc" ? "" : dir, page: "", ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== null && v !== "" && v !== undefined) p.set(k, String(v));
    const s = p.toString();
    return `/admin/posts/${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Posts"
        description="News, press releases and editorial articles."
        actions={
          <>
            {can(user.role, "content.edit_any") && (
              <>
                <Link href="/admin/posts/categories/" className={buttonVariants({ variant: "ghost", size: "md" })}><FolderTree /> Categories</Link>
                <Link href="/admin/posts/tags/" className={buttonVariants({ variant: "ghost", size: "md" })}><Tags /> Tags</Link>
              </>
            )}
            <Link href="/admin/posts/new/" className={buttonVariants({ variant: "primary" })}><Plus /> New post</Link>
          </>
        }
      />

      <nav aria-label="Status" className="mb-4 flex flex-wrap gap-1 border-b border-zinc-200">
        {STATUSES.map((s, i) => {
          const active = status === s;
          const label = { all: "All", DRAFT: "Drafts", PENDING_REVIEW: "In review", SCHEDULED: "Scheduled", PUBLISHED: "Published", ARCHIVED: "Archived", TRASH: "Trash" }[s];
          return (
            <Link
              key={s}
              href={qs({ status: s === "all" ? "" : s })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium",
                active ? "border-brand text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {label} <span className="ml-1 rounded-full bg-zinc-100 px-1.5 text-[11px] text-zinc-600">{counts[i]}</span>
            </Link>
          );
        })}
      </nav>

      <PostFilters q={q} lang={lang} cat={cat} author={author} sort={sort} dir={dir} categories={categories} authors={authors} />

      <PostsTable
        rows={data}
        trashView={status === "TRASH"}
        canPublish={can(user.role, "content.publish")}
        canDelete={can(user.role, "content.delete")}
        sort={sort}
        dir={dir}
        sortHref={{
          title: qs({ sort: "title", dir: sort === "title" && dir === "asc" ? "desc" : "asc" }),
          date: qs({ sort: "date", dir: sort === "date" && dir === "desc" ? "asc" : "desc" }),
          updated: qs({ sort: "", dir: sort === "updated" && dir === "desc" ? "asc" : "" }),
        }}
        emptyHint={q || lang || cat || author || status !== "all" ? "No posts match these filters." : "No posts yet."}
      />

      {total > PER_PAGE && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
          </span>
          <span className="flex gap-2">
            {page > 1 && <Link className={buttonVariants({ size: "sm" })} href={qs({ page: page - 1 })}>Previous</Link>}
            {page * PER_PAGE < total && <Link className={buttonVariants({ size: "sm" })} href={qs({ page: page + 1 })}>Next</Link>}
          </span>
        </div>
      )}
    </>
  );
}
