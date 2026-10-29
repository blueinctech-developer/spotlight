# Migration report

Last import: 28 October 2026 (`migration/report.json`). Reconciled against the live site on 29 October 2026 with `scripts/migration/reconcile.ts --live` and a full URL replay (see SEO_MIGRATION_REPORT.md). Database: local PostgreSQL holding the import. The production import has not been run yet; it needs production credentials.

## Source vs destination counts

| Content | WordPress (live) | New CMS | Status |
|---|---|---|---|
| Posts | 20 (REST) | 20 EN + 20 FR, all published | ✅ Complete. FR versions come from TranslatePress's rendered `/fr/` pages |
| Pages | 17 (REST) | 12 EN + 12 FR | ✅ The 5 others are theme demo pages (`schedule-list`, `schedule-horizontal-tab`, `schedule-timeline`, `digital-conference`, `education-webinar`), redirected to real pages |
| Categories | 10 (REST) | 9 | ✅ `uncategorized` (empty default) not imported; its URL returns 410 |
| Tags | 26 (REST) | 26 | ✅ |
| Speakers | 16 sitemap URLs | 13 | ✅ 16 = archive + 2 demo speakers (`ralph-edwards`, `ralph-edwards-2`, redirected) + 13 real speakers |
| Partners / sponsors | logo galleries on home | 64 partner records | ✅ One record per unique logo file; logos are the original files in the original order |
| Testimonials | 3 (slider) | 3 (EN + FR quotes) | ✅ |
| Events | 2023 schedule (hidden widget), hidden programme agenda, current edition | 3 events, 32 sessions | ✅ The hidden agenda is kept as a draft |
| Menus | header, 3 footer columns, legal (EN + FR) | 10 menus, 46 items | ✅ |
| Media | 741 library items (REST, 29 Oct) | 111 files | ⚠️ Every image or document **used on a page** is migrated (at original resolution). About 630 library items that no page uses were not migrated |
| Featured images on posts | 4 of 20 posts have one | 4 of 20 | ✅ Same as the source |
| Form entries, subscribers, users | database only | — | ⛔ Needs a WordPress database export (see MIGRATION_PLAN.md) |

## Known content gaps (inherited from the source)

- **7 speaker portraits** are missing: Etienne Giros, Valor Iduh, Juliana Olayinka, Adebowale Adeyeye, Yves Battesti, Damien de la Rocque and Oluwajoba Oloba.
  - The files the live site references (for example `/wp-content/uploads/2022/11/Etienne-GIROS.jpg`) return **404 on the live server too**.
  - The new site shows the speaker's initials instead of a broken image.
  - **Owner action:** supply the original photos, then upload them in **Speakers**.
- **20 inline images in the 2018 posts** pointed to an old hosting IP (`172.104.245.184`) and are unavailable on every server. They were removed from the post bodies and listed in `report.json`.
  - Links to the site through that dead mirror (six 2018 posts, EN + FR) are now rewritten by the importer to the site's own URL. Fixed in this audit; verified by the link check.
- **Report download PDF:** the document delivered after the "Previous editions" form was configured inside Elementor and is not public. Attach it to the form block in the CMS.
- **French translations** are TranslatePress's machine translations, preserved as-is (for example "Maison" for Home).
  - French `<title>`s were English on WordPress (90 of 95 FR pages) and still are. Titles now follow the CMS page title, which editors can translate.
- **Typos and inconsistencies kept from the original**, for editors to correct:
  - "EHIBITIONS", "Spolight", "Goverment";
  - the About page shows both Tue 6 and Wed 7 October;
  - "contact @friendsofnigeria.net".

## Relationships and links

- **Translations:** each EN record and its FR counterpart share a `translationGroup`. hreflang alternates are generated from that group (verified on pages, posts, speakers and archives).
- **Inline images:** rewritten to `/media/…`. `MediaUsage` is rebuilt for every record, so media still in use cannot be deleted.
- **Internal links:** `scripts/audit/check-links.cjs` crawled 163 pages and 241 internal URLs and found 0 broken links, 0 links that redirect, and 0 links to the old host or IP.
  - Every old URL resolves in at most one hop (no chains): 241 URLs at 200, theme templates at 410, demo content redirected to a relevant page.
  - This audit also fixed a legacy link path (`/new/sponsorship-registration/`) in the importer.
- **Partner logos:** compared one by one with the live site (previous session). They are the same files in the same groups and order.

## Repeatability

Re-running `npm run migrate:import` on 28 October updated existing records:
- 24 pages, 40 posts, 110 media, 61 partners, 13 speakers, 3 testimonials, 9 categories and 26 tags;
- no duplicates were created;
- menus and settings were skipped because they had already been configured.

See `migration/report.json`.
