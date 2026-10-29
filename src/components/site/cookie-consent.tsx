"use client";

import Script from "next/script";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { localizeHref, t, type Locale } from "@/lib/i18n";

const KEY = "snf-consent";
type Choice = "granted" | "denied" | null;

const listeners = new Set<() => void>();
function read(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}
function write(v: Exclude<Choice, null>) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable: choice lasts for this page view only */
  }
  memory = v;
  listeners.forEach((l) => l());
}
let memory: Choice = null;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * Cookie notice. Analytics (Google Analytics) loads only after explicit consent.
 * When the banner is disabled in Settings, analytics loads without asking.
 */
export function CookieConsent(props: {
  locale: Locale;
  enabled: boolean;
  message: string;
  privacyHref: string;
  gaId: string;
}) {
  const choice = useSyncExternalStore(subscribe, () => memory ?? read(), () => "pending" as const);
  const consented = !props.enabled || choice === "granted";

  return (
    <>
      {props.gaId && consented && choice !== "pending" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${props.gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${props.gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {/* Rendered on the server too ("pending"), so it paints with the page instead of popping
          in after JavaScript loads. CONSENT_BOOT_SCRIPT hides it before paint for visitors who
          already chose; after hydration it is removed for them. */}
      {props.enabled && (choice === null || choice === "pending") && props.message && (
        <div
          role="region"
          aria-label="Cookies"
          className="cookie-banner fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-lg bg-charcoal p-4 text-sm text-white shadow-2xl sm:flex sm:items-center sm:gap-4"
        >
          <p className="flex-1 leading-relaxed">
            {props.message}{" "}
            <Link href={localizeHref(props.privacyHref, props.locale)} className="underline">
              {t("privacyPolicy", props.locale)}
            </Link>
          </p>
          <div className="mt-3 flex gap-2 sm:mt-0">
            <button type="button" className="btn btn-primary px-4 py-2 text-sm" onClick={() => write("granted")}>
              {t("cookieAccept", props.locale)}
            </button>
            <button type="button" className="btn border border-white/40 px-4 py-2 text-sm text-white" onClick={() => write("denied")}>
              {t("cookieDecline", props.locale)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
