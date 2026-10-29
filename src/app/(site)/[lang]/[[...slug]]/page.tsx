import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { isLocale, localizePath, t, type Locale } from "@/lib/i18n";
import { resolvePath, type Resolved } from "@/lib/content/resolve";
import { blocksFrom, getCurrentEvent, loadBlockData, toMediaRef } from "@/lib/content/public";
import { getAllSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/env";
import { htmlToText, truncate } from "@/lib/sanitize";
import { tr } from "@/lib/settings-schema";
import { SiteShell } from "@/components/site/site-shell";
import { Blocks } from "@/components/blocks/render";
import { PostView } from "@/components/site/views/post-view";
import { SpeakerView, SpeakersArchiveView } from "@/components/site/views/speaker-views";
import { ArchiveView, archiveTitle } from "@/components/site/views/archive-view";
import { JsonLd, breadcrumbLd, eventLd, organizationLd, websiteLd } from "@/components/site/json-ld";
import { htmlToText as plain } from "@/lib/sanitize";

// Pages are rendered on first request, cached, and refreshed when content is published
// (revalidatePath) or at the latest every 5 minutes (so scheduled posts go live on time).
export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = PageProps<"/[lang]/[[...slug]]">;

async function resolve(props: Props): Promise<{ locale: Locale; r: Resolved; segs: string[] }> {
  const { lang, slug } = await props.params;
  if (!isLocale(lang)) notFound();
  const segs = slug ?? [];
  return { locale: lang, r: await resolvePath(lang, segs), segs };
}

function alternatesMeta(alts: { locale: Locale; href: string }[], self: string) {
  const languages: Record<string, string> = {};
  for (const a of alts) languages[a.locale === "fr" ? "fr-FR" : "en-US"] = a.href;
  const en = alts.find((a) => a.locale === "en");
  if (en) languages["x-default"] = en.href;
  return { canonical: self, languages };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, r, segs } = await resolve(props);
  const settings = await getAllSettings();
  const selfPath = localizePath(segs.join("/"), locale);
  const sameSlugAlts = (["en", "fr"] as const).map((l) => ({ locale: l, href: localizePath(segs.join("/"), l) }));
  const site = settings.general.siteName;

  switch (r.type) {
    case "page": {
      const p = r.data.page;
      const og = p.ogImage ?? p.featuredImage;
      const desc = p.seoDescription || p.excerpt || tr(settings.seo.defaultDescription, locale) || undefined;
      return {
        title: p.seoTitle ? { absolute: p.seoTitle } : p.path === "" ? { absolute: `${site} - ${tr(settings.general.tagline, locale) || site}` } : p.title,
        description: desc,
        alternates: alternatesMeta(r.data.alternates, p.canonicalUrl || (r.listPage > 1 ? `${r.basePath}page/${r.listPage}/` : selfPath)),
        robots: p.noindex ? { index: false, follow: true } : undefined,
        openGraph: {
          title: p.ogTitle || p.seoTitle || p.title,
          description: p.ogDescription || desc,
          url: selfPath,
          images: og ? [toMediaRef(og).url] : undefined,
        },
      };
    }
    case "post": {
      const p = r.data.post;
      const og = p.ogImage ?? p.featuredImage;
      const desc = p.seoDescription || truncate(htmlToText(p.excerpt || p.content), 160);
      return {
        title: p.seoTitle ? { absolute: p.seoTitle } : p.title,
        description: desc,
        alternates: alternatesMeta(r.data.alternates, p.canonicalUrl || selfPath),
        robots: p.noindex ? { index: false, follow: true } : undefined,
        openGraph: {
          type: "article",
          title: p.ogTitle || p.title,
          description: p.ogDescription || desc,
          url: selfPath,
          publishedTime: p.publishedAt?.toISOString(),
          modifiedTime: p.updatedAt.toISOString(),
          images: og ? [toMediaRef(og).url] : undefined,
        },
      };
    }
    case "speaker": {
      const s = r.data.speaker;
      const bio = (locale === "fr" && s.bioFr) || s.bio;
      return {
        title: s.name,
        description:
          truncate(htmlToText(bio) || [s.jobTitle, s.organization].filter(Boolean).join(", "), 160) ||
          (locale === "fr" ? `${s.name}, intervenant à Spotlight Nigeria.` : `${s.name}, speaker at Spotlight Nigeria.`),
        alternates: alternatesMeta(sameSlugAlts, selfPath),
        openGraph: { title: s.name, url: selfPath, images: s.photo ? [toMediaRef(s.photo).url] : undefined },
      };
    }
    case "speakers":
      return { title: t("speakersArchive", locale), alternates: alternatesMeta(sameSlugAlts, selfPath) };
    case "archive":
      return {
        title: archiveTitle(r.archive, locale),
        alternates: alternatesMeta(sameSlugAlts, selfPath),
        robots: r.archive.kind === "date" || r.archive.kind === "author" ? { index: false, follow: true } : undefined,
      };
    default:
      return { title: t("pageNotFound", locale), robots: { index: false } };
  }
}

