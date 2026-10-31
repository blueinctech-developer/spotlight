# QA report

- **Audit date:** 29 October 2026, follow-up to the 28 October build.
- **Environment:** Windows 11, Node 24.15, Next.js 16.4.3 production build (`next build` + `next start -p 3100`), PostgreSQL 17 (local cluster) holding the imported content, Chrome via Playwright.
- **Not tested here:** Vercel, S3/R2 and SMTP, because no credentials were provided (see "Blocked").

The full requirement-by-requirement status is in [COMPLIANCE_MATRIX.md](COMPLIANCE_MATRIX.md).

## 1. Automated checks (final run, after all fixes)

| Check | Command | Baseline (before audit) | Final |
|---|---|---|---|
| TypeScript strict | `npm run typecheck` | 0 errors | ✅ 0 errors |
| ESLint | `npm run lint` | 0 errors, 19 warnings | ✅ 0 errors, 19 warnings (React Compiler performance advisories, unchanged) |
| Production build | `npm run build` | ✅ | ✅ |
| Unit + integration (Vitest, real PostgreSQL test DB) | `npm test` | 56 / 56 | ✅ **88 / 88** |
| End-to-end (Playwright + Chrome, 1440 px desktop and Pixel 7 mobile) | `npm run test:e2e` | 45 passed, 3 skipped | ✅ **55 passed**, 4 skipped by design (desktop-only/mobile-only), 0 failed |
| Prisma migrations | `prisma migrate status` | up to date (2) | ✅ up to date (3; the new one is additive) |
| Dependency audit | `npm audit` (prod and dev) | 0 vulnerabilities | ✅ 0 vulnerabilities |

### Tests added in this audit (32 unit/integration, 9 e2e)

- **Authorization bypass:** Server Actions called directly, without the UI:
  - anonymous callers are rejected;
  - **authors** cannot read, change, delete or retry enquiries, change settings, publish pages or create users;
  - **editors** cannot manage users or settings but can handle enquiries;
  - administrators cannot remove the last administrator;
  - unsafe settings values are refused.
- **Notification outbox:**
  - sends once and is never re-sent;
  - failures are recorded, back-off is respected, a later retry succeeds, and retries stop after 5 attempts;
  - 3 concurrent workers → exactly 1 email;
  - "not configured" does not use up attempts;
  - editors can retry from the CMS (audited).
- **Duplicate submissions:** concurrent and repeated identical submits are stored once; different content is stored separately.
- **Report download gate:** only a document attached to a published form is returned.
- **Password reset:**
  - a token works once;
  - a second outstanding token is revoked;
  - responses are identical for known and unknown emails, and the email is sent after the response.
- **Media replace:** old URLs are rewritten in posts, page blocks and bios; unrelated text is untouched.
- **Hardening units:**
  - client IP cannot be spoofed (Vercel, proxy hops, trusted header);
  - SVG filter: 7 bypass patterns rejected, legitimate logos accepted;
  - `javascript:` and `//` URLs refused in settings; `GT-` analytics IDs accepted.
- **Migration link normalisation:** old mirror, http/www, and `/new/` aliases in EN/FR.
- **E2E:**
  - `/feed/` and `/fr/feed/`;
  - Yoast sitemap redirects, `/?s=`, uppercase and `/index.php` redirects;
  - the cron endpoint refuses requests without its secret;
  - security headers including CSP;
  - JSON-LD types on home, post, speaker and page.

## 2. Bugs and gaps found and fixed in this audit

