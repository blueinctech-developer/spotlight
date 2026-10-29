# Architecture

Spotlight Nigeria runs as one Next.js 16 application (App Router, React 19, TypeScript strict). It contains both the public website and the CMS, backed by PostgreSQL through Prisma 7.

```
Browser ──► proxy.ts ──► app/(site)/[lang]/…   public site (cached, ISR)
                    └──► app/admin/…           CMS (dynamic, authenticated)
                         app/api/admin/…       upload + CSV export (authenticated)
                         app/media/[...key]    media files (when no CDN URL is set)
Server code ──► src/lib/* ──► Prisma ──► PostgreSQL
                         └──► Storage driver ──► S3-compatible bucket (prod) / .data/uploads (dev)
                         └──► SMTP (form notifications, password reset)
```

## Directory map

| Path | Purpose |
|---|---|
| `src/proxy.ts` | URL handling before routing: English URLs are rewritten to `/en/…` internally, `/fr/…` passes through, `/en/…` redirects to the unprefixed URL, theme-template URLs return 410, and an optimistic cookie check guards `/admin` |
| `src/app/(site)/[lang]/` | Public site root layout (fonts, `<html lang>`, cookie consent), the catch-all page, search, 404 and error pages |
| `src/app/admin/` | CMS: `(auth)` sign-in/setup/reset screens, `(cms)` authenticated screens, `preview/` routes, `actions/` Server Actions |
| `src/lib/blocks/schema.ts` | The block content model (Zod). It is shared by the editor, the API and the renderer |
| `src/components/blocks/` | Public renderers for each block, plus small client components (video popup, counters, tabs, slider, lightbox) |
| `src/components/site/` | Header, footer, language switcher, post/speaker/archive views |
| `src/components/admin/` | CMS UI kit (`ui.tsx`), shell, media picker, rich-text editor, and per-feature editors |
| `src/lib/content/` | Read-only public data access (`public.ts`) and URL resolution (`resolve.ts`) |
| `src/lib/auth/` | Password hashing, sessions, role capabilities |
| `src/lib/admin/` | `adminAction` wrapper (auth + validation + errors), revisions, cache revalidation |
| `src/lib/media/`, `src/lib/storage/` | Upload validation and processing, usage tracking, storage drivers |
| `src/lib/forms/` | Public form definitions (EN/FR labels) and the submission pipeline |
| `scripts/migration/` | Repeatable WordPress fetch + import |
| `prisma/` | Schema and versioned migrations |
| `tests/` | Vitest unit and integration tests, plus Playwright end-to-end tests |

## Rendering and caching

- **Public pages** use one catch-all route, `[[...slug]]`. `resolvePath()` maps a URL to a CMS page, post, speaker, archive (category, tag, author or date), paginated list, or database redirect. If nothing matches, it returns a 404.
- Pages are rendered on first request and then cached (classic ISR, `revalidate = 300`). Every CMS mutation calls `revalidatePublic()`, which runs `revalidatePath("/[lang]", "layout")` so changes appear immediately. The 5-minute window guarantees that scheduled content goes live on time without a cron job.
- Cache Components (`cacheComponents`) is **off** on purpose. With it on, page content streams inside Suspense boundaries, which makes correct HTTP 404 status codes and per-page metadata harder for a catch-all CMS route. The classic model is fully supported in Next 16 and can be migrated to later.
- **The CMS** is `force-dynamic`. Each screen reads the session on the server.

## Content model

- **Pages** hold an ordered list of typed blocks (`Page.blocks`, JSON validated by Zod), for example `hero`, `glance`, `partners`, `tabs`, `pricing`, `schedule`, `form` and `columns`. The live site's specialised sections are each a block type with editable fields, so editors change text, images and links without touching code. A block that fails validation is dropped and reported rather than breaking the page.
- Blocks reference shared records by id (media, speakers, partners, testimonials, events). A partner logo or speaker photo is therefore stored and edited once and reused everywhere.
- **Posts** are article-shaped: sanitized HTML from the rich-text editor, plus categories, tags, featured image and SEO fields.
- **Translations**: each language version of a page or post is its own row. The rows are linked by `translationGroup`. French lives under `/fr/` with the same slug, as with TranslatePress on the old site. Small records (speakers, testimonials, events, categories) carry `…Fr` fields. Settings use `{ en, fr }` pairs, and an empty French value falls back to English.
- **Rich text** is sanitized with an allow-list (`src/lib/sanitize.ts`) both when it is saved and when it is rendered. No scripts, inline styles, iframes or event handlers can be stored. Embeds go only through the `embed`/`video` blocks, which accept an allow-list of HTTPS hosts.

