import Link from "next/link";
import { SiteShell } from "@/components/site/site-shell";
import { t } from "@/lib/i18n";

// not-found receives no route params, so the message is shown in both languages.
export default function NotFound() {
  return (
    <SiteShell locale="en">
      <section className="py-24 text-center md:py-32">
        <div className="site-container">
          <p className="font-heading text-[90px] font-bold leading-none text-brand md:text-[140px]">404</p>
          <h1 className="mt-4 font-heading text-[30px] font-bold text-ink md:text-[44px]">
            {t("pageNotFound", "en")} <span className="block text-[0.6em] font-semibold text-body">{t("pageNotFound", "fr")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[520px] text-[17px]">{t("notFoundText", "en")}</p>
          <p className="mx-auto mt-1 max-w-[520px] text-[15px] italic">{t("notFoundText", "fr")}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/" className="btn btn-primary">{t("backHome", "en")}</Link>
            <Link href="/fr/" className="btn btn-outline">{t("backHome", "fr")}</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
