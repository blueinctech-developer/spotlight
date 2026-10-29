import type { AllSettings } from "@/lib/settings-schema";

/** Structured data. "<" is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationLd(settings: AllSettings, base: string) {
  const sameAs = Object.values(settings.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.general.siteName,
    url: `${base}/`,
    logo: `${base}/brand/logo.png`,
    ...(settings.contact.email ? { email: settings.contact.email } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** WebSite with the site search (as Yoast output on the old site). */
export function websiteLd(settings: AllSettings, base: string, homePath: string, searchPath: string, locale: "en" | "fr") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.general.siteName,
    url: `${base}${homePath}`,
    inLanguage: locale === "fr" ? "fr-FR" : "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}${searchPath}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Breadcrumb trail; the last item (current page) has no link. */
export function breadcrumbLd(items: { name: string; url?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, ...(it.url ? { item: it.url } : {}) })),
  };
}

export function articleLd(input: {
  title: string; url: string; image?: string; published?: Date | null; modified: Date; author?: string | null; publisher: string; base: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    mainEntityOfPage: input.url,
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.published ? { datePublished: input.published.toISOString() } : {}),
    dateModified: input.modified.toISOString(),
    author: { "@type": "Organization", name: input.author || input.publisher },
    publisher: { "@type": "Organization", name: input.publisher, logo: { "@type": "ImageObject", url: `${input.base}/brand/logo.png` } },
  };
}

export function eventLd(e: { title: string; startsAt: Date | null; endsAt: Date | null; venueName: string | null; venueAddress: string | null; description?: string | null; registrationUrl: string | null }, base: string, organizer: string) {
  if (!e.startsAt) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BusinessEvent",
    name: e.title,
    startDate: e.startsAt.toISOString(),
    ...(e.endsAt ? { endDate: e.endsAt.toISOString() } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    ...(e.venueName ? { location: { "@type": "Place", name: e.venueName, address: e.venueAddress ?? undefined } } : {}),
    ...(e.description ? { description: e.description } : {}),
    organizer: { "@type": "Organization", name: organizer, url: `${base}/` },
    ...(e.registrationUrl
      ? { offers: { "@type": "Offer", url: e.registrationUrl.startsWith("/") ? `${base}${e.registrationUrl}` : e.registrationUrl, availability: "https://schema.org/InStock" } }
      : {}),
  };
}