## Authentication and authorization

- Sessions are stored in the database. A 256-bit random token sits in an `httpOnly`, `SameSite=Lax`, `Secure` cookie (named `__Host-` in production), and only its SHA-256 hash is stored. Sessions expire after 14 days of inactivity (sliding). Passwords use Argon2id with OWASP parameters.
- **Why not a third-party auth library:** this design follows the OWASP and Lucia session guidance and stays small and fully tested (`tests/integration/auth-and-forms.test.ts`). It avoids configuration risk from a large dependency. If the team prefers a library later, Better Auth is the closest fit, because its data model maps onto the existing `User` and `Session` tables.
- **Roles** are `ADMIN`, `EDITOR` and `AUTHOR`; the capabilities are in `src/lib/auth/permissions.ts`.
  - Every Server Action goes through `adminAction(capability, zodSchema, fn)`, which authenticates, authorizes and validates on the server.
  - The upload and export route handlers check the same capabilities.
  - Object-level checks (for example, authors may edit only their own posts) happen inside each action.
- **CSRF protection**:
  - Server Actions are protected by Next's built-in origin check.
  - The upload API rejects cross-origin requests.
  - Session cookies are `SameSite=Lax`.
- **Rate limits** use Postgres, so they hold across instances. They cover:
  - sign-in: per IP, per account + IP (tight), and per account overall (loose, so a stranger cannot lock the owner out);
  - first-run setup;
  - password reset requests, per IP and per address;
  - public forms and uploads.
- **Client IP** comes from `src/lib/client-ip.ts`: Vercel's own header on Vercel, otherwise the proxy-added (right-most) `X-Forwarded-For` entry, or `TRUSTED_IP_HEADER`. A client cannot choose its IP by sending a header.
- **Password reset**:
  - the lookup and email run after the response (`after()`), so the timing doesn't reveal which accounts exist;
  - tokens are single-use, claimed atomically;
  - all of a user's outstanding tokens are revoked on reset, password change, admin reset and deactivation.
- **Last administrator**: role changes, deactivation and deletion are checked and written in one serializable transaction.
- **Audit log**: sign-ins, failed setup attempts, content changes, media, settings, user management, submission reads/exports and notification retries are written to `AuditLog`.
- **First administrator**: `/admin/setup/` works only while no user exists. In production it requires `SETUP_TOKEN`, checked in constant time after the rate limit. Alternatively, run `npm run admin:create`. No default account exists.
- **Security headers**: HSTS, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy and a baseline CSP (`object-src 'none'; base-uri 'self'; frame-ancestors 'self'`).

## Media

- **Uploads**:
  - the file type is detected from the file's content (magic bytes), not its name;
  - SVGs are accepted only without scripts, event handlers, links or external references (character references are decoded first). On S3 they are stored with `Content-Disposition: attachment`;
  - the limit is 15 MB, and a declared `Content-Length` is required;
  - image dimensions are read with `sharp`.
- **Storage**: files go to S3-compatible storage under date-based keys. The local driver refuses to run in production unless `ALLOW_LOCAL_STORAGE=true`.
- **Usage tracking**: `MediaUsage` is rebuilt whenever a referencing record is saved. Delete is blocked while an asset is still in use.
- **Replacing a file** keeps the same id. In the same transaction it rewrites the old file's URL inside rich text, block JSON, bios, descriptions, revisions and settings (`rewriteMediaReferences`). It then deletes the old object and revalidates the public site.
- **Delivery**: files are served from `NEXT_PUBLIC_MEDIA_BASE_URL` (a CDN) or through `/media/…`, which serves only registered keys with `nosniff`, plus a sandbox CSP for SVG. Public images go through `next/image`, which produces responsive sizes in AVIF and WebP.

## Forms

The public forms are contact, sponsorship, report download, press and newsletter. Field definitions, including the French wording, are in `src/lib/forms/definitions.ts`. A submission goes through these steps:

1. A honeypot field and a minimum fill time filter out bots.
2. A per-IP rate limit is applied.
3. The server validates the fields with Zod.
4. Duplicates are checked. Identical answers from the same sender within 10 minutes count as one submission (`dedupeKey`, unique in the database, so simultaneous double submits are safe too).
5. The submission is **stored**.
6. The notification email is sent through the outbox in `src/lib/forms/notify.ts`:
   - each attempt first **claims** the row, so concurrent workers never send twice;
   - a row that has been sent (`notifiedAt`) is never re-sent;
   - failures record `notifyError` and `notifyAttempts`.
