import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can, canEditPost } from "@/lib/auth/permissions";
import { getAutosave, listRevisions } from "@/lib/admin/revisions";
import { PostEditor, type EditorInitial } from "@/components/admin/post-editor/post-editor";

export const metadata = { title: "Edit post" };

export default async function EditPostPage(props: PageProps<"/admin/posts/[id]">) {
  const user = await requireUser("content.edit_own");
  const { id } = await props.params;
  const post = await db.post.findUnique({ where: { id }, include: { categories: true, tags: true } });
  if (!post) notFound();
  if (!canEditPost(user, post)) redirect("/admin/posts/?denied=1");
  if (post.deletedAt) redirect("/admin/posts/?status=TRASH");

  const [categories, tags, revisions, autosave, translation] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listRevisions("POST", id),
    getAutosave("POST", id, user.id),
    db.post.findFirst({ where: { translationGroup: post.translationGroup, NOT: { id } }, select: { id: true, locale: true, title: true } }),
  ]);

  const initial: EditorInitial = {
    id: post.id,
    locale: post.locale,
    status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
    fields: {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content,
      featuredImageId: post.featuredImageId,
      categoryIds: post.categories.map((c) => c.categoryId),
      tagIds: post.tags.map((t) => t.tagId),
      authorDisplayName: post.authorDisplayName ?? "",
      seoTitle: post.seoTitle ?? "",
      seoDescription: post.seoDescription ?? "",
      canonicalUrl: post.canonicalUrl ?? "",
      ogTitle: post.ogTitle ?? "",
      ogDescription: post.ogDescription ?? "",
      ogImageId: post.ogImageId,
      noindex: post.noindex,
    },
    autosave:
      autosave && autosave.createdAt > post.updatedAt
        ? { savedAt: autosave.createdAt.toISOString(), data: autosave.data as EditorInitial["fields"] }
        : null,
    revisions: revisions.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString(), note: r.note, author: r.author?.name ?? "Unknown" })),
    translation,
    translationOf: null,
  };

  return (
    <PostEditor
      initial={initial}
      categories={categories}
      tags={tags}
      canPublish={can(user.role, "content.publish")}
      canDelete={can(user.role, "content.delete")}
    />
  );
}