| # | Severity | Problem | Fix | Verified by |
|---|---|---|---|---|
| 1 | P1 | Failed notification emails were never retried. The notice was display-only | Outbox with claim, attempts and back-off; retries after submissions, daily cron, **Retry email** button | integration tests |
| 2 | P1 | **Replacing a media file broke every inline image** in posts, rich-text blocks and bios (old file deleted, URL not updated). The success message was false | Rewrite references in the same transaction, then delete the old file and revalidate | integration test |
| 3 | P1 (SEO) | The Search Console verification meta tag would be lost at cutover. The old site's `GT-` Google tag ID was rejected by Settings | Verification fields (Google, Bing) in Settings and metadata; `GT-` accepted | unit test + page output |
| 4 | P2 (SEO) | `/feed/`, `/fr/feed/`, `/sitemap_index.xml` (registered in Search Console), the Yoast child sitemaps, `/wp-sitemap.xml` and `/index.php` returned 404. `/?s=` was ignored. Uppercase URLs served duplicates | RSS route, redirects, proxy rules | e2e |
| 5 | P2 (SEO) | Sitemap had no tag archives and no French archives (99 URLs) | Taxonomy archives per language (148 URLs) | HTTP check |
| 6 | P2 (SEO) | 12 links in 2018 posts pointed at the dead hosting mirror `172.104.245.184`. 2 homepage links used a redirecting legacy path | Importer normalises links (`toSiteUrl`); re-import (idempotent: 0 records created) | link check: 0 broken, 0 redirecting, 0 to the old host |
| 7 | P2 (security) | Client IP for rate limits was read from the spoofable left-most `X-Forwarded-For` | `client-ip.ts` | unit tests |
| 8 | P2 (security) | Anyone knowing an admin's email could keep them locked out (account limit checked before the password) | Account + IP limit, plus a loose per-account limit | code review |
| 9 | P3 (security) | Reset tokens: non-atomic single use; old tokens never revoked; email flooding and account enumeration through timing | Atomic claim, revocation, per-address limit, work moved after the response | integration tests |
| 10 | P3 (security) | First-run setup open without a token in production; token compared before the rate limit with `!==` | Token required in production; rate limit first; constant-time compare; failed attempts audited | code review |
| 11 | P3 (security) | SVG filter bypassable with character references; SVGs served from S3 without a sandbox | Decode-then-check filter, links and external refs blocked; `Content-Disposition: attachment` on S3 | unit tests |
| 12 | P3 (security) | Upload size check bypassable with chunked bodies; `Origin: null` caused a 500 | `Content-Length` required (411); safe origin parse | code review |
| 13 | P3 (security) | No CSP; settings URL fields accepted `javascript:`; event registration URL accepted `//host` | Baseline CSP; strict URL schemas | e2e + unit |
| 14 | P3 (security) | Last-admin check raced with the write | Serializable transaction | integration test |
| 15 | P3 | Report-download gate accepted any media id from the browser | Only documents attached to a published form | integration test |
| 16 | P2 | Dashboard quick actions "New event" and "New speaker" led to a 404 | Open the create dialogs via `?new=1` | e2e |
| 17 | P2 | Language switcher swapped `/fr` only, so a translated slug gave a 404 | Follows the page's hreflang alternates; language home when untranslated | e2e (switcher test) |
| 18 | P2 (visual) | Home "at a glance" collage showed a large empty green tile instead of the original photo collage | Re-composed as on the live site (screenshots below) | screenshot comparison |
| 19 | P2 (a11y) | Logo carousels could not be paused by keyboard or touch after the pause button was removed | Focusable rows (pause on focus), tap to pause, screen-reader hint (EN/FR) | axe |
| 20 | P2 (a11y) | Invalid ARIA on counters; decorative initials announced; redundant alt; heading levels skipped in archives and contact cards; testimonial slider not keyboard-scrollable | Fixed in components | axe |
| 21 | P2 (a11y) | CMS contrast (grey text, green buttons), unlabelled file inputs, 16 px-high row links | AA colours, labels, 24 px targets | axe: **all 10 CMS screens clean** |
| 22 | P2 (perf) | Cookie banner appeared only after hydration and became the late LCP element (render delay about 3.4 s on mobile) | Server-rendered banner, hidden before paint for returning visitors | Lighthouse before/after |
| 23 | P3 (SEO) | No `WebSite`/`BreadcrumbList` structured data (the old site had them through Yoast); relative event offer URL; one speaker without a meta description | Added; absolute URL; fallback description | e2e |
| 24 | P2 (responsive) | Between 1024 and about 1140 px, menu labels wrapped ("About Us", "À propos de nous") and the header grew from 120 px to up to 300 px. The long French sponsor button ran off-screen at 390, 1024 and 1280 px (pre-existing). Found while you viewed the site | Labels never wrap; slightly tighter spacing below 1340 px; long button labels wrap onto two balanced lines; original button height kept | e2e (1024–1366 px, EN/FR) + header screenshots |
| 25 | P2 (SEO) | "Discourage search engines" only reached robots.txt: each page's own metadata replaced the layout's `robots` value, so pages carried no `noindex` (found while testing the Vercel staging copy) | The site-wide switch is applied last in page metadata and always wins | local on/off check + live staging page shows `noindex, nofollow` |
| 26 | UX | No way to check a typed password on the sign-in, setup and reset screens (requested) | Show/hide toggle (keyboard accessible, "Show/Hide password" labels, `aria-pressed`) | e2e |

## 3. Visual comparison

Screenshots of the live site and the new build at **1440, 768 and 390 px**: home, about, registration, get-in-touch, speakers, a post and `/fr/`.

