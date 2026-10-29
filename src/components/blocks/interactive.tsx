"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { youtubeEmbedUrl } from "@/lib/blocks/schema";
import { IconChevronLeft, IconChevronRight, IconClose, IconPlay } from "@/components/site/icons";

/** Accessible modal used by the video popup and the lightbox. */
function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose]);
  return createPortal(
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className="animate-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full p-2 text-white transition-all duration-300 hover:rotate-90 hover:bg-white/10">
        <IconClose width={28} height={28} />
      </button>
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="animate-pop relative w-full max-w-5xl">{children}</div>
    </div>,
    document.body,
  );
}

/** Pulsing green play button that opens a YouTube video in a modal (as on the original hero). */
export function VideoPopupButton({ url, label, size = "lg", className }: { url: string; label: string; size?: "md" | "lg"; className?: string }) {
  const [open, setOpen] = useState(false);
  const embed = youtubeEmbedUrl(url);
  if (!embed) return null;
  const dims = size === "lg" ? "size-[90px]" : "size-[70px]";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label || "Play video"}
        className={`pulse-rings group relative inline-flex ${dims} shrink-0 items-center justify-center rounded-full bg-brand/70 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:scale-105 active:scale-95 ${className ?? ""}`}
      >
        <span className="relative flex size-[60%] items-center justify-center rounded-full bg-brand text-white shadow-[0_8px_20px_-6px_rgba(33,179,84,0.8)] transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-110">
          <IconPlay width={18} height={18} />
        </span>
      </button>
      {open && (
        <Modal label={label || "Video"} onClose={() => setOpen(false)}>
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
            <iframe src={embed} title={label || "Video"} className="absolute inset-0 size-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        </Modal>
      )}
    </>
  );
}

/** Counts up when scrolled into view. Server-rendered with the final value for no-JS and SEO. */
export function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 1600);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      setShown(0);
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return (
    <span ref={ref}>
      {/* Screen readers get the final value once, not every animation frame. */}
      <span className="sr-only">{`${value.toLocaleString("en-US")}${suffix}`}</span>
      <span aria-hidden>{shown.toLocaleString("en-US")}{suffix}</span>
    </span>
  );
}

export type TabItem = { label: string; bodyHtml: string; image: { url: string; alt: string; width: number | null; height: number | null } | null };

