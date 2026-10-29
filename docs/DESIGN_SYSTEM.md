# Design system

The public site reproduces the original WordPress design (SeatEvent theme + Elementor). The values below were read from the live site's Elementor kit (`/wp-content/uploads/elementor/css/post-6.css`), its Google Fonts request and computed styles in the browser (verified 29 October 2026). The tokens live in `src/app/globals.css` (`@theme`).

## Colour

| Token | Value | Source / use |
|---|---|---|
| `brand` | `#21B354` | Elementor `--e-global-color-primary` and `accent`. Buttons, links, accents, green bands |
| `brand-600` | `#1C9A48` | Hover shade |
| `brand-700` | `#17803C` | Accessible green: 5.0:1 on white. CMS primary buttons; **recommended for public text links/small green text** (see below) |
| `brand-800` | `#126632` | CMS hover / small text on tinted green |
| `brand-50` | `#E9F7EE` | Tinted backgrounds |
| `ink` | `#39364F` | Headings (theme) |
| `body` | `#717488` | Body copy (theme) |
| `text` | `#323232` | Elementor `secondary`; strong text |
| `night` / `midnight` | `#030A1F` / `#0B1620` | Dark panels and dark header banners |
| `indigo` | `#1F0D6B` | European registration ticket card |
| `charcoal` | `#191919` | Dark buttons |
| `mist` / `field` / `snow` | `#EBEBEB` / `#F4F4F4` / `#F7F9FE` | Grey bands, form fields, light sections |

### Contrast: known limitation inherited from the brand

The brand green `#21B354` measures **2.74:1** against white (axe-core, Lighthouse). That is below WCAG 2.2 AA for normal text (4.5:1) and for large text (3:1). It affects green headings ("About Spotlight Nigeria", "The highly anticipated Spotlight Nigeria 2026"), small green labels, the active nav item, and white text on green buttons. The original site has exactly the same issue.

**Owner decision (29 October 2026): keep the original brand green `#21B354` unchanged.** This is an accepted accessibility limitation, so do not "fix" it without asking the owner. If WCAG AA conformance becomes a requirement later (for example for public-sector partners), there are two options:

1. **Minimal:** use `brand-700` (`#17803C`, 5.0:1) for *text* only (links, labels, small headings, the copyright line), and keep `#21B354` for large decorative surfaces such as bands, icons and the logo. Visual impact is small.
2. **Full AA:** also use `brand-700` as the button background (white text then passes at 5.0:1).

The CMS (not part of the public brand) already uses `brand-700` for its primary buttons.

Other remaining contrast items, also inherited:
- `body` grey `#717488` on the `mist` band is 3.86:1.
- On `snow` it is 4.37:1.

## Typography

| Role | Family | Weights | Loading |
|---|---|---|---|
| Headings | Plus Jakarta Sans | 500, 600, 700 | `next/font/google`, self-hosted, `display: swap`, CSS variable `--font-jakarta` |
| Body / UI | Urbanist (Elementor global typography for primary, secondary, text and accent) | 300–700 | `next/font/google`, `--font-urbanist` |

Self-hosting through `next/font` removes the render-blocking Google Fonts request the old site made and prevents layout shift through size-adjusted fallbacks.

Scale used by the blocks:
- Page titles: 36 → 56px.
- Section titles: 32 → 44/52px.
- Card titles: 18–26px.
- Body: 15–17px, light or regular weight, line height about 1.45.

## Layout

- Content container `site-container`: max 1360px including gutters (1280px content, as on the original), 20px gutters on mobile, 40px from `md`.
- Radius `--radius-site: 5px` (buttons, cards, images). There are no large pill radii, as on the original.
- Breakpoints: Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Layouts are verified at 390, 768 and 1440 px with no horizontal overflow (Playwright, `tests/e2e/public.spec.ts`).

## Components (public)

| Component | Where | Notes |
|---|---|---|
| Header + mega/dropdown nav, frosted on scroll, mobile drawer in a portal | `src/components/site/site-header.tsx` | Light and dark variants (per page) |
| Footer: CTA band, 3 menu columns, language dropdown, credits | `site-footer.tsx` | "default" (green CTA) / "seat" (dark band + newsletter) / "none" |
| Buttons `.btn`, `.btn-primary`, `.btn-dark`, `.btn-outline` | `globals.css` | Theme spring curve `cubic-bezier(0,.97,.43,1)`, light sweep, 2px lift, press state |
| Blocks (29 types) | `src/components/blocks/render.tsx` | Hero, intro band, at-a-glance collage with stats, split CTA, partner logo carousels, highlights, testimonials, page title, rich text, gallery and lightbox, tabs, pricing tickets, speakers, schedule, post list, forms, embeds, columns |
| Forms | `src/components/forms/` | Labelled fields, native and server validation, pending state, success shown only after the server has stored the submission |

## Motion

Motion tokens are `--ease-out`, `--ease-spring` and `--ease-in-out`. Scroll reveals use `data-reveal` plus `RevealObserver`. All motion is disabled under `prefers-reduced-motion`; content is never hidden without JavaScript. See ARCHITECTURE.md › Motion for the full list.

Logo carousels move continuously and have no visible pause button (the owner asked for it to be removed). They pause:
- on hover;
- when a row has keyboard focus (each row is focusable and has a screen-reader hint);
- on tap (tap again to resume).

This meets WCAG 2.2.2 without a visible control. Under reduced motion they become a static row.

## Imagery

All photographs, logos and partner marks are the original site's files, downloaded at the highest available resolution. Nothing is AI-generated or stock. Images go through `next/image`, which produces AVIF/WebP and responsive `sizes`. Photos use quality 90.

## CMS design

The CMS uses neutral zinc surfaces, the accessible green for primary actions and an 8px radius. It has:
- a grouped sidebar;
- tables with search, filters, sorting, pagination and bulk actions;
- Radix dialogs, dropdowns and tooltips;
- Sonner toasts.

Contrast was raised to WCAG AA in this audit. axe-core reports no issues on the dashboard, media, submissions, settings, events, users and login screens.
