# Migration plan (WordPress → Spotlight CMS)

This is the repeatable procedure for moving content from the live WordPress site into the new application, including the final catch-up at cutover. The content mapping (which WordPress structure becomes which CMS record) is in [CONTENT_MIGRATION.md](CONTENT_MIGRATION.md). The results of the latest run are in [MIGRATION_REPORT.md](MIGRATION_REPORT.md).

## Principles

- **WordPress is read-only.** The scripts only make public HTTP GET requests (REST API, rendered EN/FR pages, Elementor CSS, media files). They never log in, never write and never delete. WordPress stays online and untouched until the owner approves retirement.
- **Idempotent.** Every record is matched on a stable key: WordPress id → `translationGroup`, slug, or original media URL. Re-running updates records instead of duplicating them.
- **CMS edits win.** A page or post saved in the CMS (it has an editor revision), and menus or settings that already exist, are skipped. `MIGRATE_OVERWRITE=1` forces a full re-import; use it only before editors start working.
- **Media at full quality.** Resized variants and `-scaled` copies are mapped back to the original upload.

## Steps

| # | Step | Command | Writes to |
|---|---|---|---|
| 1 | Download the source (REST JSON, EN/FR HTML, Elementor CSS) into `migration/cache/` | `npm run migrate:fetch` | local cache only |
| 2 | Import pages, posts, translations, taxonomies, media, menus, speakers, partners, testimonials, events and settings | `npm run migrate:import` | database in `DATABASE_URL`, storage configured by `STORAGE_DRIVER` |
| 3 | Read the report: counts, warnings, missing media, skipped records | `migration/report.json` | — |
| 4 | Reconcile against the live site (read-only) | `npx tsx --conditions=react-server scripts/migration/reconcile.ts --live` | — |
| 5 | URL and SEO comparison: replay every live URL against the new site and compare status, redirect target, title, H1, canonical and description | see SEO_MIGRATION_REPORT.md › Method | — |
| 6 | Editorial review in the CMS: French copy, partner names, typos kept from the original | CMS | database |

## Changes made on WordPress after the import

A single import does not capture later edits. Before cutover:

1. Freeze content changes on WordPress, and tell the editors.
2. Check what changed since the last import. `reconcile.ts --live` prints current WordPress totals. The REST API also exposes `modified` dates, for example `/wp-json/wp/v2/pages?orderby=modified&order=desc`.
3. Run steps 1–2 again. New WordPress content is imported. Content already edited in the CMS is kept; copy WordPress changes to those records by hand, with the CMS revision history as a safety net.
4. Run steps 3–5 again and compare with the previous report.

As of 29 October 2026, WordPress's most recently modified pages are `programme` and `about` (30 September 2026), and its newest media is from 6 March 2026. Both are older than the import on 28 October 2026, so there is **no delta** at the time of this audit.

## Not migratable without additional access

These are stored only in the WordPress database, so they need a database export or administrator access:
- Elementor/WPForms form entries;
- newsletter subscribers;
- WordPress users;
- drafts and private posts;
- TranslatePress string tables;
- media library files that no page uses (about 630 of 741 library items).

If they are needed, the owner should provide a database export (`.sql`) or a WXR export (Tools → Export). The importer can then be extended to read them.

## Production run

1. Run against the production database and bucket from a trusted machine that has the production environment variables (DEPLOYMENT.md §4).
2. Take a database backup first.
3. Media goes into the S3/R2 bucket, not the server's disk.
