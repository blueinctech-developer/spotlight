import Link from "next/link";
import type { getPublishedPost } from "@/lib/content/public";
import { getBlogSidebar, toMediaRef } from "@/lib/content/public";
import { formatDate, localizePath, t, type Locale } from "@/lib/i18n";
import { htmlToText, sanitizeRichText } from "@/lib/sanitize";
import type { AllSettings } from "@/lib/settings-schema";
import { siteUrl } from "@/lib/env";
import { MediaImage } from "@/components/blocks/media";
import { PostCard } from "@/components/site/post-card";
import { SocialLinks } from "@/components/site/social-links";
import { JsonLd, articleLd } from "@/components/site/json-ld";
import { IconArrowLeft, IconArrowRight, IconFacebook, IconLinkedin, IconSearch, IconX } from "@/components/site/icons";

type Data = NonNullable<Awaited<ReturnType<typeof getPublishedPost>>>;

export async function PostView({ locale, data, settings }: { locale: Locale; data: Data; settings: AllSettings }) {
  const { post, newer, older, related } = data;
  const sidebar = await getBlogSidebar(locale);
  const image = post.featuredImage ? toMediaRef(post.featuredImage, locale) : null;
  const url = `${siteUrl()}${localizePath(post.slug, locale)}`;
  const minutes = Math.max(1, Math.round(htmlToText(post.content).split(" ").length / 220));
  const firstCat = post.categories[0]?.category;
  const enc = encodeURIComponent(url);
  const shares = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, Icon: IconFacebook, cls: "bg-[#1877f2]" },
    { label: "X (Twitter)", href: `https://twitter.com/intent/tweet?url=${enc}&text=${encodeURIComponent(post.title)}`, Icon: IconX, cls: "bg-black" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, Icon: IconLinkedin, cls: "bg-[#0a66c2]" },
  ];

  return (
    <>
      <JsonLd
        data={articleLd({
          title: post.title, url, image: image?.url ? new URL(image.url, siteUrl()).href : undefined, published: post.publishedAt,
          modified: post.updatedAt, author: post.authorDisplayName, publisher: settings.general.siteName, base: siteUrl(),
        })}
      />
      <section className="pb-16 pt-6 md:pb-24">
        <div className="site-container text-center">
          <h1 className="hero-line mx-auto max-w-[900px] font-heading text-[32px] font-bold leading-[1.3] text-ink md:text-[52px]">{post.title}</h1>
          <nav aria-label="Breadcrumb" className="hero-line mt-5 text-[13px]">
            <ol className="flex flex-wrap justify-center gap-x-2">
              <li><Link href={localizePath("/", locale)} className="text-ink hover:text-brand">{t("home", locale)}</Link></li>
              {firstCat && (
                <li className="flex gap-2"><span aria-hidden>/</span><Link href={localizePath(`category/${firstCat.slug}`, locale)} className="text-ink hover:text-brand">{(locale === "fr" && firstCat.nameFr) || firstCat.name}</Link></li>
              )}
              <li className="flex gap-2"><span aria-hidden>/</span><span aria-current="page" className="text-brand">{post.title}</span></li>
            </ol>
          </nav>
        </div>
      </section>

      <div className="site-container grid gap-12 pb-20 lg:grid-cols-[1fr_340px]">
        <article className="min-w-0">
          {image && (
            <div data-reveal="blur" className="relative mb-6 aspect-[16/8.5] overflow-hidden rounded-[5px]">
              <MediaImage media={image} fill priority sizes="(min-width: 1024px) 820px, 100vw" />
            </div>
          )}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-ink">
            <span className="text-brand">
              {post.categories.map(({ category }) => (
                <Link key={category.id} href={localizePath(`category/${category.slug}`, locale)} className="hover:underline">
                  {(locale === "fr" && category.nameFr) || category.name}
                </Link>
              ))}
            </span>
            <span aria-hidden>·</span>
            <span>{minutes} {t("minsRead", locale)}</span>
            {post.publishedAt && (<><span aria-hidden>·</span><time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt, locale)}</time></>)}
            {post.authorDisplayName && (<><span aria-hidden>·</span><span>{post.authorDisplayName}</span></>)}
          </p>
          <div className="prose-site mt-8 text-[16px]" dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content) }} />

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-semibold text-ink">{t("shareVia", locale)}</span>
            {shares.map(({ label, href, Icon, cls }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 rounded-[3px] px-3 py-1.5 text-xs font-semibold text-white ${cls}`}>
                <Icon width={13} height={13} /> {label}
              </a>
            ))}
          </div>

          {post.tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {post.tags.map(({ tag }) => (
                <li key={tag.id}><Link href={localizePath(`tag/${tag.slug}`, locale)} className="inline-block rounded border border-black/10 px-3 py-1 text-[13px] text-text hover:border-brand hover:text-brand">{(locale === "fr" && tag.nameFr) || tag.name}</Link></li>
              ))}
            </ul>
          )}

          <nav aria-label="Posts" className="mt-12 grid gap-6 border-t border-black/10 pt-8 sm:grid-cols-2">
            <div>
              {older && (
                <Link href={localizePath(older.slug, locale)} className="group block">
                  <span className="flex items-center gap-2 text-sm text-body"><IconArrowLeft width={14} height={14} /> {t("previousPost", locale)}</span>
                  <span className="mt-1 block font-heading font-bold uppercase text-ink group-hover:text-brand">{older.title}</span>
                </Link>
              )}
            </div>
            <div className="sm:text-right">
              {newer && (
                <Link href={localizePath(newer.slug, locale)} className="group block">
                  <span className="flex items-center gap-2 text-sm text-body sm:justify-end">{t("nextPost", locale)} <IconArrowRight width={14} height={14} /></span>
                  <span className="mt-1 block font-heading font-bold uppercase text-ink group-hover:text-brand">{newer.title}</span>
                </Link>
              )}
            </div>
          </nav>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="font-heading text-[30px] font-semibold text-ink">{t("relatedPosts", locale)}</h2>
              <ul data-reveal-stagger className="mt-8 grid gap-6 sm:grid-cols-2">
                {related.map((p) => <li key={p.id}><PostCard post={p} locale={locale} heading="h3" /></li>)}
              </ul>
            </section>
          )}
        </article>

        <aside data-reveal-stagger className="space-y-12">
          <section>
            <h2 className="font-sans text-[26px] font-bold text-brand">{t("search", locale)}</h2>
            <form action={localizePath("search", locale)} role="search" className="mt-4 flex items-center rounded-[3px] bg-field">
              <label htmlFor="sidebar-search" className="sr-only">{t("search", locale)}</label>
              <input id="sidebar-search" name="q" type="search" placeholder={t("searchPlaceholder", locale)} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[15px] outline-none" />
              <button type="submit" className="px-4 text-ink" aria-label={t("search", locale)}><IconSearch /></button>
            </form>
          </section>
          <section>
            <h2 className="font-sans text-[26px] font-bold text-brand">{t("categories", locale)}</h2>
            <ul className="mt-4 space-y-2">
              {sidebar.categories.map((c) => (
                <li key={c.id}><Link href={localizePath(`category/${c.slug}`, locale)} className="text-[16px] text-text hover:text-brand">{(locale === "fr" && c.nameFr) || c.name}</Link></li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-sans text-[26px] font-bold text-brand">{t("latestPosts", locale)}</h2>
            <ul className="mt-4 space-y-4">
              {sidebar.latest.map((p) => (
                <li key={p.id} className="flex gap-3">
                  {p.featuredImage && (
                    <span className="relative size-[60px] shrink-0 overflow-hidden rounded">
                      <MediaImage media={toMediaRef(p.featuredImage, locale)} fill sizes="60px" />
                    </span>
                  )}
                  <span>
                    <Link href={localizePath(p.slug, locale)} className="font-heading text-[15px] font-semibold leading-snug text-ink hover:text-brand">{p.title}</Link>
                    {p.publishedAt && <span className="block text-[13px] text-body">{formatDate(p.publishedAt, locale)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {sidebar.tags.length > 0 && (
            <section>
              <h2 className="font-sans text-[26px] font-bold text-brand">{t("tags", locale)}</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {sidebar.tags.map((tg) => (
                  <li key={tg.id}><Link href={localizePath(`tag/${tg.slug}`, locale)} className="inline-block rounded border border-black/10 px-3 py-1.5 text-[13px] text-text hover:border-brand hover:text-brand">{(locale === "fr" && tg.nameFr) || tg.name}</Link></li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="font-sans text-[26px] font-bold text-brand">{t("connect", locale)}</h2>
            <div className="mt-4"><SocialLinks social={settings.social} only={["facebook", "twitter", "linkedin", "youtube"]} /></div>
          </section>
        </aside>
      </div>
    </>
  );
}
