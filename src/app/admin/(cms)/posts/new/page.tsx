import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PostEditor, type EditorInitial } from "@/components/admin/post-editor/post-editor";

export const metadata = { title: "New post" };

export default async function NewPostPage(props: PageProps<"/admin/posts/new">) {
  const user = await requireUser("content.edit_own");
  const sp = await props.searchParams;
  const locale = sp.locale === "fr" ? "fr" : "en";
  const translationOfId = typeof sp.translationOf === "string" ? sp.translationOf : null;

  const source = translationOfId
    ? await db.post.findUnique({ where: { id: translationOfId }, include: { categories: true, tags: true } })
    : null;
  if (source) {
    // Already translated? Go to the existing version instead of creating a duplicate.
    const existing = await db.post.findFirst({ where: { translationGroup: source.translationGroup, locale }, select: { id: true } });
    if (existing) redirect(`/admin/posts/${existing.id}/`);
  }

  const [categories, tags] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const initial: EditorInitial = {
    id: null,
    locale: source && source.locale === locale ? (locale === "en" ? "fr" : "en") : locale,
    status: "DRAFT",
    publishedAt: null,
    updatedAt: null,
    fields: {
      // A translation starts from the original so the translator can work over it.
      title: source?.title ?? "",
      slug: source?.slug ?? "",
      excerpt: source?.excerpt ?? "",
      content: source?.content ?? "",
      featuredImageId: source?.featuredImageId ?? null,
      categoryIds: source?.categories.map((c) => c.categoryId) ?? [],
      tagIds: source?.tags.map((t) => t.tagId) ?? [],
      authorDisplayName: source?.authorDisplayName ?? user.name,
      seoTitle: "",
      seoDescription: "",
      canonicalUrl: "",
      ogTitle: "",
      ogDescription: "",
      ogImageId: source?.ogImageId ?? null,
      noindex: false,
    },
    autosave: null,
    revisions: [],
    translation: source ? { id: source.id, locale: source.locale, title: source.title } : null,
    translationOf: source?.id ?? null,
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
