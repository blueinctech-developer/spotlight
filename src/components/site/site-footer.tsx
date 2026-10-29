import Image from "next/image";
import Link from "next/link";
import type { AllSettings } from "@/lib/settings-schema";
import { tr } from "@/lib/settings-schema";
import type { Menus, NavItem } from "@/lib/content/public";
import { localizeHref, type Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { NewsletterForm } from "@/components/forms/newsletter-form";

function linkProps(item: NavItem) {
  return item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

export function SiteFooter({
  locale,
  variant,
  settings,
  menus,
}: {
  locale: Locale;
  variant: "default" | "seat" | "none";
  settings: AllSettings;
  menus: Menus;
}) {
  const columns = ["footer-1", "footer-2", "footer-3"].map((k) => menus[k]).filter(Boolean);
  const legal = menus["footer-legal"]?.items ?? [];
  const cta = settings.footerCta;
  const seat = settings.footerSeat;

  return (
    <footer className="bg-white">
      {variant === "default" && cta.enabled && tr(cta.title, locale) && (
        <section className="bg-brand text-white">
          <div className="site-container flex flex-col items-center gap-6 py-10 text-center md:flex-row md:text-left">
            <div data-reveal="zoom" className="shrink-0">
              <Image src="/brand/nigeria-badge.png" alt="" width={140} height={140} className="animate-float size-[140px]" />
            </div>
            <div data-reveal="right" data-reveal-delay="100" className="flex-1 md:pl-8">
              <p className="text-[18px] uppercase">{tr(cta.eyebrow, locale)}</p>
              <h2 className="mt-2 font-sans text-[28px] font-bold leading-tight text-white md:text-[35px]">{tr(cta.title, locale)}</h2>
            </div>
            <Link data-reveal="up" data-reveal-delay="200" href={localizeHref(cta.buttonHref, locale)} className="btn btn-dark px-6 py-3 md:mr-14">
              {tr(cta.buttonLabel, locale)}
            </Link>
          </div>
        </section>
      )}

      {variant === "seat" && (
        <section className="relative">
          <div className="relative overflow-hidden bg-night pb-40 pt-24 text-center">
            <div aria-hidden className="parallax-media absolute inset-0 bg-[url('/brand/audience.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-black/55" aria-hidden />
            <div data-reveal="up" className="site-container relative">
              <h2 className="mx-auto max-w-xl font-heading text-[32px] font-semibold leading-tight text-white md:text-[44px]">
                {tr(seat.title, locale)}
              </h2>
              <Link href={localizeHref(seat.buttonHref, locale)} className="btn btn-primary mt-8 px-10">
                {tr(seat.buttonLabel, locale)}
              </Link>
            </div>
          </div>
          <div className="site-container relative -mt-28">
            <div data-reveal="up" data-reveal-delay="100" className="grid gap-6 rounded-md bg-brand px-6 py-8 text-white shadow-[0_30px_60px_-30px_rgba(33,179,84,0.7)] md:grid-cols-2 md:items-center md:px-12 md:py-10">
              <div>
                <p className="text-[18px] uppercase">{tr(seat.newsletterEyebrow, locale)}</p>
                <h3 className="mt-2 font-sans text-[26px] font-bold leading-tight text-white md:text-[35px]">{tr(seat.newsletterTitle, locale)}</h3>
              </div>
              <NewsletterForm locale={locale} />
            </div>
          </div>
        </section>
      )}

      <div className="site-container grid gap-10 py-16 md:grid-cols-[1fr_3fr] md:py-20">
        <div className="flex flex-col items-start justify-center gap-6">
          {variant === "seat" && (
            <Image src="/brand/favicon.png" alt="" width={86} height={86} className="size-[86px]" />
          )}
          <LanguageSwitcher locale={locale} />
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {columns.map((menu) => (
            <div key={menu.name}>
              <h2 className="font-sans text-[20px] font-bold text-ink">{menu.name}</h2>
              <ul className="mt-6 space-y-4 sm:pl-10">
                {menu.items.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} {...linkProps(item)} className="inline-block text-[17px] text-text transition-all duration-300 [transition-timing-function:var(--ease-out)] hover:translate-x-1 hover:text-brand">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-mist">
        <div className="site-container flex flex-col gap-3 py-4 text-[15px] sm:flex-row sm:items-start sm:justify-between">
          <p className="text-brand">
            {tr(settings.general.copyright, locale)}{" "}
            {settings.general.creditLabel && (
              <span className="text-text">
                {tr(settings.general.creditPrefix, locale)}{" "}
                {settings.general.creditUrl ? (
                  <a href={settings.general.creditUrl} target="_blank" rel="noopener noreferrer" className="font-bold italic underline">
                    {settings.general.creditLabel}
                  </a>
                ) : (
                  settings.general.creditLabel
                )}
              </span>
            )}
          </p>
          {legal.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-1 sm:flex-col sm:items-end lg:flex-row">
              {legal.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} {...linkProps(item)} className="link-underline text-brand">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {tr(settings.general.bottomNote, locale) && (
        <p className="site-container py-2 text-[16px] text-body">{tr(settings.general.bottomNote, locale)}</p>
      )}
    </footer>
  );
}
