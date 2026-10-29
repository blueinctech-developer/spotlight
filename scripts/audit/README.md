# Audit tools

These Node scripts produced the evidence in `docs/SEO_BASELINE.md`, `docs/SEO_MIGRATION_REPORT.md` and `docs/REDIRECT_MAP.csv`. All of them are read-only.

| Script | What it does | Usage |
|---|---|---|
| `crawl-live.cjs` | Crawls the live WordPress site politely: robots.txt, sitemaps, the EN/FR URLs, status codes, titles, meta tags, canonical, hreflang, H1 count, JSON-LD types and image alt text | `node scripts/audit/crawl-live.cjs <outDir>` |
| `compare-urls.cjs` | Replays every crawled URL against the new site and records the status, redirect chain, title, H1, description, canonical and JSON-LD | `node scripts/audit/compare-urls.cjs <outDir>/baseline.json <outDir> [baseUrl]` |
| `redirect-map.cjs` | Turns the comparison into `docs/REDIRECT_MAP.csv` | `node scripts/audit/redirect-map.cjs <outDir>/compare.json docs/REDIRECT_MAP.csv` |
| `check-links.cjs` | Crawls the new site (`http://localhost:3100`) and checks every internal link and image, and any link still pointing at the old host | `node scripts/audit/check-links.cjs` |

Content reconciliation (database counts against the WordPress REST API) is in `scripts/migration/reconcile.ts`.

On Git Bash for Windows, prefix the commands with `MSYS_NO_PATHCONV=1` so that URL paths such as `/about/` are not rewritten into Windows paths.
