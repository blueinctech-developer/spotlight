# Requirements compliance matrix

**Audit date:** 29 October 2026.

## Sources

- **Original specification ("spec"):** *"MASTER PROMPT: SPOTLIGHT NIGERIA — COMPLETE WORDPRESS-TO-NEXT.JS MIGRATION + PREMIUM HEADLESS CMS"*, together with three follow-up requests from the same session (§F below). It was recovered from the build session's transcript. Its last sentence is cut off in the transcript ("If the project is too large for one uninterrupted implementation, finish each…"), so any instruction after that point is unknown.
- **Audit brief ("audit"):** the 29 October request. It refers to a document titled *"MASTER DESIGN DIRECTION — SPOTLIGHT NIGERIA-FRANCE NEXT.JS REBUILD"*. **No document with that title exists** in the repository, the project files or the session history. Requirements stated in the audit brief itself are included below (prefix **AU**); anything only in that other document could not be audited.

## Status values

| Status | Meaning |
|---|---|
| **PASS** | Implemented, and passed the verification listed |
| **PARTIAL** | Some of it works; parts are missing or unverified |
| **FAIL** | Missing, broken or non-compliant |
| **BLOCKED** | Needs a credential, service, access or decision that is unavailable |
| **NOT VERIFIED** | Not enough evidence either way |
| **N/A** | Does not apply, with the reason given |

## Verification methods

| Code | Method |
|---|---|
| UT / IT | Vitest unit / integration test against PostgreSQL |
| E2E | Playwright test in Chrome against the production build |
| BR | Browser inspection or screenshots at 1440, 768 and 390 px |
| HTTP | Scripted request replay (`scripts/audit/*`) |
| AXE / LH | axe-core / Lighthouse |
| CR | Code review with file evidence |
| DB | Database query (`scripts/migration/reconcile.ts`) |

"Fixed" in the notes means fixed during this audit and retested (see QA_REPORT.md §2).

## A. Audit, discovery and documentation (spec §3, §4, §15)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| A1 | Audit every public URL EN/FR, templates, sections, forms, SEO, responsive → `WEBSITE_AUDIT.md` | `docs/WEBSITE_AUDIT.md` (1,046 lines), `docs/SEO_BASELINE.md`, `docs/seo/live-crawl-2026-10-29.csv` (304 URLs) | HTTP, CR | PASS | |
| A2 | `MIGRATION_MAP.md`: every old URL → new route with status | `docs/MIGRATION_MAP.md`, `docs/REDIRECT_MAP.csv` (301 rows, generated from the replay) | HTTP | PASS | |
| A3 | Examine the WordPress source (REST, export, DB, plugins, forms, integrations) | `docs/CONTENT_MIGRATION.md` › Source data | CR | PARTIAL | Public REST and HTML only. **BLOCKED** for the DB/WXR export (needs owner access) |
| A4 | Never invent content to fill gaps | Missing portraits shown as initials; missing 2018 images removed and reported | BR, CR | PASS | |
| A5 | Required docs: WEBSITE_AUDIT, MIGRATION_MAP, ARCHITECTURE, DATABASE_SCHEMA, CONTENT_MIGRATION, DEPLOYMENT, ADMIN_GUIDE, QA_REPORT | `docs/` | CR | PASS | All updated in this audit |
| A6 | Audit brief docs: README, MIGRATION_PLAN, MIGRATION_REPORT, SEO_BASELINE, SEO_MIGRATION_REPORT, REDIRECT_MAP.csv, ROLLBACK_PLAN, design system, compliance matrix | `docs/` | CR | PASS | Created in this audit |
| A7 | Document what is incomplete, the credentials needed, and what is unverified | QA_REPORT §7, this matrix | CR | PASS | |

