import Link from "next/link";
import type { ArchiveKind } from "@/lib/content/resolve";
import { listPublishedPosts } from "@/lib/content/public";
import { formatDate, localizePath, t, type Locale } from "@/lib/i18n";
import { PostCard, Pagination } from "@/components/site/post-card";

export function archiveTitle(a: ArchiveKind, locale: Locale): string {
  if (a.kind === "date") {
    const d = new Date(Date.UTC(a.year, (a.month ?? 1) - 1, a.day ?? 1, 12));
    const opts: Intl.DateTimeFormatOptions = a.day
      ? { year: "numeric", month: "long", day: "numeric" }
      : a.month
        ? { year: "numeric", month: "long" }
        : { year: "numeric" };
    return `${t("archive", locale)}: ${formatDate(d, locale, opts)}`;
  }
  if (a.kind === "author") return `${t("postsBy", locale)} ${a.name}`;
  return a.name;
}

export async function ArchiveView({ locale, archive, page, basePath }: { locale: Locale; archive: ArchiveKind; page: number; basePath: string }) {
  const result = await listPublishedPosts({
    locale,
    page,
    perPage: 9,
    categorySlug: archive.kind === "category" ? archive.slug : undefined,
    tagSlug: archive.kind === "tag" ? archive.slug : undefined,
    year: archive.kind === "date" ? archive.year : undefined,
    month: archive.kind === "date" ? archive.month : undefined,
    day: archive.kind === "date" ? archive.day : undefined,
  });
  const title = archiveTitle(archive, locale);
  return (
    <>
      <section className="pb-16 pt-6 text-center">
        <div className="site-container">
          <h1 className="hero-line font-heading text-[36px] font-bold text-ink md:text-[56px]">{title}</h1>
          <nav aria-label="Breadcrumb" className="mt-5 text-[13px]">
            <Link href={localizePath("/", locale)} className="text-ink hover:text-brand">{t("home", locale)}</Link>
            <span className="mx-2">/</span>
            <span aria-current="page" className="text-brand">{title}</span>
          </nav>
        </div>
      </section>
      <div className="site-container pb-20">
        {result.posts.length ? (
          <ul data-reveal-stagger className="columns-1 gap-5 md:columns-2 lg:columns-3">
            {result.posts.map((p) => <li key={p.id} className="mb-5 break-inside-avoid"><PostCard post={p} locale={locale} /></li>)}
          </ul>
        ) : (
          <p className="text-center">{t("noPosts", locale)}</p>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => (p === 1 ? basePath : `${basePath}page/${p}/`)} />
      </div>
    </>
  );
}
