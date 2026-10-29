# SEO baseline: spotlightnigeria-france.com (WordPress)

Crawled on 29 October 2026 with `scripts/audit/crawl-live.cjs`: 304 URLs, sequential requests, read-only. The raw data is in [`seo/live-crawl-2026-10-29.csv`](seo/live-crawl-2026-10-29.csv), with `live-robots.txt` and `live-sitemap-urls.txt`.

**Not available:** Search Console data (performance, coverage, links). No authorised access was provided, so current rankings, top queries and top landing pages are unknown. **Owner action:** export *Performance → Pages* (last 12 months) and *Indexing → Pages* from Search Console before cutover, and keep them as the "before" baseline.

## Platform

- WordPress 7.1.4, theme SeatEvent with Elementor / Elementor Pro, Slider Revolution, TranslatePress (FR under `/fr/`), Yoast SEO, LiteSpeed Cache.
- Hosted on Hostinger.
- `http://` → `https://` and `www` → apex both 301. `/index.php` 301s to `/`.

## Indexing controls

- **robots.txt** (Yoast) allows everything and declares `Sitemap: https://spotlightnigeria-france.com/sitemap_index.xml`.
- **Sitemaps:** `sitemap_index.xml` has 11 child sitemaps and 136 URLs, **all English**. There are no `/fr/` URLs and no hreflang in the sitemaps. `/sitemap.xml` and `/wp-sitemap.xml` 301 to the index.
- **47 of the 136 sitemap URLs are not useful:**
  - 13 `/events/*` and 7 `/events_cat/*` pages return **HTTP 500**;
  - 27 `/hf_template/*` Elementor templates 301 to the homepage.
- **noindex:** only date archives and search results.
- **Indexable thin or demo URLs:**
  - the author archive;
  - `/category/uncategorized/`;
  - the `schedule-*` demo pages and the demo speakers `ralph-edwards` / `ralph-edwards-2`;
  - the demo organizers.

## Page-level metadata

| Item | Finding |
|---|---|
| `<title>` | Present everywhere. 90 of 95 French pages use the **English** title |
| Meta description | **Missing on all 192 HTML pages** |
| Canonical | Self-referencing, https, trailing slash. Paginated `/press-releases/page/2/` canonicalises to page 1 |
| hreflang | `en-US`, `fr-FR`, `en`, `fr` on every page, reciprocal. **No `x-default`** |
| `html lang` | `en-US` / `fr-FR` (correct) |
| Open Graph | `og:title` and `og:type` present. `og:image` **missing on 125 of 192 pages**. 10 pages point `og:image` at the old server IP `172.104.245.184` |
| Twitter | `summary_large_image` |
| H1 | 35 pages do not have exactly one H1: speaker pages have 2 identical H1s, `/digital-conference/` has 3, `/registration/` has 0 |
| Image alt text | 1,690 of 3,553 `<img>` have no `alt` |
| Structured data | Yoast graph: `WebSite`, `WebPage`/`CollectionPage`/`ProfilePage`, `BreadcrumbList`, `Article` (posts), `Person`, `ImageObject`, `FAQPage` (2 pages). No `Organization` or `Event` schema. No parse errors |

## URL behaviour

- No trailing-slash normalisation: `/registration` and `/fr` return 200 (duplicates, with a canonical).
- Uppercase paths also return 200 as duplicates.
- Unknown URLs return a real 404 in both languages.
- WordPress feeds (`/feed/`, `/fr/feed/`, `/comments/feed/`), `/wp-json/`, `/?s=` search and `/page/2/` all return 200.
- `/new/sponsorship-registration/` 301s to `/sponsorship-registration/` and is linked from the homepage.
- Navigation and footer links use `http://` on every page, which adds an extra 301 to every click.

## Tracking and verification (public values)

- Google tag **`GT-PJSNCJK7`**, loaded by Site Kit (gtag.js).
- `google-site-verification` meta tag: **`QNamKEFAiD7r3qW-Mp0yOL3ceJqIYb835GCD_8MQwc4`**. If Search Console uses this method, the same value must be set in **CMS → Settings → SEO** before DNS cutover, otherwise ownership verification is lost.
- There is no GTM container, Meta pixel, Hotjar or Clarity. reCAPTCHA (contact form) and the Weezevent widget (tickets) are third parties.

## Exposure noted (not SEO, reported to the owner)

- `/wp-json/wp/v2/users` lists the user slug `blueinctech`.
- `/readme.html` and `/license.txt` are public, and the generator meta reveals plugin versions.
- `wp-content/uploads/2022/11/attendee_list-13.csv` is publicly downloadable (found in the original audit).
