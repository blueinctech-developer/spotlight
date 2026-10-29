# Content migration (WordPress → Spotlight CMS)

The migration is repeatable and **read-only towards WordPress**: it never logs in to WordPress and never changes anything there.

## Source data actually used

| Source | Obtained? | Used for |
|---|---|---|
| WordPress REST API (`/wp-json/wp/v2`) | ✅ public | 20 posts, 17 pages (metadata), 599 media records, 10 categories, 26 tags |
| Rendered HTML, EN + FR (TranslatePress) | ✅ public, crawled from the Yoast sitemaps | Elementor page content, speakers, testimonials, partner logos, menus, footer, French translations |
| Elementor per-page CSS | ✅ public | Background images (hero, banners, sponsorship photo) |
| WordPress database or WXR export | ❌ not provided | — |
| Elementor form submission history, WPForms entries | ❌ need admin access | Not migrated |
| TranslatePress string tables | ❌ need database | French was taken from the rendered `/fr/` pages instead (equivalent for visible content) |

Because no database export was available, **content that is only stored in the WordPress database was not migrated**:
- form submissions and newsletter subscribers;
- WordPress user accounts;
- drafts and private posts;
- unattached media that never appears on a page.

If you can provide an export later, the importer can be extended to read it.

## How to run

```sh
npm run migrate:fetch    # downloads REST JSON, EN/FR HTML and Elementor CSS into migration/cache/
npm run migrate:import   # imports into the database configured in DATABASE_URL
```

- **Idempotent**: every record is matched on a stable key (WordPress id → `translationGroup` `wp-page-<id>` / `wp-post-<id>`, slug, original media URL), so running the import again updates records instead of duplicating them.
- **Protects CMS edits**: a page or post that has been saved in the CMS (it has an editor-authored revision) is skipped. Menus and settings that already exist are skipped too. To force everything back to the WordPress content, run with `MIGRATE_OVERWRITE=1`.
- **Media**:
  - Media is downloaded at the best available resolution. Resized variants (`-300x200`), `-scaled` copies and Elementor thumbnails are mapped back to their original files.
  - Files are stored under `uploads/YYYY/MM/<name>`.
  - Each file is registered in the media library with the alt text and caption from WordPress.
  - Inline images in posts are rewritten to the new URLs.
  - `MediaUsage` is rebuilt for each imported record.
- **Report**: written to `migration/report.json` (counts, warnings, missing media, skipped records).

## Mapping

| WordPress | New CMS |
|---|---|
| Pages (Elementor) | `Page` with typed blocks. The home, about, programme, registration, get-in-touch, previous-editions, sponsorship-registration, press-registration, press-releases, gallery and privacy-policy pages each have a hand-written mapping that reproduces their sections. `2023-programme2` is converted generically (headings, text, images and columns). |
| French pages (`/fr/…`) | Separate `Page` rows in the same `translationGroup`. They are built by the **same** mapping code from the French HTML, because TranslatePress keeps the DOM identical. |
| Posts + categories/tags | `Post` (EN and FR), `Category`, `Tag`. French category and tag names come from the French archive pages. |
| Speakers (CPT, not in REST) | `Speaker`, built from the speaker archive pages and single speaker pages. The demo speakers `ralph-edwards` and `ralph-edwards-2` are excluded. |
| Home "jws_events_schedule" (hidden, 2023) | `Event` "Spotlight Nigeria 2023" (archived) with its sessions. Speakers are linked by name. |
| Agenda hidden on `/programme/` | `Event` "Programme agenda (hidden on WordPress)", status **DRAFT**, kept for the editors |
| Current edition (hero/about) | `Event` "Spotlight Nigeria 2026", current, 6 Oct 2026 |
| Partner logo galleries | `Partner` records, one per unique logo file, referenced by `partners` blocks. Hidden galleries are kept in a hidden block. |
| Testimonial slider | `Testimonial` (EN + FR quotes) |
| Header, footer, legal menus | `Menu` and `MenuItem` (EN + FR). Page links are stored by translation group. |
| Footer CTA, credits, contact, social links | `Setting` documents |
| Theme demo content (events, organizers, schedule demo pages, `hf_template`) | Not imported. Their URLs redirect (see `MIGRATION_MAP.md`). |

## Known gaps and decisions

- **2018 post images missing**: 20 inline images in the 2018 posts point to the old hosting IP (`172.104.245.184`) and do not exist on the current server either. They are listed in the report and were removed from the post bodies. If the originals can be found, upload them and edit the posts.
- **Report download PDF**: on WordPress, the PDF delivery was configured inside Elementor and is not visible publicly. Attach the PDF to the form block on *Previous Editions*; until then the form saves submissions but offers no download.
- **Nigerian/African registration**: on WordPress this button opened a popup containing a Google Form. It now links directly to the same Google Form, in a new tab.
- **Press registration**: kept as the embedded Google Form, the same as the live site. The hidden "closed" Elementor form is preserved as a hidden block.
- **French "success" messages and a few new UI strings** (cookie banner, 404, search) are new text that did not exist on WordPress. They are marked for review in `QA_REPORT.md`.
- **Unchanged content**: typos and inconsistencies on the live site were left as-is, for example "EHIBITIONS", "Spolight", "Goverment", the About page date showing both Tue 6 and Wed 7 Oct, and the email address shown with a space. Editors can now fix them in the CMS.
- **Do not migrate**: `wp-content/uploads/2022/11/attendee_list-13.csv` is publicly downloadable on the live site and appears to contain personal data. It was not migrated; the site owner should delete it from WordPress now.
