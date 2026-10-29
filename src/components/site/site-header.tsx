"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { NavItem } from "@/lib/content/public";
import { localizeHref, localizePath, t, type Locale } from "@/lib/i18n";
import { IconChevronDown, IconClose, IconMenu, IconTicket } from "./icons";
import { LanguageLinks } from "./language-switcher";

function isActive(item: NavItem, pathname: string): boolean {
  if (item.href !== "#" && item.href !== "" && normalize(item.href) === normalize(pathname)) return true;
  return item.children.some((c) => isActive(c, pathname));
}
const normalize = (p: string) => {
  try {
    const u = new URL(p, "https://x");
    if (u.host !== "x") return p;
    return u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
  } catch {
    return p;
  }
};

export function SiteHeader(props: {
  locale: Locale;
  variant: "light" | "dark";
  logoUrl: string;
  siteName: string;
  items: NavItem[];
  cta: { label: string; href: string; ticketIcon: boolean };
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const dark = props.variant === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const home = localizePath("/", props.locale);
  const ctaHref = localizeHref(props.cta.href, props.locale);

  return (
    <header
      className={[
        "sticky top-0 z-40 transition-[box-shadow,background-color,backdrop-filter] duration-500",
        dark
          ? scrolled ? "bg-midnight/90 text-white backdrop-blur-md" : "bg-midnight text-white"
          : scrolled ? "bg-white/85 text-ink backdrop-blur-md" : "bg-white text-ink",
        scrolled ? "shadow-[0_4px_20px_rgba(0,0,0,0.1)]" : "",
      ].join(" ")}
    >
      <div className={`site-container flex items-center justify-between gap-4 transition-[padding] duration-500 [transition-timing-function:var(--ease-out)] ${scrolled ? "py-3" : "py-5 lg:py-[30px]"}`}>
        <Link href={home} className="shrink-0 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:scale-[1.03]" aria-label={props.siteName}>
          <Image src={props.logoUrl} alt={props.siteName} width={176} height={49} priority className={`h-auto transition-[width] duration-500 [transition-timing-function:var(--ease-out)] ${scrolled ? "w-[130px] lg:w-[140px] min-[1340px]:w-[150px]" : "w-[140px] lg:w-[150px] min-[1340px]:w-[176px]"}`} />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1 min-[1340px]:gap-3">
            {props.items.map((item) => (
              <DesktopItem key={item.id} item={item} pathname={pathname} dark={dark} />
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {/* Long labels (e.g. the French "Inscrivez-vous en tant que sponsor") wrap onto two
              balanced lines instead of pushing the button off-screen. */}
          {props.cta.label && (
            <Link
              href={ctaHref}
              className="btn btn-primary min-h-10 px-3 py-2.5 text-sm leading-tight sm:min-h-[50px] [text-wrap:balance] sm:px-4 sm:py-[13px] sm:text-base lg:px-3 lg:text-[15px] min-[1340px]:px-4 min-[1340px]:text-base"
            >
              {props.cta.ticketIcon && <IconTicket className="hidden shrink-0 sm:block" />}
              {props.cta.label}
            </Link>
          )}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md transition-colors hover:bg-black/5 active:scale-95 lg:hidden"
            aria-label={t("menu", props.locale)}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <IconMenu width={26} height={26} />
          </button>
        </div>
      </div>
      {/* Portalled to <body>: the frosted header's backdrop-filter would otherwise trap position:fixed. */}
      {open &&
        createPortal(
          <MobileMenu {...props} home={home} pathname={pathname} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </header>
  );
}

function DesktopItem({ item, pathname, dark }: { item: NavItem; pathname: string; dark: boolean }) {
  const active = isActive(item, pathname);
  const color = active ? "text-brand" : dark ? "text-white hover:text-brand" : "text-ink hover:text-brand";
  // Labels never wrap; between lg and xl the spacing and size are slightly tighter so the full
  // menu (including the longer French labels) fits on one line.
  const linkCls = `nav-link inline-flex items-center gap-1 whitespace-nowrap rounded-[5px] px-2 font-heading text-[15px] font-bold leading-[60px] transition-colors duration-300 min-[1340px]:px-3 min-[1340px]:text-[16px] ${color}`;
  if (!item.children.length) {
    return (
      <li>
        <Link href={item.href} className={linkCls} target={item.newTab ? "_blank" : undefined} rel={item.newTab ? "noopener noreferrer" : undefined} aria-current={active ? "page" : undefined}>
          {item.label}
        </Link>
      </li>
    );
  }
  return (
    <li className="group relative">
      {item.href && item.href !== "#" ? (
        <Link href={item.href} className={linkCls} aria-haspopup="true" data-active={active}>
          {item.label}
          <IconChevronDown width={14} height={14} className="transition-transform duration-300 group-hover:rotate-180 group-focus-within:rotate-180" />
        </Link>
      ) : (
        <button type="button" className={linkCls} aria-haspopup="true" data-active={active}>
          {item.label}
          <IconChevronDown width={14} height={14} className="transition-transform duration-300 group-hover:rotate-180 group-focus-within:rotate-180" />
        </button>
      )}
      <ul className="invisible absolute left-0 top-full z-50 min-w-[250px] origin-top translate-y-3 scale-[0.98] rounded-lg border border-black/5 bg-white py-3 opacity-0 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)] transition-all duration-300 [transition-timing-function:var(--ease-out)] group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
        {item.children.map((c) => (
          <li key={c.id}>
            <Link
              href={c.href}
              target={c.newTab ? "_blank" : undefined}
              rel={c.newTab ? "noopener noreferrer" : undefined}
              className={`group/item relative flex items-center gap-2 px-6 py-2 font-heading text-[15px] font-semibold transition-all duration-300 hover:pl-8 hover:text-brand ${isActive(c, pathname) ? "text-brand" : "text-ink"}`}
            >
              <span aria-hidden className="absolute left-5 top-1/2 h-[2px] w-0 -translate-y-1/2 rounded bg-brand transition-all duration-300 group-hover/item:w-2" />
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

function MobileMenu(props: {
  locale: Locale;
  logoUrl: string;
  siteName: string;
  items: NavItem[];
  home: string;
  pathname: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { onClose } = props;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = [...panelRef.current.querySelectorAll<HTMLElement>("a,button")];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose]);

  // Close when navigating.
  const first = useRef(props.pathname);
  useEffect(() => {
    if (props.pathname !== first.current) onClose();
  }, [props.pathname, onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label={t("close", props.locale)} className="animate-fade absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panelRef} className="animate-drawer absolute inset-y-0 right-0 flex w-[min(360px,88vw)] flex-col overflow-y-auto bg-white px-6 pb-10 pt-6 text-ink shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href={props.home} aria-label={props.siteName}>
            <Image src={props.logoUrl} alt={props.siteName} width={140} height={39} className="h-auto w-[130px]" />
          </Link>
          <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center" aria-label={t("close", props.locale)}>
            <IconClose width={26} height={26} />
          </button>
        </div>
        <h2 id={titleId} className="sr-only">{t("menu", props.locale)}</h2>
        <nav aria-label="Mobile">
          <ul className="divide-y divide-black/5">
            {props.items.map((item, i) => (
              <MobileItem key={item.id} item={item} pathname={props.pathname} index={i} />
            ))}
          </ul>
        </nav>
        <div className="mt-8">
          <LanguageLinks locale={props.locale} />
        </div>
      </div>
    </div>
  );
}

function MobileItem({ item, pathname, index }: { item: NavItem; pathname: string; index: number }) {
  const enter = { className: "drawer-item", style: { animationDelay: `${120 + index * 55}ms` } };
  const [open, setOpen] = useState(() => isActive(item, pathname));
  const active = isActive(item, pathname);
  const cls = `block py-3 font-heading text-[16px] font-bold ${active ? "text-brand" : "text-ink"}`;
  if (!item.children.length) {
    return (
      <li {...enter}>
        <Link href={item.href} className={`${cls} transition-[color,padding] duration-300 hover:pl-1.5 hover:text-brand`} target={item.newTab ? "_blank" : undefined} rel={item.newTab ? "noopener noreferrer" : undefined}>
          {item.label}
        </Link>
      </li>
    );
  }
  return (
    <li {...enter}>
      <button type="button" className={`${cls} flex w-full items-center justify-between`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {item.label}
        <IconChevronDown className={`transition-transform duration-300 ${open ? "rotate-180 text-brand" : ""}`} />
      </button>
      {open && (
        <ul className="animate-fade pb-3 pl-4">
          {item.children.map((c) => (
            <li key={c.id}>
              <Link href={c.href} className={`block py-2 text-[15px] font-semibold ${isActive(c, pathname) ? "text-brand" : "text-body"}`} target={c.newTab ? "_blank" : undefined} rel={c.newTab ? "noopener noreferrer" : undefined}>
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
