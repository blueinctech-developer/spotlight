import Link from "next/link";
import Image from "next/image";
import type { Block, BlockOf, LeafBlock } from "@/lib/blocks/schema";
import { isAllowedEmbed, youtubeEmbedUrl } from "@/lib/blocks/schema";
import type { BlockData } from "@/lib/content/public";
import { listPublishedPosts } from "@/lib/content/public";
import { sanitizeRichText, safeHref } from "@/lib/sanitize";
import { formatDate, localizeHref, localizePath, t, type Locale } from "@/lib/i18n";
import { factIcons, IconCalendar, IconClock, IconLocation } from "@/components/site/icons";
import { SocialLinks } from "@/components/site/social-links";
import { MediaImage } from "./media";
import { CountUp, GalleryGrid, HeroMedia, LogoCarousel, Tabs, TestimonialSlider, VideoPopupButton } from "./interactive";
import { SiteForm } from "@/components/forms/site-form";
import { PostCard, Pagination } from "@/components/site/post-card";
import { FORMS } from "@/lib/forms/definitions";

export type RenderContext = {
  locale: Locale;
  data: BlockData;
  /** Breadcrumb trail for page title banners. */
  breadcrumb?: { label: string; href?: string }[];
  /** Current listing page for postList blocks (from /page/N/). */
  listPage?: number;
  basePath?: string;
  social?: Record<string, string>;
};

