import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans, Urbanist } from "next/font/google";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canEditPost } from "@/lib/auth/permissions";
import { getAutosave } from "@/lib/admin/revisions";
import { getAllSettings } from "@/lib/settings";
import { sanitizeRichText } from "@/lib/sanitize";
import { postCardInclude, type getPublishedPost } from "@/lib/content/public";
import { SiteShell } from "@/components/site/site-shell";
import { PostView } from "@/components/site/views/post-view";
import { effectiveStatus, STATUS_LABELS } from "@/components/admin/post-editor/server-helpers";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-jakarta", display: "swap" });
const urbanist = Urbanist({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-urbanist", display: "swap" });

export const metadata = { title: "Preview", robots: { index: false, follow: false } };

type Data = NonNullable<Awaited<ReturnType<typeof getPublishedPost>>>;

/** Draft preview: renders the real public post template with unpublished content. */
export default async function PostPreviewPage(props: PageProps<"/admin/preview/post/[id]">) {
  const user = await requireUser("content.edit_own");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const include = { ...postCardInclude, ogImage: true, tags: { include: { tag: true } } } as const;
  const post = await db.post.findUnique({ where: { id }, include });
  if (!post || !canEditPost(user, post)) notFound();

  let view = post;
  const auto = sp.autosave ? await getAutosave("POST", id, user.id) : null;
  if (auto && auto.data && typeof auto.data === "object") {
    const d = auto.data as Record<string, unknown>;
    const str = (k: string, fallback: string | null) => (typeof d[k] === "string" ? (d[k] as string) : fallback);
    const featuredId = typeof d.featuredImageId === "string" ? d.featuredImageId : d.featuredImageId === null ? null : post.featuredImageId;
    const catIds = Array.isArray(d.categoryIds) ? (d.categoryIds as string[]) : null;
    const tagIds = Array.isArray(d.tagIds) ? (d.tagIds as string[]) : null;
    const [featuredImage, categories, tags] = await Promise.all([
      featuredId ? db.mediaAsset.findUnique({ where: { id: featuredId }, select: postCardInclude.featuredImage.select }) : null,
      catIds ? db.category.findMany({ where: { id: { in: catIds } } }) : null,
      tagIds ? db.tag.findMany({ where: { id: { in: tagIds } } }) : null,
    ]);
    view = {
      ...post,
      title: str("title", post.title) || post.title,
      content: sanitizeRichText(str("content", post.content) ?? ""),
      excerpt: str("excerpt", post.excerpt),
      authorDisplayName: str("authorDisplayName", post.authorDisplayName),
      featuredImageId: featuredId,
      featuredImage: featuredImage ?? null,
      categories: categories ? categories.map((category) => ({ postId: post.id, categoryId: category.id, category })) : post.categories,
      tags: tags ? tags.map((tag) => ({ postId: post.id, tagId: tag.id, tag })) : post.tags,
    };
  }

  const settings = await getAllSettings();
  const data: Data = { post: view, newer: null, older: null, related: [], alternates: [] };
  const status = effectiveStatus(post);

  return (
    <div className={`${jakarta.variable} ${urbanist.variable} bg-white font-sans text-body`}>
      <div role="status" className="fixed inset-x-0 bottom-0 z-[70] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-zinc-900 px-4 py-2.5 text-center text-[13px] text-white shadow-2xl">
        <strong className="font-semibold">Preview — not published</strong>
        <span className="text-zinc-300">
          Status: {STATUS_LABELS[status] ?? status}
          {auto ? " · showing unsaved autosave" : " · showing last saved version"}
        </span>
        <a href={`/admin/posts/${post.id}/`} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">Back to editor</a>
      </div>
      <SiteShell locale={post.locale}>
        <PostView locale={post.locale} data={data} settings={settings} />
      </SiteShell>
    </div>
  );
}