7. After the response, `retryPendingNotifications()` catches up on earlier failures. They are retried with back-off (5 min × 3ⁿ, at most 5 attempts) by:
   - new submissions;
   - the daily cron job `/api/cron/notifications/` (bearer `CRON_SECRET`);
   - the **Retry email** button in the CMS.

   A missing SMTP configuration does not use up attempts.

The visitor sees success only after the submission is stored. The report-download link is returned only for a document attached to a form on a published page.

## SEO

- **Per page**: title, description, canonical URL, `hreflang` alternates (en-US, fr-FR and x-default), Open Graph tags and `noindex`.
- **Site-wide**: an XML sitemap (`/sitemap.xml`) and `robots.txt` (which blocks `/admin` and `/search`). Admin responses also carry an `X-Robots-Tag: noindex` header.
- **Structured data**:
  - home page: `Organization`, `WebSite` (with SearchAction) and `BusinessEvent` for the current edition;
  - inner pages, posts and speakers: `BreadcrumbList`;
  - posts: `Article`.
- **Verification**: Google and Bing site-verification codes come from Settings → SEO.
- **Legacy URLs**: WordPress paths are kept as they were, with trailing slashes.
  - Retired URLs return 301/308 redirects (`next.config.ts`) or 410 Gone (`proxy.ts`).
  - Editors can add more redirects in the database.
  - `proxy.ts` also redirects `/?s=` to `/search/?q=` and uppercase paths to lowercase.
  - `next.config.ts` redirects the Yoast/WordPress sitemap URLs and `/index.php`.
  - RSS feeds are served at `/feed/` and `/fr/feed/`.
  - Full mapping: `REDIRECT_MAP.csv`.

## Accessibility

- A skip link and semantic landmarks are on every page.
- Navigation works with the keyboard: dropdowns open on focus, and the mobile menu traps focus and closes with Escape.
- Dialogs are accessible (Radix in the CMS, custom with focus handling on the site).
- Tabs follow the WAI-ARIA pattern.
- Animation respects `prefers-reduced-motion`.
- Counters render their final value on the server.
- All form fields have labels.

## Motion and micro-interactions

Motion recreates the original site's Elementor animations, then refines them: scale-in photos, zoom-in play buttons, slide-from-left About text, and registration cards that fade up in sequence. Most of it is CSS; one small observer starts the scroll reveals.

- **Tokens** (`globals.css`):
  - `--ease-out`: the default easing.
  - `--ease-spring`: the original theme's button curve, `cubic-bezier(0,.97,.43,1)`.
  - `--ease-in-out`: used for wipes.
- **Scroll reveals:**
  - Add `data-reveal="up|down|left|right|zoom|scale|fade|blur|wipe"` to an element, with optional `data-reveal-delay="100…800"`. To animate a list's direct children in turn, put `data-reveal-stagger` on the list.
  - `RevealObserver` (`src/components/site/motion.tsx`) adds `.is-revealed` when the element scrolls into view.
  - Start states apply only once `<html>` has `.reveal-ready`. That class is never set without JavaScript, or for visitors who prefer reduced motion, so content is always visible for them.
  - Put `data-reveal` on a **wrapper**, never on an element that has its own hover transform. The reveal animation's end state would override that transform.
  - The `wipe` variant clips the element's children, not the element itself. A clipped target never registers as "intersecting".
- **Above the fold:** `.hero-line` (staggered on load) and `.hero-media` run without the observer.
- **Hover:**
  - `.btn`: green → dark grey (as on the original), plus a light sweep, a 2px lift and a press state.
  - `.nav-link`: underline that grows on hover.
  - `.hover-lift` (cards), `.zoom-frame` (images zoom inside their frame), `.logo-tile` (partner logos), `.link-underline` (text links).
- **Ambient:**
  - The hero photo floats gently and its green wave sways; the decorative plus pattern drifts.
  - The play buttons have pulse rings, and the stats strip has a slow shimmer.
  - Banners use CSS scroll-driven parallax (`.parallax-media`) where the browser supports it.
  - The header becomes frosted on scroll.
  - A back-to-top button shows a progress ring.
  - Each page fades in on navigation (`template.tsx`, opacity only, so `position: fixed` is not affected).
- **Guard rails:**
  - The page wrapper uses `overflow-x: clip`, so elements waiting to slide in can't widen the page.
  - The mobile menu renders in a portal, because the frosted header's `backdrop-filter` would trap `position: fixed`.
  - Everything is disabled under `prefers-reduced-motion`.