## B. Architecture and engineering (spec §5)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| B1 | Next.js App Router, React, strict TypeScript, Tailwind | `package.json` (Next 16.4.3, React 19.3), `tsconfig.json` strict | CR, typecheck | PASS | |
| B2 | Radix/shadcn-style accessible primitives | `radix-ui`, `src/components/admin/ui.tsx` | CR, AXE (CMS 0 issues) | PASS | |
| B3 | PostgreSQL + Prisma, Zod validation | `prisma/schema.prisma`, `src/lib/**` | IT | PASS | |
| B4 | Secure authentication | `src/lib/auth/*` (DB sessions, Argon2id) | IT, E2E | PASS | |
| B5 | Private, persistent production media storage | `src/lib/storage` (S3 driver; local refused in production) | CR | BLOCKED | No bucket credentials. Persistence across redeploys not verifiable |
| B6 | Separation of public site, CMS, models, auth, media and migration | Directory map in ARCHITECTURE.md | CR | PASS | |
| B7 | Route structure: `/`, `/about/`, `/registration/`, `/programme/`, `/fr/...`, `/admin/*` | Catch-all `[lang]/[[...slug]]`, admin routes | E2E (13 pages × EN/FR × 2 viewports) | PASS | |

## C. Public website (spec §6, follow-ups §F)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| C1 | Faithful recreation: header, nav, mobile menu, language selector | `site-header.tsx`, `language-switcher.tsx` | BR, E2E | PASS | |
| C2 | Hero, intro, statistics, highlights | blocks `hero`, `introBand`, `glance`, `stats`, `highlights` | BR | PASS | Collage defect **fixed** (QA #18) |
| C3 | Programme and session layouts | `schedule` block, `/2023-programme2/` | BR | PARTIAL | The 2023 programme's bespoke coloured cards are approximated by generic blocks (documented). Editors can rebuild them with the Schedule block |
| C4 | Speakers + portraits | `/speakers/`, speaker pages | BR, E2E | PARTIAL | 7 portraits are missing on the source server too (BLOCKED on originals) |
| C5 | Registration / participation sections | `/registration/`, pricing block | BR, E2E | PASS | External Weezevent and Google Form links kept |
| C6 | Sponsorship, partner, co-organizer logos: exact original logos, no invented ones | `partners` block; previous-session one-by-one comparison | BR | PASS | |
| C7 | Testimonials with images | `testimonials` block | BR | PASS | Slider made keyboard-focusable (fixed) |
| C8 | Footer, contact info, social links | `site-footer.tsx` | BR | PASS | |
| C9 | Brand colours, fonts and imagery preserved | DESIGN_SYSTEM.md (verified against the Elementor kit `#21B354`, Urbanist, Plus Jakarta Sans) | BR, CR | PASS | |
| C10 | Responsive: no overflow; touch navigation; readable; forms usable | E2E overflow checks at 1440 and Pixel 7; screenshots at 768 | E2E, BR | PASS | |
| C11 | No dead buttons, placeholder links or fake forms | Link check: 0 broken out of 241 internal URLs | HTTP | PASS | |
| C12 | Third-party integrations preserved, or safe integration points | Weezevent links, Google Form embed, YouTube popups | BR | PASS | |
| C13 | Custom 404 and error pages | `[lang]/not-found.tsx`, `error.tsx` | E2E (404) | PASS | |
| C14 | Micro-interactions and motion "like a 10k site" (follow-up 1) | `globals.css` motion tokens, `motion.tsx` | BR | PASS | Reduced motion respected |
| C15 | Partner logos exactly match live (follow-up 2) | as C6 | BR | PASS | |
| C16 | Larger, interactive image upload (follow-up 2) | `media-picker.tsx` drop zone | CR | NOT VERIFIED | Implemented in the previous session; not re-inspected visually in this audit |
| C17 | High image quality (follow-up 2) | originals at full resolution, `quality 90`, AVIF/WebP | CR, BR | PASS | |
| C18 | Logo groups as carousels (follow-up 3); pause icon and nav progress line removed (follow-up 4) | `LogoCarousel` | BR | PASS | Keyboard and tap pausing added for WCAG 2.2.2 without a visible icon |

## D. CMS (spec §7)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| D1 | Polished editorial UI: tables with search, sort, filter, pagination, bulk; dialogs; states | `src/components/admin/*` | CR, AXE (0 issues) | PARTIAL | Users, events, speakers, partners and redirects lists have no server pagination or bulk actions (small datasets) |
| D2 | Dashboard from real data (counts, scheduled, media, activity, events, review, quick actions) | `admin/(cms)/page.tsx` | E2E, CR | PASS | Dead quick actions **fixed**. "Awaiting review" counts posts only |
| D3 | Pages: create, edit, preview, publish, unpublish, delete/restore, drafts, autosave, SEO fields, hierarchy, scheduling, duplicate, revisions | `actions/pages.ts`, page editor | E2E (draft/preview/public), IT (visibility), CR | PASS | |
| D4 | Archive pages | status select | CR | PARTIAL | Only through the status dropdown; no dedicated archive action |
| D5 | Data-loss protection: autosave, dirty-state warning, confirmations | `editor.tsx` | CR | PARTIAL | `beforeunload` only. In-app link navigation does not warn |
| D6 | Structured block editor (insert, delete, reorder, duplicate, configure, hide); validated; same rendering publicly | 29 block types, `blocks/schema.ts`, `render.tsx` | UT, CR | PASS | |
| D7 | Posts: categories, tags, featured image, author, excerpt, dates, states, search, related, pagination, templates | `actions/posts.ts`, `post-view.tsx` | E2E, IT | PARTIAL | Post author can't be reassigned (display name only); post "archive" has no UI |
| D8 | Media: upload images and documents, grid/list, search, filter, preview, edit metadata, replace, picker, usage + delete protection | `media-library/*`, `lib/media/*` | IT (replace rewrite), E2E (upload auth) | PARTIAL | Replace **fixed**. Documents are PDF only. Filename not editable. **On Vercel, uploads over about 4.5 MB fail** (platform limit) |
| D9 | Navigation manager: header/footer, EN/FR, pages + custom links, drag and drop, nesting, visibility | `menu-manager.tsx`, `actions/navigation.ts` | IT (menus), CR | PARTIAL | Five fixed menu locations; arbitrary new menus can't be created |
| D10 | Event management (editions, dates, timezone, venue, programme, speakers/moderators, partners, states, history) | `actions/events.ts`, event editor | CR | PARTIAL | Complete in the admin. **Publicly** only sessions (Schedule block) and JSON-LD use event data. Banner, gallery, theme and event partners aren't rendered, and there's no past-editions page driven by events |
| D11 | Speakers, partners, testimonials as reusable records | `actions/speakers.ts`, `partners.ts`, `testimonials.ts` | IT (block data loading) | PASS | Speaker social links and testimonial organisation aren't displayed |
| D12 | Bilingual: translation links, localized metadata/slugs, previews, switcher to the equivalent page, hreflang, missing-translation indicators | translation groups, `language-switcher.tsx` | E2E, IT | PASS | Switcher **fixed** to follow hreflang alternates |
| D13 | Validated site-wide settings (name, logo, contact, social, CTAs, SEO, analytics, cookies, …) | `settings-schema.ts` | UT | PARTIAL | Contact phones/addresses/hours and the default-locale setting are saved but not used publicly. URL validation hardened (fixed) |
| D14 | Content can be managed without code changes; publishing updates the site | `revalidatePublic()` | E2E (draft → publish visible immediately) | PASS | |

## E. Authentication, roles, security (spec §8, audit §12)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| E1 | CMS not public without auth; `noindex` | `proxy.ts`, `requireUser` | E2E | PASS | |
| E2 | Roles: Administrator, Editor, Author | `permissions.ts` | UT | PASS | |
| E3 | Server-side authorization on every mutation and endpoint | `adminAction` (all 17 action files), route handlers | **IT (direct-call bypass tests)**, CR | PASS | |
| E4 | Object-level checks (authors only their own posts) | `canEditPost` | UT, CR | PASS | |
| E5 | Secure sessions | DB sessions, token hash, `__Host-`, httpOnly, Secure, SameSite | IT | PASS | |
| E6 | Password hashing | Argon2id | IT | PASS | |
| E7 | CSRF protection | Server Actions origin check; upload origin check; SameSite | E2E (cross-site upload 403) | PASS | |
| E8 | Input validation, output sanitisation, XSS | Zod everywhere; `sanitize.ts`; `safeHref`; JSON-LD escaping | UT | PASS | SVG filter and settings URLs **hardened** |
| E9 | SQL injection | Prisma; raw SQL uses parameters | CR | PASS | |
| E10 | Upload validation | magic bytes, SVG check, size | UT, E2E | PASS | Chunked-upload bypass **fixed** |
| E11 | Rate limiting (login and sensitive endpoints) | `rate-limit.ts` (Postgres) | IT | PASS | IP spoofing and lockout abuse **fixed** |
| E12 | Secret management; no secrets client-side or in git | `.gitignore`, `env.ts`; review | CR | PASS | |
| E13 | Audit log of admin actions | `audit.ts` | IT | PASS | |
| E14 | No default admin; secure first-admin setup; recovery documented | `/admin/setup`, `admin:create --reset` | CR | PASS | Token **now required** in production |
| E15 | Security headers | `next.config.ts` | E2E | PARTIAL | Baseline CSP added; `script-src` not restricted yet |
| E16 | Dependency vulnerabilities | `npm audit`: 0 | tool | PASS | |
| E17 | Least-privilege DB and storage access | DEPLOYMENT.md guidance | CR | BLOCKED | Depends on production provisioning |
| E18 | Privacy: cookie consent before analytics; IPs hashed | `cookie-consent.tsx`, `hashIdentifier` | IT, CR | PASS | |
| E19 | Personal-data retention and deletion | Submissions can be deleted (single and bulk) | CR | PARTIAL | No automatic retention period. The owner should set a policy |

## F. Forms, email, appointments (spec §9, audit §9)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| F1 | Recreate the existing form experiences (contact, sponsorship, report download, press, newsletter) | `forms/definitions.ts`, `site-form.tsx` | E2E (contact) | PASS | Press registration stays an embedded Google Form, as on the live site |
| F2 | Validation (client + server), clear errors | native + Zod | E2E, IT | PASS | |
| F3 | Persistence; success only after storing | `processSubmission` | IT | PASS | |
| F4 | Spam protection, rate limiting | honeypot, timing, per-IP limit | IT | PASS | reCAPTCHA was replaced by invisible checks (documented) |
| F5 | Duplicate-submission prevention | `dedupeKey` (unique) | IT | PASS | **New** in this audit |
| F6 | Admin access: search, filter, export | submissions screens, CSV | CR | PASS | |
| F7 | Email notifications through a configured provider | `email.ts` (SMTP) | IT (mocked provider) | BLOCKED | Real delivery needs SMTP credentials |
| F8 | Track notification status; detect failures; retry; no duplicates; durable after the response | `notify.ts`, cron route, Retry button | IT | PASS | **New** outbox. Real provider untested (F7) |
| F9 | No fake payments or ticket confirmations | Ticketing stays on Weezevent | CR | PASS | |
| F10 | Appointment booking (audit §9) | — | BR (live site) | N/A | The live site has **no appointment or consultation booking**. It is an event forum; participation goes through Weezevent tickets and registration forms. Nothing was invented |

## G. Database and data model (spec §10, audit §8)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| G1 | Normalized models (users, pages, posts, taxonomy, media, menus, events, sessions, speakers, partners, testimonials, submissions, revisions, settings, audit) | `schema.prisma` | IT | PASS | |
| G2 | Constraints, indexes, transactions | unique/indexes; transactions in setup, reset, users, media replace, page paths | IT, CR | PASS | |
| G3 | Versioned migrations | `prisma/migrations/` (3) | `migrate status` | PASS | |
| G4 | Serverless-friendly connections | `@prisma/adapter-pg` | CR | NOT VERIFIED | Pooling under Vercel load not tested. Use a pooled URL (Neon/Supabase pooler) |
| G5 | Backup and restore strategy | DATABASE_SCHEMA.md › Backups, ROLLBACK_PLAN.md | CR | PARTIAL | Documented; restore not rehearsed (no production DB) |
| G6 | Pagination for large collections | posts, pages, submissions, media | CR | PASS | |

## H. SEO and URLs (spec §11, audit §11)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| H1 | Preserve slugs and URL structure | replay: every live 200 URL resolves | HTTP | PASS | |
| H2 | Redirects for changed URLs; no chains; no irrelevant homepage redirects | `next.config.ts`, `proxy.ts`, REDIRECT_MAP.csv | HTTP, E2E | PASS | Feeds, sitemaps, `/?s=`, uppercase and `/index.php` **added** |
| H3 | Server-rendered/static public pages | ISR | CR | PASS | |
| H4 | Unique titles and meta descriptions | 237/237 pages have a description | HTTP | PASS | French titles follow CMS titles (inherited English titles) |
| H5 | Canonical URLs | self-canonical from `SITE_URL` | E2E | PASS | Production needs `SITE_URL` set |
| H6 | Open Graph / social metadata | metadata API | HTTP | PASS | |
| H7 | XML sitemap | 148 URLs, EN + FR, hreflang | E2E, HTTP | PASS | Tags and FR archives **added** |
| H8 | robots directives; production not blocked; staging protectable | `robots.ts`, "Discourage" switch | E2E | PASS | |
| H9 | Heading hierarchy | one H1 per page | HTTP, AXE | PARTIAL | 3 imported content pages skip a level (editable) |
| H10 | Image alt text | 0 `<img>` without `alt` | HTTP | PASS | |
| H11 | Structured data appropriate to content | Organization, WebSite, BusinessEvent, Article, BreadcrumbList | E2E | PASS | WebSite and BreadcrumbList **added** |
| H12 | Pagination metadata | `/page/N/` canonical, `/page/1/` redirect | E2E | PASS | |
| H13 | EN/FR language metadata | `html lang`, hreflang + x-default | E2E | PASS | |
| H14 | Admin not indexable | header + meta | E2E | PASS | |
| H15 | Analytics and Search Console continuity | settings for `GT-` tag and verification code | UT | PARTIAL | Values must be entered at cutover. Search Console data **BLOCKED** (no access) |
| H16 | Published changes reach crawlers | revalidation on every mutation | E2E | PASS | |

## I. Performance and accessibility (spec §12, audit §13)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| I1 | Image optimisation, responsive sizes, lazy loading | `next/image` | LH | PASS | |
| I2 | Strong Core Web Vitals | LH desktop 99–100; mobile 76–92 (lab); CLS 0 | LH | PARTIAL | Mobile LCP 3.1–4.1 s in the lab. Field data needed after launch |
| I3 | Minimal client JS, efficient queries, caching | ISR, batched block data | LH, IT | PASS | |
| I4 | Keyboard navigation, focus states, accessible dialogs | menus, tabs, dialogs, carousels | E2E, AXE | PASS | |
| I5 | Semantic HTML and landmarks; labelled forms | skip link, landmarks, labels | AXE | PASS | |
| I6 | Reduced motion | CSS + observer | CR | PASS | |
| I7 | Adequate contrast (WCAG 2.2 AA) | axe | AXE | PARTIAL | CMS: pass. **Public: brand green 2.74:1 fails.** The owner chose on 29 Oct 2026 to keep the brand colour, an accepted limitation (DESIGN_SYSTEM.md) |
| I8 | Screen-reader verification | — | — | NOT VERIFIED | No NVDA/VoiceOver session |

## J. Testing (spec §13, audit §14)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| J1 | Typecheck, lint, build | scripts | run | PASS | |
| J2 | Unit and integration tests for core logic, CMS operations, auth, forms, media, events/bilingual | `tests/unit`, `tests/integration` (88) | run | PASS | |
| J3 | Browser E2E for critical flows, responsive, links and routes | `tests/e2e` (54 + 3 skipped) | run | PASS | |
| J4 | Security tests: unauthorized access, bypass, confidentiality, upload, secrets, rate limit | E2E + IT | run | PASS | |
| J5 | Migration tests: counts, images, links, legacy URLs | `reconcile.ts`, `check-links.cjs`, `compare-urls.cjs`, UT for link normalisation | run | PASS | |
| J6 | Screenshots of live vs new at matching sizes, compared | QA_REPORT §3 | BR | PASS | |
| J7 | Published content appears; drafts stay private | E2E | run | PASS | |
| J8 | Email-notification and media-storage tests against real providers | — | — | BLOCKED | Credentials |

## K. Migration and deployment (spec §14, audit §10, §15)

| ID | Requirement | Evidence | Verified by | Status | Notes |
|---|---|---|---|---|---|
| K1 | Repeatable, idempotent migration with validation and report | `scripts/migration/*`, `report.json` | DB (3 re-runs, 0 created) | PASS | |
| K2 | Pages, posts, translations, media, metadata and relationships imported; dates and slugs kept | MIGRATION_REPORT.md | DB, HTTP | PARTIAL | All used media migrated; about 630 unused library files not. WP-database-only data **BLOCKED** |
| K3 | Missing assets and failed records identified | report.json, MIGRATION_REPORT | DB | PASS | |
| K4 | Changes made on WordPress after the import are accounted for | MIGRATION_PLAN.md › Changes made on WordPress after the import; REST modified dates checked | HTTP | PASS | No delta as of 29 October |
| K5 | WordPress untouched until approval | read-only scripts | CR | PASS | |
| K6 | Deployment documentation (env, migrations, storage, auth, email, DNS, redirects, backups, rollback) | DEPLOYMENT.md, ROLLBACK_PLAN.md | CR | PASS | |
| K7 | `.env.example` has names and placeholders only; real env not committed | `.env.example`, `.gitignore` | CR | PASS | |
| K8 | Vercel configuration | `vercel.json` (framework, cron) | CR | PARTIAL | Not deployed (no access). The upload limit is documented |
| K9 | Production build, DB migrations, secrets, storage, email verified in the hosted environment | — | — | BLOCKED | Owner access needed |
| K10 | Preview/production separation | DEPLOYMENT.md guidance; migrations not in the build | CR | PARTIAL | Needs configuration on Vercel |

## AU. Items specific to the audit brief

| ID | Requirement | Status | Notes |
|---|---|---|---|
| AU1 | Service / practice-area pages | N/A | The site is an event forum. There are no service or practice-area pages on the live site |
| AU2 | Consultation/appointment pages and booking | N/A | Not present on the live site (see F10) |
| AU3 | Compare visual quality with monday.com principles; avoid generic AI aesthetics, fake claims and invented stats | PASS | The design is the original brand's. Stats (2,000+ attendees…) and testimonials are the live site's own content. No stock or AI imagery |
| AU4 | Retrieve the "MASTER DESIGN DIRECTION" pillar specification | BLOCKED | Not found anywhere accessible. Audited against the original build specification instead |

## Statistics

Requirements in sections A–K and AU: **127**.

| Status | Count | Where |
|---|---|---|
| PASS | 94 | |
| PARTIAL | 21 | 8 of them in the CMS (§D) |
| FAIL | 0 | |
| BLOCKED | 6 | Storage, least-privilege access, email delivery, provider tests, hosted deployment, the missing pillar document |
| NOT VERIFIED | 3 | Upload drop zone visuals, serverless DB pooling, screen-reader pass |
| N/A | 3 | Appointments ×2, practice-area pages |

Counted by script from the tables above. Fixes made during the audit are counted at their final, retested status. No requirement is marked PASS on the basis of code existence alone.

Before the audit fixes, these would have been FAIL or PARTIAL:
- F5 duplicate prevention;
- F8 notification retry;
- D8 media replace;
- H2 feeds and sitemap redirects;
- H11 structured data;
- H15 verification;
- D12 language switcher;
- E8, E10, E11 and E14 hardening;
- C2 collage;
- I4 carousel keyboard access;
- D2 dashboard links.
