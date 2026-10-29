"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SELECTOR = "[data-reveal]:not(.is-revealed), [data-reveal-stagger]:not(.is-revealed)";

/**
 * Adds .is-revealed to [data-reveal] / [data-reveal-stagger] elements as they scroll into
 * view. Hidden start states only apply once <html> has .reveal-ready, which is set here
 * (never for visitors who prefer reduced motion), so content stays visible without JS.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      root.classList.remove("reveal-ready");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const observeAll = () => document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    observeAll();
    root.classList.add("reveal-ready");
    // Content streamed in after navigation or opened dialogs.
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}

/** Floating back-to-top button with a ring that fills as you scroll (the original has a back-to-top button). */
export function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  const circleRef = useRef<SVGCircleElement>(null);
  const R = 22;
  const C = 2 * Math.PI * R;

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setVisible(window.scrollY > 600);
      if (circleRef.current) circleRef.current.style.strokeDashoffset = String(C * (1 - p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [C]);

  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className={`group fixed bottom-5 right-5 z-40 flex size-[52px] items-center justify-center rounded-full bg-white text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] transition-all duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1 hover:bg-brand hover:text-white md:bottom-8 md:right-8 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="26" cy="26" r={R} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" />
        <circle ref={circleRef} cx="26" cy="26" r={R} fill="none" stroke="#21b354" strokeWidth="2" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C} className="group-hover:stroke-white" />
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="relative transition-transform duration-500 group-hover:-translate-y-0.5">
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </button>
  );
}
