import { getAllSettings } from "@/lib/settings";
import { getMediaMap, getMenus } from "@/lib/content/public";
import { tr } from "@/lib/settings-schema";
import type { Locale } from "@/lib/i18n";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export type HeaderVariant = "light" | "dark";
export type FooterVariant = "default" | "seat" | "none";

/** Header + main + footer for every public page. Variants come from the page record. */
export async function SiteShell({
  locale,
  headerVariant = "light",
  footerVariant = "default",
  children,
}: {
  locale: Locale;
  headerVariant?: string;
  footerVariant?: string;
  children: React.ReactNode;
}) {
  const [settings, menus] = await Promise.all([getAllSettings(), getMenus(locale)]);
  const logo = settings.general.logoId ? (await getMediaMap([settings.general.logoId]))[settings.general.logoId] : null;
  const dark = headerVariant === "dark";
  return (
    // overflow-x: clip stops elements waiting to slide in from the side from widening the page;
    // unlike "hidden" it keeps the sticky header working.
    <div className="flex min-h-screen flex-col [overflow-x:clip]">
      <SiteHeader
        locale={locale}
        variant={dark ? "dark" : "light"}
        logoUrl={logo?.url ?? "/brand/logo.png"}
        siteName={settings.general.siteName}
        items={menus.header?.items ?? []}
        cta={{
          label: dark ? tr(settings.header.darkCtaLabel, locale) : tr(settings.header.ctaLabel, locale),
          href: dark ? settings.header.darkCtaHref : settings.header.ctaHref,
          ticketIcon: !dark,
        }}
      />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter locale={locale} variant={(footerVariant as FooterVariant) || "default"} settings={settings} menus={menus} />
    </div>
  );
}