- The new site has **no horizontal overflow** and **no console errors** at any width.
- The live homepage reloads itself during capture (WP Rocket), so it was compared section by section.
- About, registration, contact and speakers: same structure, copy, imagery, colours and typography. See the previous QA notes on Elementor details such as the masonry gallery and the 2023 programme cards.
- **Fixed in this audit:** the "at a glance" collage (#18).
- The cookie banner and back-to-top button overlay content in full-page screenshots, as expected for fixed elements.

## 4. Accessibility (axe-core 4.10, WCAG 2.0/2.1/2.2 A and AA plus best practice)

25 public page/width combinations and 10 CMS screens were scanned after scrolling, so reveal animations were complete.

| Area | Before | After |
|---|---|---|
| CMS (10 screens) | colour contrast on every screen (up to 48 nodes), missing label, small targets | **0 violations** |
| Public site | contrast + `aria-prohibited-attr` + heading order + `scrollable-region-focusable` + redundant alt | **contrast only (brand green)**, plus heading-order on 3 imported content pages (`/previous-editions/`, `/gallery/`, `/2023-programme2/`), which editors can fix |

**Open: brand colour contrast.**
- `#21B354` is 2.74:1 on white; the original site has the same problem.
- **The owner decided on 29 October 2026 to keep the brand colour.** This is an accepted limitation; the options for a later change are in DESIGN_SYSTEM.md › Contrast.
- Lighthouse accessibility scores are 96–97 because of this.

Not done: a screen-reader session (NVDA/VoiceOver). Keyboard paths are covered by the e2e tests (menu, dropdowns, Escape, focus on carousels).

## 5. Performance (Lighthouse 12.6, local production server, warmed cache)

Mobile uses Lighthouse's default simulation (Moto G Power, slow 4G, 4× CPU). These are **lab** numbers on a local machine, not a CDN. Real Core Web Vitals must be measured after deployment, with Vercel Speed Insights or CrUX.

| Page | Mobile perf | Mobile LCP | TBT | CLS | Desktop perf | Desktop LCP |
|---|---|---|---|---|---|---|
| `/` | 65 → **76** | 4.1 s | 650 → 400 ms | 0 | 99 | 0.9 s |
| `/about/` | 80 → **88** | 3.4 s | 200 ms | 0 | 100 | 0.8 s |
| `/get-in-touch/` | 71 → **92** | 3.1 s | 140 ms | 0 | 100 | 0.8 s |
| a post | 86 → **91** | 3.3 s | 170 ms | 0 | 99 | 0.8 s |
| `/speakers/` | 84 → **85** | 3.9 s | 170 ms | 0 | 99 | 0.8 s |

- Best practices are 100 everywhere. SEO is 100, except 92 on a post with a "click here" link (editorial).
- What remains on mobile:
  - the LCP is the cookie-banner text (first visit) or the hero image;
  - main-thread time on the home page comes from three continuous logo carousels and the reveal animations.
- Possible next steps:
  - pause off-screen carousels;
  - preload a smaller hero for mobile;
  - measure in the field before optimising further.

## 6. Security summary

There are no P0/P1 findings. Every Server Action, admin page and route handler checks the session and capability on the server (verified by code review across all 17 action files, and by the new bypass tests). The P2/P3 items found are fixed (#7–#15).

Other properties confirmed:
- DB sessions, stored only as token hashes, in `__Host-` cookies;
- Argon2id passwords;
- sanitised rich text on save and render;
- escaped JSON-LD;
- allow-listed embeds;
- `/media` serves only registered keys;
- `.env*` git-ignored and no secrets in the repository or client bundle;
- `npm audit` clean.

Remaining risks, documented:
- CSP does not yet restrict `script-src` (nonce-based policy is a follow-up);
- the export route relies on `SameSite=Lax`;
- full error objects are logged on unexpected action failures (no passwords or tokens).

## 7. Blocked / not verified

| Item | Why | What is needed |
|---|---|---|
| Email delivery (notifications, password reset) | No SMTP credentials | `SMTP_*` and `NOTIFY_EMAIL`, then submit a test form (ROLLBACK_PLAN.md A-14). The code path is tested with a mocked provider |
| S3/R2 storage, persistence across redeploys | No bucket credentials | `STORAGE_DRIVER=s3`, `S3_*`; check A-16 |
| Vercel deployment, cron, preview/production separation | No Vercel access | Project access and environment variables. Note the **4.5 MB request limit** on Vercel functions (uploads above that fail) |
| Production database and migrations | No access | Managed PostgreSQL, then `npm run db:migrate` |
| Search Console baseline (rankings, queries) | No access | Export from Search Console before cutover |
| Historical form entries, subscribers, WP users | WordPress database only | DB export or WXR |
| 7 speaker portraits, report PDF | Missing on the live server too or not public | Originals from the owner |
| French copy quality | Machine translation inherited | Native-speaker review |
| Brand colour contrast | Owner decided to keep `#21B354` (29 Oct 2026); accepted limitation | — |
| Field Core Web Vitals, load testing | Local only | After deployment |