function Html({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeRichText(html);
  if (!clean) return null;
  return <div className={className ?? "prose-site"} dangerouslySetInnerHTML={{ __html: clean }} />;
}

function Btn({ link, ctx, variant = "primary", className = "" }: { link: { label: string; href: string; newTab?: boolean }; ctx: RenderContext; variant?: string; className?: string }) {
  if (!link.label) return null;
  const href = localizeHref(safeHref(link.href), ctx.locale);
  return (
    <Link href={href} className={`btn btn-${variant} ${className}`} target={link.newTab ? "_blank" : undefined} rel={link.newTab ? "noopener noreferrer" : undefined}>
      {link.label}
    </Link>
  );
}

const section = (anchor: string) => (anchor ? { id: anchor } : {});

// ───────────────────────── Blocks ─────────────────────────

function Hero({ b, ctx }: { b: BlockOf<"hero">; ctx: RenderContext }) {
  const img = b.image ? ctx.data.media[b.image] : null;
  return (
    <section {...section(b.anchor)} className="relative overflow-hidden">
      {/* Soft brand glow behind the photo. */}
      <div aria-hidden className="pointer-events-none absolute -right-40 top-10 hidden size-[680px] rounded-full bg-[radial-gradient(circle,rgba(33,179,84,0.12),transparent_65%)] lg:block" />
      <div className="site-container relative grid items-center gap-10 pb-16 pt-10 lg:min-h-[800px] lg:grid-cols-[1fr_1.08fr] lg:pb-20">
        <div className="relative z-10">
          {b.eyebrow && <p className="hero-line font-heading text-[16px] font-bold text-text">{b.eyebrow}</p>}
          <h1 className="hero-line font-heading text-[44px] font-bold leading-[1.1] text-ink md:text-[56px] md:leading-[74.5px]">{b.title}</h1>
          {b.subtitle && <p className="hero-line mt-2 font-heading text-[24px] font-semibold leading-snug text-ink md:mt-4 md:text-[35px]">{b.subtitle}</p>}
          {b.facts.length > 0 && (
            <ul className="hero-line mt-8 space-y-5">
              {b.facts.map((f, i) => {
                const Icon = factIcons[f.icon];
                return (
                  <li key={i} className={`group/fact flex items-start gap-3 text-[16px] ${f.highlight ? "font-bold uppercase text-brand" : "text-text"}`}>
                    <Icon className={`mt-0.5 shrink-0 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover/fact:-translate-y-0.5 group-hover/fact:scale-110 ${f.highlight ? "text-brand" : "text-text group-hover/fact:text-brand"}`} width={22} height={22} />
                    <span>{f.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="hero-line mt-10 flex flex-wrap items-center gap-x-10 gap-y-6">
            <Btn link={b.primary} ctx={ctx} className="min-w-[158px] py-[18px]" />
            {b.videoUrl && (
              <span className="group/video flex items-center gap-3">
                <VideoPopupButton url={b.videoUrl} label={b.videoLabel || t("watchVideo", ctx.locale)} />
                {b.videoLabel && <span className="text-[16px] text-brand transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover/video:translate-x-1">{b.videoLabel}</span>}
              </span>
            )}
          </div>
        </div>
        {img && (
          /* Slightly larger than the original, and interactive (3D tilt, parallax, light). */
          <div className="hero-media relative order-first mx-auto w-full max-w-[660px] lg:order-none lg:-mr-[24px] lg:max-w-none xl:-mr-[56px]">
            <HeroMedia src={img.url} alt={img.alt} />
          </div>
        )}
      </div>
    </section>
  );
}

const tones = {
  grey: "bg-mist",
  white: "bg-white",
  green: "bg-brand text-white",
  navy: "bg-night text-white",
} as const;

function IntroBand({ b }: { b: BlockOf<"introBand"> }) {
  return (
    <section {...section(b.anchor)} className={`${tones[b.tone]} py-16 md:py-[90px]`}>
      <div className="site-container text-center">
        <h2 data-reveal="up" className="mx-auto max-w-[620px] font-heading text-[34px] font-semibold leading-[1.12] text-brand md:text-[52px]">{b.title}</h2>
        <div data-reveal="up" data-reveal-delay="200">
          <Html html={b.body} className="prose-site mx-auto mt-5 max-w-[620px] text-[17px] font-light leading-[1.45]" />
        </div>
      </div>
    </section>
  );
}

function Glance({ b, ctx }: { b: BlockOf<"glance">; ctx: RenderContext }) {
  const imgs = b.images.map((id) => (id ? ctx.data.media[id] : null));
  const title = b.titleAccent && b.title.endsWith(b.titleAccent) ? b.title.slice(0, -b.titleAccent.length) : b.title;
  return (
    <section {...section(b.anchor)} className="py-16 md:py-24">
      <div className="site-container">
        <h2 data-reveal="left" className="font-heading text-[32px] font-semibold leading-tight text-ink md:text-[44px]">
          {title}
          {b.titleAccent && title !== b.title && <span className="text-black">{b.titleAccent}</span>}
        </h2>
        <div className="mt-12 grid items-start gap-12 lg:grid-cols-2">
          {/* Collage as on the original: a tall photo top-right, a second photo overlapping it
              bottom-left, and the play button sitting on the plus pattern above that photo. */}
          <div className="relative mx-auto aspect-[56/58] w-full max-w-[560px] lg:mx-0">
            {imgs[1] && (
              <div data-reveal="scale" data-reveal-delay="200" className="absolute right-0 top-0 w-[65%]">
                <div className="zoom-frame relative aspect-[3/4] rounded-md">
                  <MediaImage media={imgs[1]} fill sizes="(min-width: 1024px) 365px, 65vw" />
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 z-10 w-1/2">
              <Image
                src="/brand/plus-pattern.svg"
                alt=""
                width={110}
                height={110}
                className="animate-drift pointer-events-none absolute bottom-full left-[28%] mb-1 h-auto w-[34%] min-w-16 max-w-[110px]"
                aria-hidden
              />
              {imgs[0] && (
                <div data-reveal="scale" data-reveal-delay="100">
                  <div className="zoom-frame relative aspect-[4/5] rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                    <MediaImage media={imgs[0]} fill sizes="(min-width: 1024px) 280px, 50vw" />
                  </div>
                </div>
              )}
              {b.videoUrl && (
                <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                  <div data-reveal="zoom" data-reveal-delay="300">
                    <VideoPopupButton url={b.videoUrl} label={t("watchVideo", ctx.locale)} size="md" />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* A third image (optional) shows below the collage. */}
          {imgs[2] && (
            <div className="zoom-frame relative mx-auto aspect-[16/9] w-full max-w-[560px] rounded-md lg:col-start-1 lg:mx-0">
              <MediaImage media={imgs[2]} fill sizes="(min-width: 1024px) 560px, 100vw" />
            </div>
          )}
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <span data-reveal="scale" className="mx-auto block h-1 w-5 bg-brand" aria-hidden />
            <div data-reveal="up" data-reveal-delay="100">
              <Html html={b.body} className="prose-site mt-10 text-center text-[17px] font-light leading-[1.45]" />
            </div>
            {b.stats.length > 0 && (
              <div data-reveal="up" data-reveal-delay="200">
                <StatsStrip items={b.stats} className="mt-16" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsStrip({ items, className = "" }: { items: { value: number; suffix: string; label: string }[]; className?: string }) {
  return (
    <div className={`ticket-notch relative overflow-hidden rounded-[5px] bg-brand px-4 py-10 text-white shadow-[0_6px_0_#ffd1e3] ${className}`}>
      {/* Slow light sheen across the strip. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.14)_50%,transparent_65%)] bg-[length:250%_100%] [animation:shimmer_6s_linear_infinite]" />
      <dl data-reveal-stagger className="relative grid grid-cols-1 gap-y-8 sm:grid-cols-3 lg:flex lg:divide-x lg:divide-white/30">
        {items.map((s, i) => (
          <div key={i} className="group/stat flex flex-1 flex-col items-center px-2 text-center">
            <dt className="order-2 mt-2 text-[17px] font-bold leading-tight">{s.label}</dt>
            <dd className="order-1 font-sans text-[35px] font-bold leading-none transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover/stat:-translate-y-1 group-hover/stat:scale-105">
              <CountUp value={s.value} suffix={s.suffix} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Stats({ b }: { b: BlockOf<"stats"> }) {
  return (
    <section {...section(b.anchor)} className="py-12">
      <div className="site-container"><StatsStrip items={b.items} /></div>
    </section>
  );
}

function SplitCta({ b, ctx }: { b: BlockOf<"splitCta">; ctx: RenderContext }) {
  const img = b.image ? ctx.data.media[b.image] : null;
  return (
    <section {...section(b.anchor)} className="group grid lg:grid-cols-2">
      <div data-reveal="wipe" className={`relative min-h-[320px] overflow-hidden ${b.imageSide === "right" ? "lg:order-2" : ""}`}>
        {img && (
          <div className="absolute inset-0">
            <div className="parallax-media absolute inset-0">
              <MediaImage media={img} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover grayscale transition-[filter] duration-[1.2s] group-hover:grayscale-[0.4]" />
            </div>
          </div>
        )}
      </div>
      <div className="relative overflow-hidden bg-night px-6 py-16 text-white md:px-14 lg:py-[150px]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(33,179,84,0.18),transparent_65%)]" />
        <div className="relative max-w-[450px]">
          {b.eyebrow && <p data-reveal="right" className="text-[18px] uppercase">{b.eyebrow}</p>}
          <h2 data-reveal="right" data-reveal-delay="100" className="mt-6 font-heading text-[34px] font-semibold leading-[1.3] text-white md:text-[44px]">{b.title}</h2>
          <div data-reveal="right" data-reveal-delay="200">
            <Html html={b.body} className="prose-site prose-invert mt-8 text-[17px] leading-snug" />
          </div>
          <div data-reveal="up" data-reveal-delay="300" className="mt-11"><Btn link={b.button} ctx={ctx} className="min-w-[188px] py-[18px]" /></div>
        </div>
      </div>
    </section>
  );
}

function Partners({ b, ctx }: { b: BlockOf<"partners">; ctx: RenderContext }) {
  return (
    <section {...section(b.anchor)} className="py-16 md:py-24">
      <div className="site-container">
        {(b.title || b.subtitle) && (
          <div className="text-center">
            {b.title && <h2 data-reveal="up" className="font-heading text-[34px] font-semibold text-ink md:text-[44px]">{b.title}</h2>}
            {b.subtitle && <p data-reveal="up" data-reveal-delay="100" className="mt-1 text-[17px] text-body">{b.subtitle}</p>}
          </div>
        )}
        {b.groups.map((g, gi) => {
          const logos = g.partnerIds.map((id) => ctx.data.partners[id]).filter(Boolean);
          if (!logos.length) return null;
          return (
            <div key={gi} className="mt-14">
              {g.heading && (
                <>
                  <h3 data-reveal="up" className="text-center font-sans text-[24px] font-bold uppercase tracking-[0.02em] text-brand">{g.heading}</h3>
                  <hr data-reveal="fade" className="mt-5 border-black/10" />
                </>
              )}
              <div data-reveal="up" className="mt-8">
                <LogoCarousel
                  label={g.heading || b.title || "Partners"}
                  hint={
                    ctx.locale === "fr"
                      ? "Logos défilants : ils s’arrêtent au survol ou au focus ; touchez pour arrêter ou relancer."
                      : "Scrolling logos: they pause on hover or focus; tap to pause or resume."
                  }
                  reverse={gi % 2 === 1}
                  logos={logos.map((p) => ({
                    id: p.id,
                    name: p.name,
                    url: p.logo?.url ?? null,
                    alt: p.logo?.alt || p.name,
                    href: p.websiteUrl,
                    svg: p.logo?.mimeType === "image/svg+xml",
                  }))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Highlights({ b, ctx }: { b: BlockOf<"highlights">; ctx: RenderContext }) {
  const items = b.items.map((it) => ({ ...it, m: it.image ? ctx.data.media[it.image] : null })).filter((i) => i.m);
  return (
    <section {...section(b.anchor)} className="py-16">
      <div className="site-container">
        {b.title && <h2 className="mb-10 text-center font-heading text-[34px] font-semibold md:text-[44px]">{b.title}</h2>}
        <ul data-reveal-stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <li key={i}>
              <div className="group zoom-frame relative aspect-[4/3] rounded-md shadow-[0_10px_30px_-18px_rgba(0,0,0,0.4)]">
                <MediaImage media={it.m} fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white transition-transform duration-500 [transition-timing-function:var(--ease-out)] group-hover:-translate-y-1.5">
                  <span aria-hidden className="mb-3 block h-[3px] w-6 rounded bg-brand transition-all duration-500 group-hover:w-12" />
                  <h3 className="font-sans text-[16px] font-bold uppercase tracking-[0.03em] text-white">{it.title}</h3>
                  {it.caption && <p className="text-sm text-white/85">{it.caption}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Testimonials({ b, ctx }: { b: BlockOf<"testimonials">; ctx: RenderContext }) {
  const order = b.testimonialIds;
  const items = order.length
    ? order.map((id) => ctx.data.testimonials.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x)
    : ctx.data.testimonials;
  if (!items.length) return null;
  return (
    <section {...section(b.anchor)} className="py-16 md:py-24">
      <div className="site-container">
        {b.title && <h2 data-reveal="up" className="mb-12 text-center font-heading text-[34px] font-semibold text-ink md:text-[44px]">{b.title}</h2>}
        <div data-reveal="up" data-reveal-delay="100">
        <TestimonialSlider
          label={b.title || (ctx.locale === "fr" ? "Témoignages" : "Testimonials")}
          items={items.map((x) => ({ id: x.id, quote: x.quote, name: x.name, role: x.role, photo: x.photo?.url ?? null, logo: x.logo?.url ?? null }))}
        />
        </div>
      </div>
    </section>
  );
}

function Breadcrumb({ ctx, light }: { ctx: RenderContext; light?: boolean }) {
  if (!ctx.breadcrumb?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="mt-5 text-[13px]">
      <ol className="flex flex-wrap justify-center gap-x-2">
        {ctx.breadcrumb.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className={light ? "text-white/50" : "text-body"}>/</span>}
            {c.href ? (
              <Link href={c.href} className={light ? "text-white/60 hover:text-white" : "text-ink hover:text-brand"}>{c.label}</Link>
            ) : (
              <span aria-current="page" className={light ? "text-white" : "text-brand"}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function PageTitle({ b, ctx }: { b: BlockOf<"pageTitle">; ctx: RenderContext }) {
  const bg = b.background ? ctx.data.media[b.background] : null;
  if (b.variant === "plain") {
    return (
      <section {...section(b.anchor)} className="pb-16 pt-6 md:pb-24">
        <div className="site-container text-center">
          <h1 className="hero-line mx-auto max-w-[620px] font-heading text-[36px] font-bold leading-[1.3] text-ink md:text-[56px] md:leading-[74.5px]">{b.title}</h1>
          {b.subtitle && <p className="hero-line mt-3 text-[18px] text-body">{b.subtitle}</p>}
          {b.showBreadcrumb && <div className="hero-line"><Breadcrumb ctx={ctx} /></div>}
        </div>
      </section>
    );
  }
  const isImage = b.variant === "image";
  return (
    <section {...section(b.anchor)} className={`relative overflow-hidden ${isImage ? "bg-black" : "bg-dark-texture"} text-white`}>
      <div className="parallax-media absolute inset-0">
        {bg ? (
          <MediaImage media={bg} fill priority sizes="100vw" className={`object-cover ${isImage ? "opacity-45" : "opacity-30"}`} />
        ) : !isImage ? (
          <Image src="/brand/hero-title-bar.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
        ) : null}
      </div>
      <div className={`site-container relative text-center ${isImage ? "py-20 md:py-28" : "py-16 md:py-24"}`}>
        <h1 className={`hero-line mx-auto font-heading font-bold leading-tight text-white ${isImage ? "max-w-[900px] text-[34px] uppercase md:text-[56px]" : "max-w-[640px] text-[30px] md:text-[44px]"}`}>
          {b.title}
        </h1>
        {b.subtitle &&
          (isImage ? (
            <p className="hero-line mt-4 font-heading text-[22px] font-medium uppercase text-white md:text-[35px]">{b.subtitle}</p>
          ) : (
            <p className="hero-line mx-auto mt-5 max-w-[640px] text-[15px] font-medium leading-relaxed text-white/60">{b.subtitle}</p>
          ))}
        {b.showBreadcrumb && <div className="hero-line"><Breadcrumb ctx={ctx} light /></div>}
      </div>
    </section>
  );
}

function RichText({ b }: { b: BlockOf<"richText"> }) {
  const w = { narrow: "max-w-[720px]", normal: "max-w-[1000px]", wide: "max-w-none" }[b.width];
  return (
    <section {...section(b.anchor)} className="py-8">
      <div data-reveal="up" className="site-container">
        <Html html={b.html} className={`prose-site mx-auto ${w} ${b.align === "center" ? "text-center" : ""}`} />
      </div>
    </section>
  );
}

function Heading({ b }: { b: BlockOf<"heading"> }) {
  const Tag = b.level;
  const size = { h1: "text-[36px] md:text-[56px]", h2: "text-[30px] md:text-[44px]", h3: "text-[26px] md:text-[35px]", h4: "text-[22px] md:text-[24px]", h5: "text-[20px]", h6: "text-[16px]" }[b.level];
  const tone = { dark: "text-ink", brand: "text-brand", muted: "text-body" }[b.tone];
  const align = { left: "text-left", center: "text-center", right: "text-right" }[b.align];
  return (
    <section {...section(b.anchor)} className="pt-10">
      <div data-reveal="up" className={`site-container ${align}`}>
        <Tag className={`font-heading font-semibold leading-tight ${size} ${tone}`}>{b.text}</Tag>
        {b.subtitle && <p className="mx-auto mt-3 max-w-[640px] text-[16px] text-body">{b.subtitle}</p>}
      </div>
    </section>
  );
}

function ImageBlock({ b, ctx }: { b: BlockOf<"image">; ctx: RenderContext }) {
  const img = b.image ? ctx.data.media[b.image] : null;
  if (!img) return null;
  const w = { avatar: "max-w-[96px]", small: "max-w-[320px]", medium: "max-w-[800px]", full: "max-w-none" }[b.size];
  const inner =
    b.size === "avatar" ? (
      <span className="relative block size-[96px] overflow-hidden rounded-full ring-4 ring-brand/0 transition-[box-shadow] duration-500 hover:ring-brand/30"><MediaImage media={img} fill sizes="96px" className="object-cover" /></span>
    ) : (
      <span className="zoom-frame block rounded-md"><MediaImage media={img} sizes="(min-width: 1024px) 800px, 100vw" className="h-auto w-full" /></span>
    );
  return (
    <figure {...section(b.anchor)} className="py-6">
      <div className={`site-container`}>
        <div data-reveal="scale" className={`${w} ${b.align === "center" ? "mx-auto" : ""}`}>
          {b.link ? <Link href={localizeHref(safeHref(b.link), ctx.locale)}>{inner}</Link> : inner}
          {b.caption && <figcaption className={`mt-2 text-sm text-body ${b.size === "avatar" ? "" : "text-center"}`}>{b.caption}</figcaption>}
        </div>
      </div>
    </figure>
  );
}

function Gallery({ b, ctx }: { b: BlockOf<"gallery">; ctx: RenderContext }) {
  const images = b.images
    .map((g) => ({ g, m: g.image ? ctx.data.media[g.image] : null }))
    .filter((x) => x.m)
    .map(({ g, m }) => ({ url: m!.url, alt: m!.alt, title: g.title, width: m!.width, height: m!.height }));
  if (!images.length) return null;
  return (
    <section {...section(b.anchor)} className="py-10">
      <div className="site-container">
        <GalleryGrid images={images} columns={b.columns} layout={b.layout} lightbox={b.lightbox} />
      </div>
    </section>
  );
}

function Buttons({ b, ctx }: { b: BlockOf<"buttons">; ctx: RenderContext }) {
  const align = { left: "justify-start", center: "justify-center", right: "justify-end" }[b.align];
  return (
    <div {...section(b.anchor)} data-reveal="up" className={`site-container flex flex-wrap gap-4 py-6 ${align}`}>
      {b.items.map((it, i) => <Btn key={i} link={it} ctx={ctx} variant={it.variant} />)}
    </div>
  );
}

function Video({ b }: { b: BlockOf<"video"> }) {
  const src = youtubeEmbedUrl(b.url)?.replace("autoplay=1&", "");
  if (!src) return null;
  return (
    <section {...section(b.anchor)} className="py-8">
      <div className="site-container">
        <div data-reveal="scale" className="relative mx-auto aspect-video max-w-[960px] overflow-hidden rounded-md bg-black shadow-[0_30px_60px_-30px_rgba(0,0,0,0.5)]">
          <iframe src={src} title={b.title || "Video"} loading="lazy" className="absolute inset-0 size-full" allow="encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      </div>
    </section>
  );
}

function InfoCards({ b }: { b: BlockOf<"infoCards"> }) {
  return (
    <section {...section(b.anchor)} className="py-10">
      <div data-reveal-stagger className="site-container grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {b.items.map((it, i) => {
          const Icon = factIcons[it.icon];
          const body = <p className="mt-2 text-[16px] text-body">{it.text}</p>;
          return (
            <div key={i} className="group text-center">
              <span className="relative mx-auto flex size-[74px] items-center justify-center rounded-full border border-black/10 text-brand transition-all duration-500 [transition-timing-function:var(--ease-spring)] group-hover:-translate-y-1 group-hover:border-brand group-hover:bg-brand group-hover:text-white group-hover:shadow-[0_14px_30px_-12px_rgba(33,179,84,0.7)]">
                <Icon width={26} height={26} className="transition-transform duration-500 group-hover:scale-110" />
              </span>
              <h2 className="mt-5 font-sans text-[22.5px] font-bold text-brand">{it.title}</h2>
              {it.href ? <a href={safeHref(it.href)} className="hover:text-brand">{body}</a> : body}
            </div>
          );
        })}
      </div>
      <div className="site-container mt-16"><hr data-reveal="fade" className="mx-auto max-w-[1100px] border-black/10" /></div>
    </section>
  );
}

function FeatureSplit({ b, ctx }: { b: BlockOf<"featureSplit">; ctx: RenderContext }) {
  const imgs = b.images.map((id) => (id ? ctx.data.media[id] : null));
  return (
    <section {...section(b.anchor)} className="py-12 md:py-20">
      <div className="site-container grid items-center gap-12 lg:grid-cols-2">
        <div data-reveal="left" className={b.imageSide === "left" ? "lg:order-2" : ""}>
          <h2 className="font-heading text-[30px] font-semibold leading-tight text-ink md:text-[44px]">{b.title}</h2>
          <Html html={b.body} className="prose-site mt-6 text-[17px]" />
          {b.facts.length > 0 && (
            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              {b.facts.map((f, i) => (
                <div key={i}>
                  <dt className="font-sans text-[20px] font-bold text-brand">{f.label}</dt>
                  <dd className="mt-1 text-[16px] text-text">{f.text}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-8"><Btn link={b.button} ctx={ctx} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {imgs[0] && (
            <div data-reveal="scale" data-reveal-delay="100">
              <div className="zoom-frame relative aspect-[2/3] rounded-md">
                <MediaImage media={imgs[0]} fill sizes="(min-width: 1024px) 320px, 50vw" />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4 pt-8">
            {imgs.slice(1).map((m, i) =>
              m ? (
                <div key={i} data-reveal="scale" data-reveal-delay={i ? "400" : "200"}>
                  <div className="zoom-frame relative aspect-[2/3] rounded-md">
                    <MediaImage media={m} fill sizes="(min-width: 1024px) 320px, 50vw" />
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TabsBlock({ b, ctx }: { b: BlockOf<"tabs">; ctx: RenderContext }) {
  return (
    <section {...section(b.anchor)} className="bg-snow py-16 md:py-24">
      <div className="site-container">
        <h2 data-reveal="down" className="text-center font-heading text-[30px] font-semibold uppercase text-ink md:text-[44px]">{b.title}</h2>
        <div data-reveal="up" data-reveal-delay="100">
          <Html html={b.intro} className="prose-site mx-auto mt-3 max-w-[800px] text-center text-[15px]" />
        </div>
        <div data-reveal="up" data-reveal-delay="200" className="mt-8">
          <Tabs
            idBase={b.id}
            items={b.items.map((it) => {
              const m = it.image ? ctx.data.media[it.image] : null;
              return { label: it.label, bodyHtml: sanitizeRichText(it.body), image: m ? { url: m.url, alt: m.alt, width: m.width, height: m.height } : null };
            })}
          />
        </div>
      </div>
    </section>
  );
}

function Pricing({ b, ctx }: { b: BlockOf<"pricing">; ctx: RenderContext }) {
  return (
    <section {...section(b.anchor)} className="relative">
      <div className="bg-dark-texture absolute inset-x-0 top-0 h-[180px] md:h-[200px]" aria-hidden />
      <div className="site-container relative pt-6">
        <div className="grid gap-4 md:mx-auto md:max-w-[880px] md:grid-cols-2">
          {b.items.map((it, i) => {
            const accent = it.highlight ? "text-brand" : "text-indigo";
            return (
              <div key={i} data-reveal="up" data-reveal-delay={i ? "300" : "100"}>
              <div className={`hover-lift ticket-notch h-full rounded-[3px] border-t-[6px] bg-white px-8 pb-10 pt-12 shadow-[0_10px_40px_rgba(0,0,0,0.12)] md:px-12 ${it.highlight ? "border-brand" : "border-[#4c6fff]"}`} style={{ ["--notch-color" as string]: "#1f0d6b" }}>
                <h2 className={`font-sans text-[26px] font-bold leading-tight md:text-[28px] ${accent}`}>{it.title}</h2>
                {it.price && <p className="mt-2 text-2xl font-bold text-ink">{it.price}</p>}
                <ul className="mt-6 space-y-4">
                  {it.features.map((f, j) => (
                    <li key={j} className="group/feat flex items-start gap-3 text-[16px] font-medium text-text">
                      <span aria-hidden className={`mt-0.5 transition-transform duration-300 group-hover/feat:scale-125 ${accent}`}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <hr className="my-8 border-dashed border-black/30" />
                <Btn link={it.button} ctx={ctx} variant="primary" className={`w-full ${it.highlight ? "" : "!bg-indigo hover:!bg-[#424242]"}`} />
              </div>
              </div>
            );
          })}
        </div>
        {(b.helpTitle || b.helpContacts.length > 0) && (
          <div data-reveal="up" className="mx-auto max-w-[600px] py-10 text-center">
            {b.helpTitle && <h2 className="font-sans text-[26px] font-bold text-ink">{b.helpTitle}</h2>}
            <Html html={b.helpText} className="prose-site mt-3 text-[15px]" />
            <ul className="mt-6 inline-flex flex-col gap-3 text-left">
              {b.helpContacts.map((c, i) => {
                const Icon = factIcons[c.icon];
                const content = (
                  <span className="group/c flex items-center gap-4 font-sans text-[17px] font-bold text-brand">
                    <Icon className="text-text transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover/c:scale-110 group-hover/c:text-brand" /> <span className="link-underline">{c.text}</span>
                  </span>
                );
                return <li key={i}>{c.href ? <a href={safeHref(c.href)}>{content}</a> : content}</li>;
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Organizer({ b, ctx }: { b: BlockOf<"organizer">; ctx: RenderContext }) {
  const logo = b.logo ? ctx.data.media[b.logo] : null;
  return (
    <section {...section(b.anchor)} className="py-16 md:py-20">
      <div className="site-container">
        <h2 data-reveal="down" className="text-center font-heading text-[30px] font-semibold uppercase text-brand md:text-[44px]">{b.title}</h2>
        {logo && (
          <div data-reveal="zoom" data-reveal-delay="100" className="mx-auto mt-6 w-[240px]">
            <MediaImage media={logo} sizes="240px" className="h-auto w-full transition-transform duration-700 [transition-timing-function:var(--ease-spring)] hover:scale-105" />
          </div>
        )}
        <div data-reveal="up" data-reveal-delay="200">
          <Html html={b.body} className="prose-site mt-8 text-[16px]" />
        </div>
      </div>
    </section>
  );
}

function Speakers({ b, ctx }: { b: BlockOf<"speakers">; ctx: RenderContext }) {
  const list = b.speakerIds.length ? b.speakerIds.map((id) => ctx.data.speakersById[id]).filter(Boolean) : ctx.data.speakers;
  if (!list.length) return null;
  return (
    <section {...section(b.anchor)} className="py-16">
      <div className="site-container">
        {b.title && <h2 data-reveal="up" className="text-center font-heading text-[34px] font-semibold md:text-[44px]">{b.title}</h2>}
        {b.subtitle && <p data-reveal="up" data-reveal-delay="100" className="mt-2 text-center">{b.subtitle}</p>}
        <SpeakerGrid speakers={list} locale={ctx.locale} columns={b.columns} />
      </div>
    </section>
  );
}

export function SpeakerGrid({ speakers, locale, columns = 3 }: { speakers: BlockData["speakers"]; locale: Locale; columns?: number }) {
  const cols = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" }[columns] ?? "lg:grid-cols-3";
  return (
    <ul data-reveal-stagger className={`mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 ${cols}`}>
      {speakers.map((s) => (
        <li key={s.id}>
          <Link href={localizePath(`speakers/${s.slug}`, locale)} className="group block">
            <span className="zoom-frame relative block aspect-square rounded-[5px] bg-mist shadow-[0_10px_30px_-20px_rgba(0,0,0,0.4)] transition-shadow duration-500 group-hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]">
              <span aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-1 origin-left scale-x-0 bg-brand transition-transform duration-500 [transition-timing-function:var(--ease-out)] group-hover:scale-x-100" />
              {s.photo ? (
                // The name is written right below, so the portrait is decorative here.
                <MediaImage media={s.photo} alt="" fill sizes="(min-width: 1024px) 400px, 50vw" className="object-cover" />
              ) : (
                <span aria-hidden className="absolute inset-0 flex items-center justify-center font-heading text-5xl font-bold text-black/15">
                  {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
              )}
            </span>
            <span className="mt-5 block text-[13px] font-semibold text-brand">{[s.jobTitle, s.organization].filter(Boolean).join(", ")}</span>
            <span className="mt-1 block font-heading text-[20px] font-semibold text-ink transition-colors duration-300 group-hover:text-brand">{s.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Schedule({ b, ctx }: { b: BlockOf<"schedule">; ctx: RenderContext }) {
  const ev = b.eventId ? ctx.data.events[b.eventId] : null;
  if (!ev || !ev.sessions.length) {
    if (!b.emptyTitle) return null;
    return (
      <section {...section(b.anchor)} className="bg-snow py-24 text-center">
        <h2 data-reveal="up" className="font-heading text-[30px] font-bold uppercase md:text-[44px]">{b.emptyTitle}</h2>
        {b.emptySubtitle && <p data-reveal="up" data-reveal-delay="100" className="mt-3 font-heading text-[22px] uppercase text-body">{b.emptySubtitle}</p>}
      </section>
    );
  }
  const days = [...new Set(ev.sessions.map((s) => s.day))];
  return (
    <section {...section(b.anchor)} className="py-16 md:py-20">
      <div className="site-container max-w-[1000px]">
        {b.title && <h2 data-reveal="up" className="mb-10 text-center font-heading text-[34px] font-semibold md:text-[44px]">{b.title}</h2>}
        {days.map((day) => (
          <div key={day} className="mb-12">
            <div data-reveal="left" className="mb-6 flex flex-wrap items-center gap-4 rounded-[5px] bg-[#555] px-5 py-4 text-white">
              <IconCalendar />
              <span className="font-heading text-[20px] font-bold">{day}{ctx.locale === "fr" ? "er" : "st"} {t("day", ctx.locale)}</span>
              {ev.startsAt && <span className="text-white/80">{formatDate(new Date(ev.startsAt.getTime() + (day - 1) * 86400_000), ctx.locale)}</span>}
              {ev.venueName && <span className="text-white/80">· {ev.venueName}</span>}
            </div>
            <ol data-reveal-stagger className="space-y-5">
              {ev.sessions.filter((s) => s.day === day).map((s) => {
                const isBreak = s.kind === "break" || s.kind === "networking";
                return (
                  <li key={s.id}>
                  <div className={`hover-lift overflow-hidden rounded-[10px] ${isBreak ? "bg-brand text-center text-white" : "grid bg-snow md:grid-cols-[1fr_1fr]"}`}>
                    {isBreak ? (
                      <p className="px-6 py-5 font-heading text-[18px] font-bold">
                        {s.title}
                        {(s.startTime || s.endTime) && <span className="font-medium"> ({[s.startTime, s.endTime].filter(Boolean).join(" - ")})</span>}
                      </p>
                    ) : (
                      <>
                        <div className="bg-brand p-6 text-white md:p-8">
                          {(s.startTime || s.endTime) && (
                            <p className="flex items-center gap-2 text-[15px]"><IconClock width={16} height={16} /> {[s.startTime, s.endTime].filter(Boolean).join(" - ")}</p>
                          )}
                          <h3 className="mt-2 font-heading text-[22px] font-bold leading-snug text-white">{s.title}</h3>
                          {s.theme && <p className="mt-3 text-[15px] font-semibold">{s.theme}</p>}
                          {s.location && <p className="mt-3 flex items-center gap-2 text-sm"><IconLocation width={16} height={16} /> {s.location}</p>}
                        </div>
                        <div className="p-6 md:p-8">
                          {s.speakers.length > 0 && (
                            <ul className="grid gap-5 sm:grid-cols-2">
                              {s.speakers.map(({ speaker, role }) => (
                                <li key={speaker.id} className="text-center">
                                  <Link href={localizePath(`speakers/${speaker.slug}`, ctx.locale)} className="group block">
                                    <span className="relative mx-auto block size-[64px] overflow-hidden rounded-full bg-mist ring-2 ring-transparent transition-all duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-110 group-hover:ring-brand">
                                      {speaker.photo && <MediaImage media={speaker.photo} fill sizes="64px" className="object-cover" />}
                                    </span>
                                    <span className="mt-2 block text-[14px] font-semibold text-ink group-hover:text-brand">{speaker.name}</span>
                                    <span className="block text-[13px] text-body">
                                      {role === "MODERATOR" ? `${t("moderator", ctx.locale)} · ` : ""}{[speaker.jobTitle, speaker.organization].filter(Boolean).join(", ")}
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                          {s.description && <Html html={s.description} className={`prose-site text-[14px] ${s.speakers.length ? "mt-6" : ""}`} />}
                        </div>
                      </>
                    )}
                  </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

async function PostList({ b, ctx }: { b: BlockOf<"postList">; ctx: RenderContext }) {
  const page = ctx.listPage ?? 1;
  const result = await listPublishedPosts({ locale: ctx.locale, categorySlug: b.categorySlug || undefined, page, perPage: b.perPage });
  const base = ctx.basePath ?? "/";
  return (
    <section {...section(b.anchor)} className="pb-16">
      <div className="site-container">
        {b.title && <h2 data-reveal="up" className="mb-10 text-center font-heading text-[34px] font-semibold md:text-[44px]">{b.title}</h2>}
        {result.posts.length ? (
          <ul data-reveal-stagger className="columns-1 gap-5 md:columns-2 lg:columns-3">
            {result.posts.map((p) => (
              <li key={p.id} className="mb-5 break-inside-avoid"><PostCard post={p} locale={ctx.locale} heading={b.title ? "h3" : "h2"} /></li>
            ))}
          </ul>
        ) : (
          <p className="text-center">{t("noPosts", ctx.locale)}</p>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => (p === 1 ? base : `${base}page/${p}/`)} />
      </div>
    </section>
  );
}

function FormBlock({ b, ctx }: { b: BlockOf<"form">; ctx: RenderContext }) {
  const card = b.form === "sponsorship";
  return (
    <section {...section(b.anchor)} className={card ? "relative pb-10" : "py-10"}>
      {card && <div className="bg-dark-texture absolute inset-x-0 top-0 h-[120px]" aria-hidden />}
      <div className="site-container relative">
        <div data-reveal="up" className={`mx-auto ${card ? "max-w-[520px] rounded-[3px] bg-white px-8 py-8 shadow-[0_10px_40px_rgba(0,0,0,0.1)] md:px-[35px]" : "max-w-[700px]"}`}>
          {b.title && <h2 className={`text-center font-heading font-semibold text-ink ${card ? "text-[24px]" : "text-[34px] md:text-[44px]"}`}>{b.title}</h2>}
          <Html html={b.intro} className="prose-site mx-auto mb-6 mt-3 max-w-[520px] text-center text-[15px]" />
          {b.closed ? (
            <p className="rounded-md bg-mist p-6 text-center font-semibold text-ink">{b.closedMessage || t("formClosed", ctx.locale)}</p>
          ) : (
            <SiteForm formKey={b.form} locale={ctx.locale} downloadId={b.form === "report-download" ? b.download : null} />
          )}
        </div>
      </div>
    </section>
  );
}

function Embed({ b }: { b: BlockOf<"embed"> }) {
  if (!isAllowedEmbed(b.url)) return null;
  return (
    <section {...section(b.anchor)} className="py-10">
      <div className="site-container">
        <iframe data-reveal="up" src={b.url} title={b.title || "Embedded content"} height={b.height} loading="lazy" className="mx-auto block w-full max-w-[800px] rounded-md border-0" />
      </div>
    </section>
  );
}

function ContactAside({ b, ctx }: { b: BlockOf<"contactAside">; ctx: RenderContext }) {
  return (
    <section {...section(b.anchor)} className="pb-16 text-center">
      <div data-reveal="up" className="site-container max-w-[600px]">
        {b.title && <h2 className="font-sans text-[26px] font-bold text-ink">{b.title}</h2>}
        <Html html={b.text} className="prose-site mt-3 text-[15px]" />
        {b.showSocial && ctx.social && (
          <div className="mt-6 flex justify-center"><SocialLinks social={ctx.social} /></div>
        )}
      </div>
    </section>
  );
}

function Columns({ b, ctx }: { b: BlockOf<"columns">; ctx: RenderContext }) {
  const grid = { "1-1": "md:grid-cols-2", "1-2": "md:grid-cols-[1fr_2fr]", "2-1": "md:grid-cols-[2fr_1fr]", "1-1-1": "md:grid-cols-3", "1-1-1-1": "md:grid-cols-2 lg:grid-cols-4" }[b.ratio];
  return (
    <section {...section(b.anchor)} className="py-6">
      <div className={`site-container grid gap-8 ${grid}`}>
        {b.columns.map((c, i) => (
          <div key={i} className="min-w-0 [&_.site-container]:max-w-none [&_.site-container]:px-0">
            {c.blocks.filter((x) => !x.hidden).map((x) => <BlockView key={x.id} block={x} ctx={ctx} />)}
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────── Dispatcher ─────────────────────────

export function BlockView({ block, ctx }: { block: Block | LeafBlock; ctx: RenderContext }) {
  switch (block.type) {
    case "hero": return <Hero b={block} ctx={ctx} />;
    case "introBand": return <IntroBand b={block} />;
    case "glance": return <Glance b={block} ctx={ctx} />;
    case "stats": return <Stats b={block} />;
    case "splitCta": return <SplitCta b={block} ctx={ctx} />;
    case "partners": return <Partners b={block} ctx={ctx} />;
    case "highlights": return <Highlights b={block} ctx={ctx} />;
    case "testimonials": return <Testimonials b={block} ctx={ctx} />;
    case "pageTitle": return <PageTitle b={block} ctx={ctx} />;
    case "richText": return <RichText b={block} />;
    case "heading": return <Heading b={block} />;
    case "image": return <ImageBlock b={block} ctx={ctx} />;
    case "gallery": return <Gallery b={block} ctx={ctx} />;
    case "buttons": return <Buttons b={block} ctx={ctx} />;
    case "video": return <Video b={block} />;
    case "spacer": return <div aria-hidden className={{ sm: "h-6", md: "h-12", lg: "h-20", xl: "h-32" }[block.size]} />;
    case "divider": return <div className="site-container py-6"><hr className="border-black/10" /></div>;
    case "infoCards": return <InfoCards b={block} />;
    case "featureSplit": return <FeatureSplit b={block} ctx={ctx} />;
    case "tabs": return <TabsBlock b={block} ctx={ctx} />;
    case "pricing": return <Pricing b={block} ctx={ctx} />;
    case "organizer": return <Organizer b={block} ctx={ctx} />;
    case "speakers": return <Speakers b={block} ctx={ctx} />;
    case "schedule": return <Schedule b={block} ctx={ctx} />;
    case "postList": return <PostList b={block} ctx={ctx} />;
    case "form": return <FormBlock b={block} ctx={ctx} />;
    case "embed": return <Embed b={block} />;
    case "contactAside": return <ContactAside b={block} ctx={ctx} />;
    case "columns": return <Columns b={block} ctx={ctx} />;
    default: return null;
  }
}

export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: RenderContext }) {
  return (
    <>
      {blocks.filter((b) => !b.hidden).map((b) => <BlockView key={b.id} block={b} ctx={ctx} />)}
    </>
  );
}

export { FORMS };
