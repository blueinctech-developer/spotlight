import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { TermsManager } from "@/components/admin/post-editor/terms-manager";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireUser("content.edit_any");
  const rows = await db.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { posts: true } } } });
  return (
    <>
      <PageHeader
        back={<Link href="/admin/posts/" className="mb-2 inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-800"><ArrowLeft className="size-3.5" /> Posts</Link>}
        title="Tags"
        description="Keywords attached to posts. Each tag has a public archive at /tag/<slug>/."
      />
      <TermsManager kind="tag" rows={rows.map((r) => ({ id: r.id, name: r.name, nameFr: r.nameFr, slug: r.slug, count: r._count.posts }))} />
    </>
  );
}
