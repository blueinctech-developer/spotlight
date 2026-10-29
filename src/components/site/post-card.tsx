import Link from "next/link";
import { MediaImage } from "@/components/blocks/media";
import { toMediaRef, type PostCardData } from "@/lib/content/public";
import { formatDate, localizePath, type Locale } from "@/lib/i18n";
import { htmlToText, truncate } from "@/lib/sanitize";

/** `heading`: h2 when the cards sit directly under the page title, h3 under a section heading. */
export function PostCard({ post, locale, heading: Heading = "h2" }: { post: PostCardData; locale: Locale; heading?: "h2" | "h3" }) {
  const href = localizePath(post.slug, locale);
  const image = post.featuredImage ? toMediaRef(post.featuredImage, locale) : null;
  const excerpt = truncate(htmlToText(post.excerpt || post.content), 150);
  return (
    <article className="group hover-lift flex h-full flex-col rounded-sm bg-white p-5 shadow-[0_6px_30px_rgba(0,0,0,0.07)] md:px-5 md:py-5">
      {image && (
        <Link href={href} className="zoom-frame relative mb-5 block aspect-[16/11] rounded-[5px]" tabIndex={-1} aria-hidden>
          <MediaImage media={image} fill sizes="(min-width: 1024px) 380px, 100vw" className="object-cover" />
        </Link>
      )}
      <div className={`flex flex-1 flex-col ${image ? "" : "pt-2"}`}>
        {post.categories.length > 0 && (
          <p className="mb-2 flex flex-wrap gap-x-2 text-[13px] font-semibold text-brand">
            {post.categories.map(({ category }) => (
              <Link key={category.id} href={localizePath(`category/${category.slug}`, locale)} className="link-underline">
                {(locale === "fr" && category.nameFr) || category.name}
              </Link>
            ))}
          </p>
        )}
        <Heading className="font-heading text-[18px] font-bold leading-snug text-ink">
          <Link href={href} className="transition-colors duration-300 hover:text-brand group-hover:text-brand">{post.title}</Link>
        </Heading>
        {excerpt && <p className="mt-3 text-[15px] leading-snug text-body">{excerpt}</p>}
        <p className="mt-auto flex flex-wrap items-center gap-x-3 pt-4 text-[13px] font-semibold text-ink">
          {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt, locale)}</time>}
          {post.authorDisplayName && (
            <>
              <span aria-hidden className="size-1 rounded-full bg-black/20" />
              <span>{post.authorDisplayName}</span>
            </>
          )}
        </p>
      </div>
    </article>
  );
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-12 flex justify-center gap-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="flex size-[38px] items-center justify-center rounded-[3px] border border-black/20 text-ink hover:border-brand" aria-label="Previous page">‹</Link>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={`flex size-[38px] items-center justify-center rounded-[3px] border text-[15px] font-semibold transition-all duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 ${p === page ? "border-brand bg-brand text-white" : "border-black/20 text-ink hover:border-brand hover:text-brand"}`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className="flex size-[38px] items-center justify-center rounded-[3px] border border-black/20 text-ink hover:border-brand" aria-label="Next page">›</Link>
      )}
    </nav>
  );
}
