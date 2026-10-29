"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { IconChevronDown } from "./icons";
import type { Locale } from "@/lib/i18n";

/**
 * Fallback link (also used without JavaScript): translations usually share the same slug, as
 * with TranslatePress, so the equivalent page is the same path with or without "/fr".
 */
function counterpart(pathname: string, target: Locale): string {
  const enPath = pathname === "/fr" || pathname === "/fr/" ? "/" : pathname.startsWith("/fr/") ? pathname.slice(3) : pathname;
  return target === "fr" ? (enPath === "/" ? "/fr/" : `/fr${enPath}`) : enPath;
}

const LABELS: Record<Locale, string> = { en: "English", fr: "Français" };

/**
 * The page's hreflang alternates are the source of truth: they follow translation links, so a
 * French page with a different slug is still found. If the page has alternates but none for
 * the target language (no translation yet), go to that language's home page, not a 404.
 */
function alternateFromHead(target: Locale): string | null {
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]');
  if (!links.length) return null;
  for (const link of links) {
    const lang = (link.getAttribute("hreflang") ?? "").toLowerCase();
    if (lang === target || lang.startsWith(`${target}-`)) {
      try {
        const u = new URL(link.href);
        return u.pathname + u.search;
      } catch {
        return null;
      }
    }
  }
  return target === "fr" ? "/fr/" : "/";
}

function useSwitchLanguage() {
  const router = useRouter();
  return (e: ReactMouseEvent<HTMLAnchorElement>, target: Locale) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const href = alternateFromHead(target);
    if (!href) return; // keep the plain link
    e.preventDefault();
    router.push(href);
  };
}

function Flag({ locale }: { locale: Locale }) {
  return locale === "en" ? (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden className="rounded-[1px]">
      <rect width="18" height="12" fill="#b22234" />
      {[1, 3, 5, 7, 9, 11].map((y) => <rect key={y} y={y} width="18" height="1" fill="#fff" />)}
      <rect width="8" height="6.5" fill="#3c3b6e" />
    </svg>
  ) : (
    <svg width="18" height="12" viewBox="0 0 3 2" aria-hidden className="rounded-[1px]">
      <rect width="1" height="2" fill="#002395" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#ed2939" />
    </svg>
  );
}

/** Footer dropdown, as on the original site. */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const switchTo = useSwitchLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  const other: Locale = locale === "en" ? "fr" : "en";
  return (
    <div ref={ref} className="relative inline-block" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-[152px] items-center gap-2 border border-black/30 bg-white px-7 py-3 text-[17px] font-medium text-text transition-colors duration-300 hover:border-brand"
      >
        <Flag locale={locale} />
        <span className="flex-1 text-left">{LABELS[locale]}</span>
        <IconChevronDown width={14} height={14} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-pop absolute bottom-full left-0 z-10 mb-1 w-full border border-black/30 bg-white shadow-lg">
          <Link
            href={counterpart(pathname, other)}
            onClick={(e) => switchTo(e, other)}
            hrefLang={other}
            lang={other}
            className="flex items-center gap-2 px-7 py-3 text-[17px] font-medium text-text hover:text-brand"
          >
            <Flag locale={other} />
            {LABELS[other]}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Compact links used in the mobile menu. */
export function LanguageLinks({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const switchTo = useSwitchLanguage();
  return (
    <div className="flex gap-3">
      {(["en", "fr"] as const).map((l) => (
        <Link
          key={l}
          href={counterpart(pathname, l)}
          onClick={(e) => l !== locale && switchTo(e, l)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          className={`flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${l === locale ? "border-brand text-brand" : "border-black/15 text-ink"}`}
        >
          <Flag locale={l} /> {LABELS[l]}
        </Link>
      ))}
    </div>
  );
}
