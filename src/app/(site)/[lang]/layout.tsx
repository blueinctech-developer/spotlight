import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans, Urbanist } from "next/font/google";
import "../../globals.css";
import { isLocale, locales, t } from "@/lib/i18n";
import { getAllSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/env";
import { getMediaMap } from "@/lib/content/public";
import { CookieConsent } from "@/components/site/cookie-consent";
import { BackToTop, RevealObserver } from "@/components/site/motion";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-jakarta", display: "swap" });
const urbanist = Urbanist({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-urbanist", display: "swap" });

// Unknown languages are rejected below with notFound(); dynamicParams must stay true so the
// catch-all page can render CMS pages on demand (ISR) in production.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = { themeColor: "#21b354", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const s = await getAllSettings();
  const locale = isLocale(lang) ? lang : "en";
  const media = await getMediaMap([s.general.faviconId, s.seo.ogImageId].filter((x): x is string => !!x));
  const favicon = s.general.faviconId ? media[s.general.faviconId]?.url : null;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.general.siteName, template: s.seo.titleTemplate || "%s" },
    description: (locale === "fr" ? s.seo.defaultDescription.fr : "") || s.seo.defaultDescription.en || undefined,
    icons: { icon: favicon ?? "/brand/favicon.png", apple: favicon ?? "/brand/favicon.png" },
    robots: s.seo.discourageIndexing ? { index: false, follow: false } : undefined,
    verification: {
      google: s.seo.googleSiteVerification || undefined,
      other: s.seo.bingSiteVerification ? { "msvalidate.01": s.seo.bingSiteVerification } : undefined,
    },
    openGraph: {
      siteName: s.general.siteName,
      locale: locale === "fr" ? "fr_FR" : "en_US",
      type: "website",
      images: s.seo.ogImageId && media[s.seo.ogImageId] ? [media[s.seo.ogImageId].url] : undefined,
    },
  };
}

export default async function SiteRootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const settings = await getAllSettings();
  return (
    // suppressHydrationWarning: the inline script below may add "consent-set" before React loads.
    <html lang={lang === "fr" ? "fr-FR" : "en-US"} className={`${jakarta.variable} ${urbanist.variable}`} suppressHydrationWarning>
      <body>
        {/* Runs before the page paints: hides the server-rendered cookie banner for visitors who already chose. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem("snf-consent");if(c==="granted"||c==="denied")document.documentElement.classList.add("consent-set")}catch(e){}`,
          }}
        />
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-ink focus:shadow">
          {t("skipToContent", lang)}
        </a>
        {children}
        <RevealObserver />
        <BackToTop label={t("backToTop", lang)} />
        <CookieConsent
          locale={lang}
          enabled={settings.privacy.cookieBanner}
          message={(lang === "fr" ? settings.privacy.message.fr : "") || settings.privacy.message.en}
          privacyHref={settings.privacy.privacyHref}
          gaId={settings.analytics.gaMeasurementId}
        />
      </body>
    </html>
  );
}
