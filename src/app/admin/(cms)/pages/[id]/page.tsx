import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getAutosave } from "@/lib/admin/revisions";
import { parseBlocks } from "@/lib/blocks/schema";
import { PageEditor } from "@/components/admin/page-editor/editor";
import type { PageDoc } from "@/components/admin/page-editor/document-settings";

export async function generateMetadata(props: PageProps<"/admin/pages/[id]">) {
  const { id } = await props.params;
  const p = await db.page.findUnique({ where: { id }, select: { title: true } });
  return { title: p ? `Edit: ${p.title}` : "Page" };
}

export default async function EditPage(props: PageProps<"/admin/pages/[id]">) {
  const user = await requireUser("pages.manage");
  const { id } = await props.params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();
  if (page.deletedAt) redirect("/admin/pages/?status=trash");

  const other = page.locale === "en" ? "fr" : "en";
  const [translation, autosaveRow] = await Promise.all([
    db.page.findUnique({ where: { translationGroup_locale: { translationGroup: page.translationGroup, locale: other } }, select: { id: true, deletedAt: true } }),
    getAutosave("PAGE", page.id, user.id),
  ]);
  const { blocks, errors } = parseBlocks(page.blocks);

  const doc: PageDoc = {
    title: page.title,
    slug: page.slug,
    parentId: page.parentId,
    excerpt: page.excerpt,
    featuredImageId: page.featuredImageId,
    status: page.status,
    publishedAt: page.publishedAt?.toISOString() ?? null,
    menuOrder: page.menuOrder,
    headerVariant: page.headerVariant === "dark" ? "dark" : "light",
    footerVariant: page.footerVariant === "seat" || page.footerVariant === "none" ? page.footerVariant : "default",
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    canonicalUrl: page.canonicalUrl,
    ogTitle: page.ogTitle,
    ogDescription: page.ogDescription,
    ogImageId: page.ogImageId,
    noindex: page.noindex,
  };

  let autosave: { savedAt: string; doc: Partial<PageDoc>; blocks: typeof blocks } | null = null;
  if (autosaveRow && autosaveRow.createdAt > page.updatedAt) {
    const data = autosaveRow.data as Record<string, unknown>;
    const { blocks: aBlocks, ...rest } = data;
    const allowed = Object.keys(doc) as (keyof PageDoc)[];
    autosave = {
      savedAt: autosaveRow.createdAt.toISOString(),
      doc: Object.fromEntries(allowed.filter((k) => k in rest).map((k) => [k, rest[k]])) as Partial<PageDoc>,
      blocks: parseBlocks(aBlocks).blocks,
    };
  }

  return (
    <PageEditor
      key={page.updatedAt.toISOString()}
      page={{ ...doc, id: page.id, locale: page.locale, path: page.path, translationGroup: page.translationGroup, updatedAt: page.updatedAt.toISOString() }}
      blocks={blocks}
      autosave={autosave}
      translation={{ id: translation && !translation.deletedAt ? translation.id : null, locale: other }}
      invalidBlocks={errors}
      canPublish={can(user.role, "content.publish")}
      canDelete={can(user.role, "content.delete")}
    />
  );
}