export default async function Page(props: Props) {
  const { locale, r } = await resolve(props);

  if (r.type === "redirect") (r.permanent ? permanentRedirect : redirect)(r.to);
  if (r.type === "notFound") notFound();

  const settings = await getAllSettings();

  if (r.type === "page") {
    const p = r.data.page;
    const blocks = blocksFrom(p.blocks);
    const data = await loadBlockData(blocks, locale);
    const home = localizePath("/", locale);
    const isHome = p.path === "";
    const current = isHome ? await getCurrentEvent() : null;
    const currentLd = current
      ? eventLd(
          { ...current, title: (locale === "fr" && current.titleFr) || current.title, description: plain((locale === "fr" && current.descriptionFr) || current.description) || null },
          siteUrl(),
          "Friends of Nigeria (FON) Europe",
        )
      : null;
    return (
      <SiteShell locale={locale} headerVariant={p.headerVariant} footerVariant={p.footerVariant}>
        {isHome && <JsonLd data={organizationLd(settings, siteUrl())} />}
        {isHome && <JsonLd data={websiteLd(settings, siteUrl(), home, localizePath("search", locale), locale)} />}
        {!isHome && (
          <JsonLd data={breadcrumbLd([{ name: t("home", locale), url: siteUrl() + home }, { name: p.title }])} />
        )}
        {currentLd && <JsonLd data={currentLd} />}
        <Blocks
          blocks={blocks}
          ctx={{
            locale,
            data,
            listPage: r.listPage,
            basePath: r.basePath,
            social: settings.social,
            breadcrumb: isHome ? [] : [{ label: t("home", locale), href: home }, { label: p.title }],
          }}
        />
      </SiteShell>
    );
  }

  return (
    <SiteShell locale={locale} headerVariant={r.type === "speaker" || r.type === "speakers" ? "dark" : "light"}>
      {(r.type === "post" || r.type === "speaker") && (
        <JsonLd
          data={breadcrumbLd([
            { name: t("home", locale), url: siteUrl() + localizePath("/", locale) },
            ...(r.type === "speaker" ? [{ name: t("speakersArchive", locale), url: siteUrl() + localizePath("speakers", locale) }] : []),
            { name: r.type === "post" ? r.data.post.title : r.data.speaker.name },
          ])}
        />
      )}
      {r.type === "post" &&<PostView locale={locale} data={r.data} settings={settings} />}
      {r.type === "speaker" && <SpeakerView locale={locale} data={r.data} />}
      {r.type === "speakers" && <SpeakersArchiveView locale={locale} page={r.page} />}
      {r.type === "archive" && <ArchiveView locale={locale} archive={r.archive} page={r.page} basePath={r.basePath} />}
    </SiteShell>
  );
}
