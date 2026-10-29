import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizePath, t } from "@/lib/i18n";
import { listPublishedPosts } from "@/lib/content/public";
import { SiteShell } from "@/components/site/site-shell";
import { PostCard, Pagination } from "@/components/site/post-card";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function SearchPage(props: PageProps<"/[lang]/search">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  const sp = await props.searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const result = q ? await listPublishedPosts({ locale: lang, search: q, page, perPage: 9 }) : null;
  const base = localizePath("search", lang);
  return (
    <SiteShell locale={lang}>
      <section className="pb-12 pt-6 text-center">
        <div className="site-container">
          <h1 className="font-heading text-[36px] font-bold text-ink md:text-[56px]">{t("search", lang)}</h1>
          <form action={base} role="search" className="mx-auto mt-8 flex max-w-[560px] gap-2">
            <label htmlFor="q" className="sr-only">{t("search", lang)}</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder={t("searchPlaceholder", lang)} className="site-field flex-1" />
            <button className="btn btn-primary" type="submit">{t("search", lang)}</button>
          </form>
        </div>
      </section>
      <div className="site-container pb-20">
        {result && (result.posts.length ? (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {result.posts.map((p) => <li key={p.id}><PostCard post={p} locale={lang} /></li>)}
          </ul>
        ) : <p className="text-center">{t("noPosts", lang)}</p>)}
        {result && (
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => `${base}?q=${encodeURIComponent(q)}&page=${p}`} />
        )}
      </div>
    </SiteShell>
  );
}
