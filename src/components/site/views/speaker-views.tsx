import Link from "next/link";
import Image from "next/image";
import type { getPublishedSpeaker } from "@/lib/content/public";
import { listPublishedSpeakers, toMediaRef } from "@/lib/content/public";
import { formatDate, localizePath, t, type Locale } from "@/lib/i18n";
import { sanitizeRichText } from "@/lib/sanitize";
import { MediaImage } from "@/components/blocks/media";
import { SpeakerGrid } from "@/components/blocks/render";
import { Pagination } from "@/components/site/post-card";
import { IconCalendar, IconClock, IconLocation } from "@/components/site/icons";

function DarkBanner({ title, crumbs, children }: { title: string; crumbs: { label: string; href?: string }[]; children?: React.ReactNode }) {
  return (
    <section className="bg-dark-texture relative overflow-hidden text-white">
      <div className="parallax-media absolute inset-0"><Image src="/brand/hero-title-bar.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-60" /></div>
      <div className="site-container relative py-16 md:py-24">
        {children}
        <nav aria-label="Breadcrumb" className="hero-line text-[13px]">
          <ol className="flex flex-wrap gap-x-2">
            {crumbs.map((c, i) => (
              <li key={i} className="flex gap-2">
                {i > 0 && <span aria-hidden className="text-white/40">/</span>}
                {c.href ? <Link href={c.href} className="text-white/60 hover:text-white">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="hero-line mt-3 font-heading text-[34px] font-bold text-white md:text-[56px]">{title}</h1>
      </div>
    </section>
  );
}

type SpeakerData = NonNullable<Awaited<ReturnType<typeof getPublishedSpeaker>>>;

export function SpeakerView({ locale, data }: { locale: Locale; data: SpeakerData }) {
  const { speaker, sessions, others } = data;
  const photo = speaker.photo ? toMediaRef(speaker.photo, locale) : null;
  const role = [(locale === "fr" && speaker.jobTitleFr) || speaker.jobTitle, speaker.organization].filter(Boolean).join(" - ");
  const bio = (locale === "fr" && speaker.bioFr) || speaker.bio;
  return (
    <>
      <DarkBanner
        title={speaker.name}
        crumbs={[
          { label: t("home", locale), href: localizePath("/", locale) },
          { label: "Speakers", href: localizePath("speakers", locale) },
          { label: speaker.name },
        ]}
      />
      <div className="site-container grid gap-12 py-16 lg:grid-cols-[380px_1fr]">
        <div>
          <div data-reveal="scale" className="zoom-frame relative aspect-square rounded-[5px] bg-mist">
            {photo && <MediaImage media={photo} fill priority sizes="380px" />}
          </div>
          {role && <p className="mt-4 text-[14px] font-semibold text-brand">{role}</p>}
          <p className="font-heading text-[22px] font-semibold text-ink">{speaker.name}</p>
        </div>
        <div>
          {bio && <div className="prose-site mb-10" dangerouslySetInnerHTML={{ __html: sanitizeRichText(bio) }} />}
          {sessions.length > 0 && (
            <>
              <h2 className="font-heading text-[26px] font-semibold text-ink">{t("sessionsBy", locale)} {speaker.name}</h2>
              <ul data-reveal-stagger className="mt-6 space-y-8">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <p className="flex items-center gap-3 rounded-[5px] bg-[#555] px-4 py-3 text-white">
                      <IconCalendar width={16} height={16} />
                      <span className="font-heading text-[18px] font-bold">{s.day}{locale === "fr" ? "er" : "st"} {t("day", locale)}</span>
                      {s.date && <span className="text-sm text-white/80">{formatDate(s.date, locale)}</span>}
                    </p>
                    <h3 className="mt-5 font-heading text-[20px] font-bold text-ink">{s.title}</h3>
                    {s.description && <div className="prose-site mt-2 text-[14px]" dangerouslySetInnerHTML={{ __html: sanitizeRichText(s.description) }} />}
                    <p className="mt-3 flex flex-wrap gap-6 text-[14px] font-semibold text-ink">
                      {(s.startTime || s.endTime) && <span className="flex items-center gap-2"><IconClock className="text-brand" width={18} height={18} /> {[s.startTime, s.endTime].filter(Boolean).join(" – ")}</span>}
                      {s.location && <span className="flex items-center gap-2"><IconLocation className="text-brand" width={18} height={18} /> {s.location}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {others.length > 0 && (
        <section className="pb-20">
          <div className="site-container">
            <h2 className="font-heading text-[30px] font-semibold text-ink">{t("otherSpeakers", locale)}</h2>
            <SpeakerGrid speakers={others} locale={locale} columns={3} />
          </div>
        </section>
      )}
    </>
  );
}

export async function SpeakersArchiveView({ locale, page }: { locale: Locale; page: number }) {
  const result = await listPublishedSpeakers(locale, page, 6);
  const base = localizePath("speakers", locale);
  return (
    <>
      <section className="bg-dark-texture relative overflow-hidden text-center text-white">
        <div className="parallax-media absolute inset-0"><Image src="/brand/hero-title-bar.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-60" /></div>
        <div className="site-container relative py-16 md:py-24">
          <h1 className="hero-line font-heading text-[34px] font-bold text-white md:text-[56px]">{t("speakersArchive", locale)}</h1>
          <nav aria-label="Breadcrumb" className="mt-4 text-[13px]">
            <Link href={localizePath("/", locale)} className="text-white/60 hover:text-white">{t("home", locale)}</Link>
            <span className="mx-2 text-white/40">/</span>
            <span aria-current="page">Speakers</span>
          </nav>
        </div>
      </section>
      <div className="site-container py-16">
        <SpeakerGrid speakers={result.speakers} locale={locale} columns={3} />
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => (p === 1 ? base : `${base}page/${p}/`)} />
      </div>
    </>
  );
}
