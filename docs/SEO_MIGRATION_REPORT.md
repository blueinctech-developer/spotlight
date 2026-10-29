# SEO migration report

Compares the live WordPress site ([SEO_BASELINE.md](SEO_BASELINE.md)) with the new site. Date: 29 October 2026. The new site ran as a production build (`next build` + `next start`) on a local machine, loaded with the imported content.

No ranking or traffic outcome is guaranteed. The goal is that every URL Google knows keeps working, or redirects once to its closest equivalent, and that metadata is at least as good as before.

## Method

1. Crawl the live site: 304 URLs. These are the sitemap URLs, their `/fr/` copies, the links on the EN/FR navigation and footer, and probes (`scripts/audit/crawl-live.cjs`).
2. Replay every URL against the new site without following redirects. Record the status, the redirect chain, and on the final page the title, H1, description, canonical, robots, hreflang and JSON-LD (`scripts/audit/compare-urls.cjs`). Results: [`seo/live-vs-new-2026-10-29.csv`](seo/live-vs-new-2026-10-29.csv).
3. Crawl the new site and check every internal link and image (`scripts/audit/check-links.cjs`).
4. Lighthouse SEO audits and Playwright e2e tests (`tests/e2e/public.spec.ts`: redirects, feeds, sitemaps, structured data, canonical, hreflang).

## Results

| Check | Result |
|---|---|
| Live URLs that end in a 200 on WordPress | **All resolve on the new site.** 241 return 200 directly or after **one** permanent redirect. None returns a 404 |
| Redirect chains | **None.** Every redirect is a single hop (301 or 308, both permanent for Google) |
| Unrelated redirects to the homepage | **None.** Demo or legacy content goes to the closest page: `/events/*` → `/programme/` (the 2023 event → `/2023-programme2/`), organizers → `/about/`, demo speakers → `/speakers/` |
| Theme internals (`/hf_template/*`, 54 URLs EN+FR) | **410 Gone**, not the old blanket 301 to the homepage, because these were never pages |
| WordPress sitemap URLs (`/sitemap_index.xml`, `/wp-sitemap.xml`, the 11 Yoast child sitemaps) | 308 → `/sitemap.xml` |
| `/index.php`, `/?s=…`, uppercase paths, missing trailing slash | One-hop redirects to the canonical URL. These were duplicate 200s on WordPress |
| RSS `/feed/`, `/fr/feed/` | Recreated at the same URLs (RSS 2.0, 20 latest posts) |
| Internal links on the new site | 163 pages crawled, 241 unique internal URLs: **0 broken**, **0 that redirect**, **0 links to the old host or IP**. Before this audit's importer fix, 12 post links pointed at the dead hosting mirror `172.104.245.184` and 2 at `/new/sponsorship-registration/` |
| Meta description | **Present on all 237 HTML pages** (WordPress: 0). Posts and speakers use their own text; pages fall back to the site description |
| H1 | **Exactly one H1 on every page** (WordPress: 35 pages wrong) |
| Canonical | Self-referencing on every page, built from `SITE_URL`. **Set `SITE_URL=https://spotlightnigeria-france.com` in production**; locally it shows `localhost` |
| hreflang | `en-US`, `fr-FR` and **`x-default`** on every page, generated from real translation links |
| Sitemap | `/sitemap.xml`: 148 URLs, EN **and FR**, with `xhtml:link` hreflang. Includes pages, posts, speakers, and category and tag archives that contain posts. Excludes drafts, scheduled and trashed content, `noindex` pages, and the date and author archives |
| robots.txt | Allows the site; disallows `/admin/`, `/api/`, `/search/`; declares the sitemap. "Discourage search engines" in Settings switches it to `Disallow: /` and adds `noindex` (for staging only) |
| Admin indexing | `X-Robots-Tag: noindex, nofollow` and `noindex` meta on all `/admin` pages |
| Structured data | Home: `Organization`, `WebSite` (with SearchAction) and `BusinessEvent` (current edition). Inner pages, posts and speakers: `BreadcrumbList`. Posts: `Article`. Verified by e2e |
| Image alt text | 0 `<img>` without `alt` on the new site (WordPress: 1,690) |
| Open Graph | Title, description, locale, site name and image (page image, or the default share image from Settings) |
| Search Console verification | A setting now exists (**Settings → SEO**). Enter the current code (SEO_BASELINE.md) before cutover |
| Analytics | Settings accepts the current Google tag `GT-PJSNCJK7`. It loads only after cookie consent |
| Lighthouse SEO score | 100 on home, about, contact and speakers; 92 on posts that contain a "here" link (see below) |

## Intentional differences

| URL / behaviour | WordPress | New site | Why |
|---|---|---|---|
| `/hf_template/*` | 301 → `/` | 410 | Not content. A blanket redirect to the homepage is a soft-404 signal |
| `/category/uncategorized/` | 200 (empty) | 410 | Empty default category |
| `/author/blueinctech/` | indexable | 200 with `noindex, follow` | Thin duplicate of the post list |
| `/page/2/` (blog pagination on the static home) | 200 | 404 | The homepage is a static page; posts are paginated under `/press-releases/page/N/` |
| `/comments/feed/`, `/wp-json/`, `/wp-admin/`, `/xmlrpc.php` | 200 / various | 404 | WordPress internals |
| French `<title>` | English | follows the FR page title in the CMS | Editors can translate titles now |
| Redirect code | 301 | 308 for rules in `next.config.ts`, 301 for proxy rules | Both are permanent; Google treats them the same |

## Remaining items

1. **Link text:** six 2018 posts (EN + FR) say "click here" for a link to the site's homepage. The link now works (the importer rewrites the old mirror URL to `/`), but Lighthouse flags non-descriptive link text on those posts (SEO score 92). This is an editorial fix in the CMS.
2. **Search Console:** submit `/sitemap.xml` after cutover and watch Coverage and 404s. Add any missing redirect in **CMS → Redirects**.
3. **Performance:** see QA_REPORT.md. Measure Core Web Vitals in the field after launch.
4. **Content quality:** the inherited French machine translations and typos are listed in MIGRATION_REPORT.md.