/** "5 reasons to attend" tabs. Keyboard: arrow keys move between tabs (WAI-ARIA tabs pattern). */
export function Tabs({ items, idBase }: { items: TabItem[]; idBase: string }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };
  return (
    <div>
      <div role="tablist" className="flex flex-wrap justify-center gap-3">
        {items.map((it, i) => (
          <button
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`${idBase}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${idBase}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={`rounded-lg border px-6 py-4 font-heading text-[16px] font-bold transition-all duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 ${
              active === i ? "border-text bg-[#2a2a2a] text-white" : "border-black/10 bg-white text-brand hover:border-brand"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          role="tabpanel"
          id={`${idBase}-panel-${i}`}
          aria-labelledby={`${idBase}-tab-${i}`}
          hidden={active !== i}
          className={`mx-auto mt-10 max-w-[800px] ${active === i ? "animate-pop" : ""}`}
        >
          {it.bodyHtml && <div className="prose-site mb-6 text-center" dangerouslySetInnerHTML={{ __html: it.bodyHtml }} />}
          {it.image && (
            <Image
              src={it.image.url}
              alt={it.image.alt}
              width={it.image.width ?? 800}
              height={it.image.height ?? 533}
              sizes="(min-width: 840px) 800px, 100vw"
              quality={90}
              className="h-auto w-full rounded-md shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export type SlideTestimonial = { id: string; quote: string; name: string; role: string; photo: string | null; logo: string | null };

/** Testimonial carousel: 3 cards on desktop, 1 on mobile, with dots. */
export function TestimonialSlider({ items, label }: { items: SlideTestimonial[]; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      setPages(Math.max(1, Math.round(el.scrollWidth / el.clientWidth)));
      setPage(Math.round(el.scrollLeft / el.clientWidth));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  const go = (p: number) => trackRef.current?.scrollTo({ left: p * (trackRef.current?.clientWidth ?? 0), behavior: "smooth" });

  // Gentle autoplay, paused while the visitor interacts with the slider.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (pages <= 1 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") go((page + 1) % pages);
    }, 6500);
    return () => window.clearInterval(id);
  }, [pages, page, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div ref={trackRef} tabIndex={0} role="region" aria-label={label} className="-mx-3 flex snap-x snap-mandatory overflow-x-auto rounded pb-8 pt-3 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-scrollbar]:hidden" aria-roledescription="carousel">
        {items.map((t) => (
          <figure key={t.id} className="w-full shrink-0 snap-start px-3 md:w-1/2 lg:w-1/3" aria-roledescription="slide">
            <div className="hover-lift group relative h-full overflow-hidden rounded-sm bg-white p-8 shadow-[0_6px_30px_rgba(0,0,0,0.06)] md:px-[53px] md:py-9">
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-brand transition-transform duration-700 [transition-timing-function:var(--ease-out)] group-hover:scale-x-100" />
              <svg aria-hidden viewBox="0 0 24 24" className="absolute right-6 top-6 size-10 text-brand/10 transition-all duration-700 group-hover:scale-110 group-hover:text-brand/20" fill="currentColor"><path d="M3 18v-5.3C3 8.2 5.3 5.6 9.4 5l.6 2.1c-2.2.6-3.3 2-3.4 4H10V18H3Zm11 0v-5.3c0-4.5 2.3-7.1 6.4-7.7l.6 2.1c-2.2.6-3.3 2-3.4 4H21V18h-7Z" /></svg>
              {t.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.logo} alt="" className="mb-4 h-10 w-auto object-contain" loading="lazy" />
              )}
              <blockquote className="text-[17px] leading-[1.35] text-body">{t.quote}</blockquote>
              <figcaption className="mt-4 flex items-center gap-4">
                {t.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.photo} alt="" className="size-[50px] rounded-full object-cover" loading="lazy" />
                )}
                <span>
                  <span className="block font-sans text-[18px] font-semibold text-ink">{t.name}</span>
                  <span className="block text-[15px] text-body">{t.role}</span>
                </span>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={page === i}
              onClick={() => go(i)}
              className={`h-2.5 rounded-full transition-all duration-500 [transition-timing-function:var(--ease-spring)] ${page === i ? "w-8 bg-brand" : "w-2.5 bg-black/20 hover:bg-black/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type LightboxImage = { url: string; alt: string; title: string; width: number | null; height: number | null };

// Tile spans that recreate the original gallery's mosaic rhythm on a 4-column grid.
const MOSAIC = [
  "md:col-span-2 md:row-span-2", "", "md:row-span-2", "", "md:col-span-2 md:row-span-3", "md:row-span-2",
  "md:col-span-2 md:row-span-2", "md:col-span-2 md:row-span-4", "", "",
];

/** Image grid (equal tiles or mosaic) with optional lightbox. */
export function GalleryGrid({
  images,
  columns,
  layout,
  lightbox,
}: {
  images: LightboxImage[];
  columns: number;
  layout: "grid" | "mosaic";
  lightbox: boolean;
}) {
  const colClass: Record<number, string> = {
    2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6",
  };
  const grid =
    layout === "mosaic"
      ? "grid grid-cols-2 gap-4 md:grid-cols-4 md:auto-rows-[150px]"
      : `grid grid-cols-2 gap-4 ${colClass[columns] ?? "md:grid-cols-4"}`;
  return (
    <Lightbox images={images}>
      {(open) => (
        <div data-reveal-stagger className={grid}>
          {images.map((img, i) => {
            const tile = (
              <span className={`group/tile zoom-frame relative block rounded-sm ${layout === "mosaic" ? "aspect-square md:aspect-auto md:h-full" : "aspect-[4/3]"}`}>
                <Image src={img.url} alt={img.alt} fill quality={90} sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
                {lightbox && (
                  <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-500 group-hover/tile:bg-black/35">
                    <span className="flex size-12 scale-50 items-center justify-center rounded-full bg-white/95 text-ink opacity-0 shadow-lg transition-all duration-500 [transition-timing-function:var(--ease-spring)] group-hover/tile:scale-100 group-hover/tile:opacity-100">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                    </span>
                  </span>
                )}
              </span>
            );
            const cls = layout === "mosaic" ? MOSAIC[i % MOSAIC.length] : "";
            return lightbox ? (
              <button key={i} type="button" onClick={() => open(i)} className={`block text-left ${cls}`} aria-label={img.title || img.alt || `Image ${i + 1}`}>
                {tile}
              </button>
            ) : (
              <div key={i} className={cls}>{tile}</div>
            );
          })}
        </div>
      )}
    </Lightbox>
  );
}

function Lightbox({ images, children }: { images: LightboxImage[]; children: (open: (i: number) => void) => ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, images.length]);
  const img = index === null ? null : images[index];
  return (
    <>
      {children(setIndex)}
      {img && (
        <Modal label={img.title || img.alt || "Image"} onClose={() => setIndex(null)}>
          <div className="relative flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={img.url} src={img.url} alt={img.alt} className="animate-pop max-h-[85vh] w-auto max-w-full rounded shadow-2xl" />
            {images.length > 1 && (
              <>
                <button type="button" aria-label="Previous" onClick={() => setIndex((index! - 1 + images.length) % images.length)} className="absolute left-0 rounded-full bg-black/40 p-2 text-white transition-all duration-300 hover:-translate-x-0.5 hover:bg-black/70">
                  <IconChevronLeft width={28} height={28} />
                </button>
                <button type="button" aria-label="Next" onClick={() => setIndex((index! + 1) % images.length)} className="absolute right-0 rounded-full bg-black/40 p-2 text-white transition-all duration-300 hover:translate-x-0.5 hover:bg-black/70">
                  <IconChevronRight width={28} height={28} />
                </button>
              </>
            )}
          </div>
          {img.title && <p className="mt-3 text-center text-white">{img.title}</p>}
        </Modal>
      )}
    </>
  );
}

/**
 * Hero photo: organic "drop" mask with the green wave from the original site, made interactive.
 * It tilts in 3D toward the pointer, the photo and wave move as parallax layers, and a soft
 * light follows the cursor. Pointer handling only writes CSS variables (no React re-renders);
 * touch devices and reduced-motion visitors get the static image.
 */
export function HeroMedia({ src, alt }: { src: string; alt: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled()) return;
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
    const y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
      el.style.setProperty("--px", `${(-x * 22).toFixed(1)}px`);
      el.style.setProperty("--py", `${(-y * 22).toFixed(1)}px`);
      el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
      el.dataset.active = "true";
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    const el = rootRef.current;
    if (!el) return;
    for (const k of ["--rx", "--ry", "--px", "--py"]) el.style.setProperty(k, k.startsWith("--r") ? "0deg" : "0px");
    el.dataset.active = "false";
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-active="false"
      className="hero-tilt group/hero relative [perspective:1400px]"
    >
      <div className="animate-float">
        <div className="hero-tilt-card relative">
          {/* Soft green shadow that shifts with the tilt. */}
          <div aria-hidden className="hero-tilt-shadow absolute inset-[6%] -z-10 rounded-[48%] bg-brand/25 blur-3xl" />
          <div className="relative aspect-[0.92] w-full overflow-hidden" style={{ borderRadius: "48% 52% 50% 50% / 30% 30% 70% 70%" }}>
            <div className="hero-tilt-photo absolute -inset-[4%]">
              <Image
                src={src}
                alt={alt}
                fill
                priority
                quality={90}
                sizes="(min-width: 1280px) 760px, (min-width: 1024px) 56vw, 100vw"
                className="object-cover"
              />
            </div>
            {/* Light that follows the cursor. */}
            <div aria-hidden className="hero-tilt-glare pointer-events-none absolute inset-0" />
            <svg viewBox="0 0 400 120" className="hero-tilt-wave animate-wave absolute inset-x-0 -bottom-1 w-full" aria-hidden preserveAspectRatio="none">
              <path d="M60 120c10-40 40-70 90-60s70 10 120-30 90-20 130 10v80Z" fill="#21b354" stroke="#6f6f6f" strokeWidth="6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export type CarouselLogo = { id: string; name: string; url: string | null; alt: string; href: string | null; svg: boolean };

/**
 * Infinite logo carousel (marquee). The track holds enough copies of the logos to always
 * fill the width, then a duplicate track is appended so a -50% translate loops seamlessly.
 * Pauses while hovered, while the row (or a logo link) has keyboard focus, and on tap/click
 * (tap again to resume), so motion can be stopped without a visible control (WCAG 2.2.2).
 * Reduced motion: static row.
 */
export function LogoCarousel({ logos, reverse = false, label, hint }: { logos: CarouselLogo[]; reverse?: boolean; label: string; hint: string }) {
  const hintId = useId();
  const [focused, setFocused] = useState(false);
  const [held, setHeld] = useState(false);
  const paused = focused || held;
  // Repeat short lists so one half of the track is always wider than the screen.
  const repeat = Math.max(1, Math.ceil(10 / logos.length));
  const set = Array.from({ length: repeat }, () => logos).flat();
  // Constant speed: about 4.5 seconds per logo.
  const duration = `${Math.max(20, set.length * 4.5)}s`;

  const item = (l: CarouselLogo, key: string, hidden: boolean) => {
    const img = l.url ? (
      <span className="logo-tile relative block h-[90px] w-[180px] md:h-[110px] md:w-[230px]">
        <Image src={l.url} alt={hidden ? "" : l.alt || l.name} fill quality={90} sizes="230px" className="object-contain" unoptimized={l.svg} />
      </span>
    ) : (
      <span className="font-semibold text-ink">{l.name}</span>
    );
    return (
      <li key={key} className="flex shrink-0 items-center justify-center px-6 md:px-10" aria-hidden={hidden || undefined}>
        {l.href ? (
          <a href={l.href} target="_blank" rel="noopener noreferrer" title={l.name} tabIndex={hidden ? -1 : undefined}>{img}</a>
        ) : (
          img
        )}
      </li>
    );
  };

  return (
    <div className="logo-carousel group/carousel relative" data-paused={paused} role="region" aria-roledescription="carousel" aria-label={label}>
      {/* Focusable so keyboard users can stop the motion by tabbing to it. */}
      <div
        tabIndex={0}
        aria-describedby={hintId}
        className="logo-carousel-viewport overflow-hidden rounded py-4 outline-none [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
        onClick={(e) => {
          // Tapping a logo link follows the link; tapping elsewhere toggles the motion.
          if (!(e.target as HTMLElement).closest("a")) setHeld((v) => !v);
        }}
      >
        <span id={hintId} className="sr-only">
          {hint}
        </span>
        <ul className="logo-carousel-track flex w-max items-center" style={{ animationDuration: duration, animationDirection: reverse ? "reverse" : "normal" }}>
          {set.map((l, i) => item(l, `a-${l.id}-${i}`, i >= logos.length))}
          {set.map((l, i) => item(l, `b-${l.id}-${i}`, true))}
        </ul>
      </div>
    </div>
  );
}
