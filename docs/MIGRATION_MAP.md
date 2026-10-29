# Spotlight Nigeria – URL Migration Map (WordPress → Next.js)

Companion to `docs/WEBSITE_AUDIT.md`. This file lists every old URL that was discovered: the Yoast sitemaps, the crawl of those URLs plus their `/fr/` variants, URLs linked internally, and live spot checks. Each URL is mapped to a route in the new Next.js app.

## Routing rules in the new app

The URL structure is preserved exactly, with trailing slashes.

| Content | Route |
|---|---|
| Pages | `/<slug>/`; home is `/` |
| French | `/fr/<same path>/`; FR home is `/fr/` |
| Posts | `/<post-slug>/` |
| Speakers | `/speakers/` and `/speakers/<slug>/` |
| Categories / tags | `/category/<slug>/` and `/tag/<slug>/` |
| Date archives | `/YYYY/`, `/YYYY/MM/`, `/YYYY/MM/DD/` |
| Author | `/author/<slug>/` |
| Pagination | `/…/page/N/`, where `N ≥ 2`. `/page/1/` 301s to the base URL, as on the live site |

## Action legend

| Action | Meaning |
|---|---|
| **Recreate** | Current, real content |
| **Recreate (archived/historical)** | Real but past content: 2018–2023 press releases, the 2023 programme, 2023 speakers, archives |
| **Redirect 301 → X** | Demo content with no value, broken (HTTP 500) URLs, slash or legacy variants. X is always the most relevant page, never a blanket homepage redirect. The only redirect to `/` is the page-slug alias `/home/` |
| **Drop (410)** | Internal theme templates (`/hf_template/*`) and the empty Uncategorized archive. Serve `410 Gone` and keep them out of the sitemap |
| **No route (keep 404)** | Already 404 on the live site |

## Notes

- `(demo)` marks content verified as SeatEvent theme sample data. See WEBSITE_AUDIT.md §2.1.
- **Old status** is the live status observed in the crawl. Redirect targets assume that the target route exists in the new app.
- Pagination counts after the migration:
  - `/speakers/` still has 3 pages at 6 per page once the 2 demo speakers are removed (13 real).
  - `/press-releases/` has 2 pages on the live site (11 + 9 items).
  - Blog archives use 6 per page.

  If the new app changes `per_page`, add redirects for any `page/N/` URLs that disappear.
- `/fr/hf_template/*` URLs were not crawled individually. A sample (`/fr/hf_template/footer/`) 301s to `/`. The rule `/fr/hf_template/:slug/` → 410 covers them.
- Infrastructure:
  - The new app must generate its own `/sitemap.xml` (or keep `/sitemap_index.xml`) and `/robots.txt`.
  - Old `/*-sitemap.xml` files can 301 to the new sitemap.
  - `/feed/` URLs: recreate an RSS feed or 301 them to `/press-releases/`.
  - `/wp-json/*`, `/wp-login.php` and `/wp-admin/*`: 410.
  - Keep `/wp-content/uploads/*` paths working, either by hosting the assets at the same paths or via a rewrite, because posts, Google results and OG tags reference them.

## URL map

| Old URL | Lang | Old status | New route | Action | Status |
|---|---|---|---|---|---|
| `/` | EN | 200 | `/` | Recreate | Implemented |
| `/fr/` | FR | 200 | `/fr/` | Recreate | Implemented |
| `/2023-programme2/` | EN | 200 | `/2023-programme2/` | Recreate (archived/historical) | Implemented |
| `/fr/2023-programme2/` | FR | 200 | `/fr/2023-programme2/` | Recreate (archived/historical) | Implemented |
| `/about/` | EN | 200 | `/about/` | Recreate | Implemented |
| `/fr/about/` | FR | 200 | `/fr/about/` | Recreate | Implemented |
| `/digital-conference/` | EN | 200 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/digital-conference/` | FR | 200 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/education-webinar/` | EN | 200 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/education-webinar/` | FR | 200 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/gallery/` | EN | 200 | `/gallery/` | Recreate | Implemented |
| `/fr/gallery/` | FR | 200 | `/fr/gallery/` | Recreate | Implemented |
| `/get-in-touch/` | EN | 200 | `/get-in-touch/` | Recreate | Implemented |
| `/fr/get-in-touch/` | FR | 200 | `/fr/get-in-touch/` | Recreate | Implemented |
| `/press-registration/` | EN | 200 | `/press-registration/` | Recreate | Implemented |
| `/fr/press-registration/` | FR | 200 | `/fr/press-registration/` | Recreate | Implemented |
| `/press-releases/` | EN | 200 | `/press-releases/` | Recreate | Implemented |
| `/fr/press-releases/` | FR | 200 | `/fr/press-releases/` | Recreate | Implemented |
| `/previous-editions/` | EN | 200 | `/previous-editions/` | Recreate | Implemented |
| `/fr/previous-editions/` | FR | 200 | `/fr/previous-editions/` | Recreate | Implemented |
| `/privacy-policy/` | EN | 200 | `/privacy-policy/` | Recreate | Implemented |
| `/fr/privacy-policy/` | FR | 200 | `/fr/privacy-policy/` | Recreate | Implemented |
| `/programme/` | EN | 200 | `/programme/` | Recreate | Implemented |
| `/fr/programme/` | FR | 200 | `/fr/programme/` | Recreate | Implemented |
| `/registration/` | EN | 200 | `/registration/` | Recreate | Implemented |
| `/fr/registration/` | FR | 200 | `/fr/registration/` | Recreate | Implemented |
| `/schedule-horizontal-tab/` | EN | 200 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/schedule-horizontal-tab/` | FR | 200 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/schedule-list/` | EN | 200 | `/2023-programme2/` | Redirect 301 → /2023-programme2/ (demo) | Implemented |
| `/fr/schedule-list/` | FR | 200 | `/fr/2023-programme2/` | Redirect 301 → /fr/2023-programme2/ (demo) | Implemented |
| `/schedule-timeline/` | EN | 200 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/schedule-timeline/` | FR | 200 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/sponsorship-registration/` | EN | 200 | `/sponsorship-registration/` | Recreate | Implemented |
| `/fr/sponsorship-registration/` | FR | 200 | `/fr/sponsorship-registration/` | Recreate | Implemented |
| `/home/` | EN | 301 → / (live check) | `/` | Redirect 301 → / | Implemented |
| `/fr/home/` | FR | 301 → /fr/ (live check) | `/fr/` | Redirect 301 → /fr/ | Implemented |
| `/ccef-nigeria-qa-session-with-french-companies-and-investors-interested-in-nigeria/` | EN | 200 | `/ccef-nigeria-qa-session-with-french-companies-and-investors-interested-in-nigeria/` | Recreate (archived/historical) | Implemented |
| `/fr/ccef-nigeria-qa-session-with-french-companies-and-investors-interested-in-nigeria/` | FR | 200 | `/fr/ccef-nigeria-qa-session-with-french-companies-and-investors-interested-in-nigeria/` | Recreate (archived/historical) | Implemented |
| `/covid-19-information-the-5th-edition-of-spotlight-nigeria-moved-to-2021/` | EN | 200 | `/covid-19-information-the-5th-edition-of-spotlight-nigeria-moved-to-2021/` | Recreate (archived/historical) | Implemented |
| `/fr/covid-19-information-the-5th-edition-of-spotlight-nigeria-moved-to-2021/` | FR | 200 | `/fr/covid-19-information-the-5th-edition-of-spotlight-nigeria-moved-to-2021/` | Recreate (archived/historical) | Implemented |
| `/education-key-to-fostering-long-term-relations-between-nigeria-and-france/` | EN | 200 | `/education-key-to-fostering-long-term-relations-between-nigeria-and-france/` | Recreate (archived/historical) | Implemented |
| `/fr/education-key-to-fostering-long-term-relations-between-nigeria-and-france/` | FR | 200 | `/fr/education-key-to-fostering-long-term-relations-between-nigeria-and-france/` | Recreate (archived/historical) | Implemented |
| `/fon-roundtable-on-harnessing-the-entrepreneurial-potential-of-the-nigerian-diaspora-in-europe/` | EN | 200 | `/fon-roundtable-on-harnessing-the-entrepreneurial-potential-of-the-nigerian-diaspora-in-europe/` | Recreate (archived/historical) | Implemented |
| `/fr/fon-roundtable-on-harnessing-the-entrepreneurial-potential-of-the-nigerian-diaspora-in-europe/` | FR | 200 | `/fr/fon-roundtable-on-harnessing-the-entrepreneurial-potential-of-the-nigerian-diaspora-in-europe/` | Recreate (archived/historical) | Implemented |
| `/france-to-boost-agribusiness-ties-in-nigeria/` | EN | 200 | `/france-to-boost-agribusiness-ties-in-nigeria/` | Recreate (archived/historical) | Implemented |
| `/fr/france-to-boost-agribusiness-ties-in-nigeria/` | FR | 200 | `/fr/france-to-boost-agribusiness-ties-in-nigeria/` | Recreate (archived/historical) | Implemented |
| `/nigerian-creative-arts-exchange-takes-paris/` | EN | 200 | `/nigerian-creative-arts-exchange-takes-paris/` | Recreate (archived/historical) | Implemented |
| `/fr/nigerian-creative-arts-exchange-takes-paris/` | FR | 200 | `/fr/nigerian-creative-arts-exchange-takes-paris/` | Recreate (archived/historical) | Implemented |
| `/opportunities-in-the-european-economy-for-nigerian-companies/` | EN | 200 | `/opportunities-in-the-european-economy-for-nigerian-companies/` | Recreate (archived/historical) | Implemented |
| `/fr/opportunities-in-the-european-economy-for-nigerian-companies/` | FR | 200 | `/fr/opportunities-in-the-european-economy-for-nigerian-companies/` | Recreate (archived/historical) | Implemented |
| `/plenary-session-1-opening-plenary/` | EN | 200 | `/plenary-session-1-opening-plenary/` | Recreate (archived/historical) | Implemented |
| `/fr/plenary-session-1-opening-plenary/` | FR | 200 | `/fr/plenary-session-1-opening-plenary/` | Recreate (archived/historical) | Implemented |
| `/plenary-session-five-real-estate-hospitality-and-construction/` | EN | 200 | `/plenary-session-five-real-estate-hospitality-and-construction/` | Recreate (archived/historical) | Implemented |
| `/fr/plenary-session-five-real-estate-hospitality-and-construction/` | FR | 200 | `/fr/plenary-session-five-real-estate-hospitality-and-construction/` | Recreate (archived/historical) | Implemented |
| `/plenary-session-four-agribusiness-and-fast-moving-consumer-goods/` | EN | 200 | `/plenary-session-four-agribusiness-and-fast-moving-consumer-goods/` | Recreate (archived/historical) | Implemented |
| `/fr/plenary-session-four-agribusiness-and-fast-moving-consumer-goods/` | FR | 200 | `/fr/plenary-session-four-agribusiness-and-fast-moving-consumer-goods/` | Recreate (archived/historical) | Implemented |
| `/plenary-session-six-digital-and-technology-taking-part-in-the-nigerian-silicon-valley-story-opportunities-for-foreign-investments-knowledge-sharing-and-strategic-partnerships/` | EN | 200 | `/plenary-session-six-digital-and-technology-taking-part-in-the-nigerian-silicon-valley-story-opportunities-for-foreign-investments-knowledge-sharing-and-strategic-partnerships/` | Recreate (archived/historical) | Implemented |
| `/fr/plenary-session-six-digital-and-technology-taking-part-in-the-nigerian-silicon-valley-story-opportunities-for-foreign-investments-knowledge-sharing-and-strategic-partnerships/` | FR | 200 | `/fr/plenary-session-six-digital-and-technology-taking-part-in-the-nigerian-silicon-valley-story-opportunities-for-foreign-investments-knowledge-sharing-and-strategic-partnerships/` | Recreate (archived/historical) | Implemented |
| `/plenary-session-three-creative-industry/` | EN | 200 | `/plenary-session-three-creative-industry/` | Recreate (archived/historical) | Implemented |
| `/fr/plenary-session-three-creative-industry/` | FR | 200 | `/fr/plenary-session-three-creative-industry/` | Recreate (archived/historical) | Implemented |
| `/plenary-session-two-energy-power/` | EN | 200 | `/plenary-session-two-energy-power/` | Recreate (archived/historical) | Implemented |
| `/fr/plenary-session-two-energy-power/` | FR | 200 | `/fr/plenary-session-two-energy-power/` | Recreate (archived/historical) | Implemented |
| `/president-macron-to-visit-nigeria-strengthening-business-ties-between-france-and-nigeria/` | EN | 200 | `/president-macron-to-visit-nigeria-strengthening-business-ties-between-france-and-nigeria/` | Recreate (archived/historical) | Implemented |
| `/fr/president-macron-to-visit-nigeria-strengthening-business-ties-between-france-and-nigeria/` | FR | 200 | `/fr/president-macron-to-visit-nigeria-strengthening-business-ties-between-france-and-nigeria/` | Recreate (archived/historical) | Implemented |
| `/spotlight-nigeria-2018-the-diaspora-effect/` | EN | 200 | `/spotlight-nigeria-2018-the-diaspora-effect/` | Recreate (archived/historical) | Implemented |
| `/fr/spotlight-nigeria-2018-the-diaspora-effect/` | FR | 200 | `/fr/spotlight-nigeria-2018-the-diaspora-effect/` | Recreate (archived/historical) | Implemented |
| `/spotlight-nigeria-2018-will-highlight-investment-opportunities-between-franco-nigerian-investors/` | EN | 200 | `/spotlight-nigeria-2018-will-highlight-investment-opportunities-between-franco-nigerian-investors/` | Recreate (archived/historical) | Implemented |
| `/fr/spotlight-nigeria-2018-will-highlight-investment-opportunities-between-franco-nigerian-investors/` | FR | 200 | `/fr/spotlight-nigeria-2018-will-highlight-investment-opportunities-between-franco-nigerian-investors/` | Recreate (archived/historical) | Implemented |
| `/spotlight-nigeria-2018/` | EN | 200 | `/spotlight-nigeria-2018/` | Recreate (archived/historical) | Implemented |
| `/fr/spotlight-nigeria-2018/` | FR | 200 | `/fr/spotlight-nigeria-2018/` | Recreate (archived/historical) | Implemented |
| `/spotlight-nigeria-investment-forum/` | EN | 200 | `/spotlight-nigeria-investment-forum/` | Recreate (archived/historical) | Implemented |
| `/fr/spotlight-nigeria-investment-forum/` | FR | 200 | `/fr/spotlight-nigeria-investment-forum/` | Recreate (archived/historical) | Implemented |
| `/strengthening-franco-nigerian-ties-through-nigerian-cinema/` | EN | 200 | `/strengthening-franco-nigerian-ties-through-nigerian-cinema/` | Recreate (archived/historical) | Implemented |
| `/fr/strengthening-franco-nigerian-ties-through-nigerian-cinema/` | FR | 200 | `/fr/strengthening-franco-nigerian-ties-through-nigerian-cinema/` | Recreate (archived/historical) | Implemented |
| `/there-is-a-way-of-doing-business-in-nigeria-alec-fokapu/` | EN | 200 | `/there-is-a-way-of-doing-business-in-nigeria-alec-fokapu/` | Recreate (archived/historical) | Implemented |
| `/fr/there-is-a-way-of-doing-business-in-nigeria-alec-fokapu/` | FR | 200 | `/fr/there-is-a-way-of-doing-business-in-nigeria-alec-fokapu/` | Recreate (archived/historical) | Implemented |
| `/speakers/` | EN | 200 | `/speakers/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/` | FR | 200 | `/fr/speakers/` | Recreate (archived/historical) | Implemented |
| `/speakers/adebowale-adeyeye/` | EN | 200 | `/speakers/adebowale-adeyeye/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/adebowale-adeyeye/` | FR | 200 | `/fr/speakers/adebowale-adeyeye/` | Recreate (archived/historical) | Implemented |
| `/speakers/amb-tunde-mustapha/` | EN | 200 | `/speakers/amb-tunde-mustapha/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/amb-tunde-mustapha/` | FR | 200 | `/fr/speakers/amb-tunde-mustapha/` | Recreate (archived/historical) | Implemented |
| `/speakers/arnaud-floris/` | EN | 200 | `/speakers/arnaud-floris/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/arnaud-floris/` | FR | 200 | `/fr/speakers/arnaud-floris/` | Recreate (archived/historical) | Implemented |
| `/speakers/damien-de-la-rocque/` | EN | 200 | `/speakers/damien-de-la-rocque/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/damien-de-la-rocque/` | FR | 200 | `/fr/speakers/damien-de-la-rocque/` | Recreate (archived/historical) | Implemented |
| `/speakers/dr-steve-ogidan-mni/` | EN | 200 | `/speakers/dr-steve-ogidan-mni/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/dr-steve-ogidan-mni/` | FR | 200 | `/fr/speakers/dr-steve-ogidan-mni/` | Recreate (archived/historical) | Implemented |
| `/speakers/etienne-giros/` | EN | 200 | `/speakers/etienne-giros/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/etienne-giros/` | FR | 200 | `/fr/speakers/etienne-giros/` | Recreate (archived/historical) | Implemented |
| `/speakers/hon-abike-dabiri-erewa-oon/` | EN | 200 | `/speakers/hon-abike-dabiri-erewa-oon/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/hon-abike-dabiri-erewa-oon/` | FR | 200 | `/fr/speakers/hon-abike-dabiri-erewa-oon/` | Recreate (archived/historical) | Implemented |
| `/speakers/juliana-olayinka/` | EN | 200 | `/speakers/juliana-olayinka/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/juliana-olayinka/` | FR | 200 | `/fr/speakers/juliana-olayinka/` | Recreate (archived/historical) | Implemented |
| `/speakers/olanrewaju-boluwaji/` | EN | 200 | `/speakers/olanrewaju-boluwaji/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/olanrewaju-boluwaji/` | FR | 200 | `/fr/speakers/olanrewaju-boluwaji/` | Recreate (archived/historical) | Implemented |
| `/speakers/oluwajoba-oloba/` | EN | 200 | `/speakers/oluwajoba-oloba/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/oluwajoba-oloba/` | FR | 200 | `/fr/speakers/oluwajoba-oloba/` | Recreate (archived/historical) | Implemented |
| `/speakers/ralph-edwards-2/` | EN | 200 | `/speakers/` | Redirect 301 → /speakers/ (demo) | Implemented |
| `/fr/speakers/ralph-edwards-2/` | FR | 200 | `/fr/speakers/` | Redirect 301 → /fr/speakers/ (demo) | Implemented |
| `/speakers/ralph-edwards/` | EN | 200 | `/speakers/` | Redirect 301 → /speakers/ (demo) | Implemented |
| `/fr/speakers/ralph-edwards/` | FR | 200 | `/fr/speakers/` | Redirect 301 → /fr/speakers/ (demo) | Implemented |
| `/speakers/toyosi-ayodele/` | EN | 200 | `/speakers/toyosi-ayodele/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/toyosi-ayodele/` | FR | 200 | `/fr/speakers/toyosi-ayodele/` | Recreate (archived/historical) | Implemented |
| `/speakers/valor-iduh/` | EN | 200 | `/speakers/valor-iduh/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/valor-iduh/` | FR | 200 | `/fr/speakers/valor-iduh/` | Recreate (archived/historical) | Implemented |
| `/speakers/yves-battesti/` | EN | 200 | `/speakers/yves-battesti/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/yves-battesti/` | FR | 200 | `/fr/speakers/yves-battesti/` | Recreate (archived/historical) | Implemented |
| `/2018/09/page/1/` | EN | 301 → /2018/09/ | `/2018/09/` | Redirect 301 → /2018/09/ | Implemented |
| `/fr/2018/09/page/1/` | FR | 301 → /fr/2018/09/ | `/fr/2018/09/` | Redirect 301 → /fr/2018/09/ | Implemented |
| `/2018/09/page/2/` | EN | 200 | `/2018/09/page/2/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/09/page/2/` | FR | 200 | `/fr/2018/09/page/2/` | Recreate (archived/historical) | Implemented |
| `/2018/page/1/` | EN | 301 → /2018/ | `/2018/` | Redirect 301 → /2018/ | Implemented |
| `/fr/2018/page/1/` | FR | 301 → /fr/2018/ | `/fr/2018/` | Redirect 301 → /fr/2018/ | Implemented |
| `/2018/page/2/` | EN | 200 | `/2018/page/2/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/page/2/` | FR | 200 | `/fr/2018/page/2/` | Recreate (archived/historical) | Implemented |
| `/2018/page/3/` | EN | 200 | `/2018/page/3/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/page/3/` | FR | 200 | `/fr/2018/page/3/` | Recreate (archived/historical) | Implemented |
| `/author/blueinctech/page/1/` | EN | 301 → /author/blueinctech/ | `/author/blueinctech/` | Redirect 301 → /author/blueinctech/ | Implemented |
| `/fr/author/blueinctech/page/1/` | FR | 301 → /fr/author/blueinctech/ | `/fr/author/blueinctech/` | Redirect 301 → /fr/author/blueinctech/ | Implemented |
| `/author/blueinctech/page/2/` | EN | 200 | `/author/blueinctech/page/2/` | Recreate (archived/historical) | Implemented |
| `/fr/author/blueinctech/page/2/` | FR | 200 | `/fr/author/blueinctech/page/2/` | Recreate (archived/historical) | Implemented |
| `/author/blueinctech/page/3/` | EN | 200 | `/author/blueinctech/page/3/` | Recreate (archived/historical) | Implemented |
| `/fr/author/blueinctech/page/3/` | FR | 200 | `/fr/author/blueinctech/page/3/` | Recreate (archived/historical) | Implemented |
| `/author/blueinctech/page/4/` | EN | 200 | `/author/blueinctech/page/4/` | Recreate (archived/historical) | Implemented |
| `/fr/author/blueinctech/page/4/` | FR | 200 | `/fr/author/blueinctech/page/4/` | Recreate (archived/historical) | Implemented |
| `/category/press-release/page/1/` | EN | 301 → /category/press-release/ | `/category/press-release/` | Redirect 301 → /category/press-release/ | Implemented |
| `/fr/category/press-release/page/1/` | FR | 301 → /fr/category/press-release/ | `/fr/category/press-release/` | Redirect 301 → /fr/category/press-release/ | Implemented |
| `/category/press-release/page/2/` | EN | 200 | `/category/press-release/page/2/` | Recreate (archived/historical) | Implemented |
| `/fr/category/press-release/page/2/` | FR | 200 | `/fr/category/press-release/page/2/` | Recreate (archived/historical) | Implemented |
| `/category/press-release/page/3/` | EN | 200 | `/category/press-release/page/3/` | Recreate (archived/historical) | Implemented |
| `/fr/category/press-release/page/3/` | FR | 200 | `/fr/category/press-release/page/3/` | Recreate (archived/historical) | Implemented |
| `/category/press-release/page/4/` | EN | 200 | `/category/press-release/page/4/` | Recreate (archived/historical) | Implemented |
| `/fr/category/press-release/page/4/` | FR | 200 | `/fr/category/press-release/page/4/` | Recreate (archived/historical) | Implemented |
| `/category/spotlight-nigeria-2018/page/1/` | EN | 301 → /category/spotlight-nigeria-2018/ | `/category/spotlight-nigeria-2018/` | Redirect 301 → /category/spotlight-nigeria-2018/ | Implemented |
| `/fr/category/spotlight-nigeria-2018/page/1/` | FR | 301 → /fr/category/spotlight-nigeria-2018/ | `/fr/category/spotlight-nigeria-2018/` | Redirect 301 → /fr/category/spotlight-nigeria-2018/ | Implemented |
| `/category/spotlight-nigeria-2018/page/2/` | EN | 200 | `/category/spotlight-nigeria-2018/page/2/` | Recreate (archived/historical) | Implemented |
| `/fr/category/spotlight-nigeria-2018/page/2/` | FR | 200 | `/fr/category/spotlight-nigeria-2018/page/2/` | Recreate (archived/historical) | Implemented |
| `/press-releases/page/1/` | EN | 301 → /press-releases/ | `/press-releases/` | Redirect 301 → /press-releases/ | Implemented |
| `/fr/press-releases/page/1/` | FR | 301 → /fr/press-releases/ | `/fr/press-releases/` | Redirect 301 → /fr/press-releases/ | Implemented |
| `/press-releases/page/2/` | EN | 200 | `/press-releases/page/2/` | Recreate | Implemented |
| `/fr/press-releases/page/2/` | FR | 200 | `/fr/press-releases/page/2/` | Recreate | Implemented |
| `/speakers/page/1/` | EN | 301 → /speakers/ | `/speakers/` | Redirect 301 → /speakers/ | Implemented |
| `/fr/speakers/page/1/` | FR | 301 → /fr/speakers/ | `/fr/speakers/` | Redirect 301 → /fr/speakers/ | Implemented |
| `/speakers/page/2/` | EN | 200 | `/speakers/page/2/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/page/2/` | FR | 200 | `/fr/speakers/page/2/` | Recreate (archived/historical) | Implemented |
| `/speakers/page/3/` | EN | 200 | `/speakers/page/3/` | Recreate (archived/historical) | Implemented |
| `/fr/speakers/page/3/` | FR | 200 | `/fr/speakers/page/3/` | Recreate (archived/historical) | Implemented |
| `/tag/france-nigeria-partnership/page/1/` | EN | 301 → /tag/france-nigeria-partnership/ | `/tag/france-nigeria-partnership/` | Redirect 301 → /tag/france-nigeria-partnership/ | Implemented |
| `/fr/tag/france-nigeria-partnership/page/1/` | FR | 301 → /fr/tag/france-nigeria-partnership/ | `/fr/tag/france-nigeria-partnership/` | Redirect 301 → /fr/tag/france-nigeria-partnership/ | Implemented |
| `/tag/france-nigeria-partnership/page/2/` | EN | 200 | `/tag/france-nigeria-partnership/page/2/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/france-nigeria-partnership/page/2/` | FR | 200 | `/fr/tag/france-nigeria-partnership/page/2/` | Recreate (archived/historical) | Implemented |
| `/tag/spotlight-nigeria/page/1/` | EN | 301 → /tag/spotlight-nigeria/ | `/tag/spotlight-nigeria/` | Redirect 301 → /tag/spotlight-nigeria/ | Implemented |
| `/fr/tag/spotlight-nigeria/page/1/` | FR | 301 → /fr/tag/spotlight-nigeria/ | `/fr/tag/spotlight-nigeria/` | Redirect 301 → /fr/tag/spotlight-nigeria/ | Implemented |
| `/tag/spotlight-nigeria/page/2/` | EN | 200 | `/tag/spotlight-nigeria/page/2/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/spotlight-nigeria/page/2/` | FR | 200 | `/fr/tag/spotlight-nigeria/page/2/` | Recreate (archived/historical) | Implemented |
| `/organizers/` | EN | 200 | `/about/` | Redirect 301 → /about/ (demo) | Implemented |
| `/fr/organizers/` | FR | 200 | `/fr/about/` | Redirect 301 → /fr/about/ (demo) | Implemented |
| `/organizers/andrew-beers/` | EN | 200 | `/about/` | Redirect 301 → /about/ (demo) | Implemented |
| `/fr/organizers/andrew-beers/` | FR | 200 | `/fr/about/` | Redirect 301 → /fr/about/ (demo) | Implemented |
| `/organizers/kate-platonova/` | EN | 200 | `/about/` | Redirect 301 → /about/ (demo) | Implemented |
| `/fr/organizers/kate-platonova/` | FR | 200 | `/fr/about/` | Redirect 301 → /fr/about/ (demo) | Implemented |
| `/events/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ | Implemented |
| `/fr/events/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ | Implemented |
| `/events/create-a-business-model-to-grow-your-business/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/create-a-business-model-to-grow-your-business/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/future-of-geotechnics-technology-ai-big-data/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/future-of-geotechnics-technology-ai-big-data/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/health-and-wellness-with-antony-dolan/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/health-and-wellness-with-antony-dolan/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/long-covid-rehab-the-long-road-to-recovery/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/long-covid-rehab-the-long-road-to-recovery/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/marketing-strategy-for-small-business/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/marketing-strategy-for-small-business/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/our-excellent-partner-france-pavilion-2/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/our-excellent-partner-france-pavilion-2/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/our-excellent-partner-france-pavilion-3/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/our-excellent-partner-france-pavilion-3/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/our-excellent-partner-france-pavilion/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/our-excellent-partner-france-pavilion/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/outside-lands-music-and-arts-festival/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/outside-lands-music-and-arts-festival/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/spotlight-nigeria-2023/` | EN | 500 | `/2023-programme2/` | Redirect 301 → /2023-programme2/ | Implemented |
| `/fr/events/spotlight-nigeria-2023/` | FR | 500 | `/fr/2023-programme2/` | Redirect 301 → /fr/2023-programme2/ | Implemented |
| `/events/therapeutic-art-workshop/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/therapeutic-art-workshop/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events/thursday-night-live-best-summer/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events/thursday-night-live-best-summer/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_cat/art-craft/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_cat/art-craft/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_cat/business-marketing/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_cat/business-marketing/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_cat/concert-festival/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_cat/concert-festival/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_cat/education-training/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_cat/education-training/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_cat/medical-health/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_cat/medical-health/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_cat/music-entertainment/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_cat/music-entertainment/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_cat/technology-innovation/` | EN | 500 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_cat/technology-innovation/` | FR | 500 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_tag/conference/` | EN | 200 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_tag/conference/` | FR | 200 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_tag/events/` | EN | 200 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_tag/events/` | FR | 200 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/events_tag/life-style/` | EN | 200 | `/programme/` | Redirect 301 → /programme/ (demo) | Implemented |
| `/fr/events_tag/life-style/` | FR | 200 | `/fr/programme/` | Redirect 301 → /fr/programme/ (demo) | Implemented |
| `/category/agriculture/` | EN | 200 | `/category/agriculture/` | Recreate (archived/historical) | Implemented |
| `/fr/category/agriculture/` | FR | 200 | `/fr/category/agriculture/` | Recreate (archived/historical) | Implemented |
| `/category/education/` | EN | 200 | `/category/education/` | Recreate (archived/historical) | Implemented |
| `/fr/category/education/` | FR | 200 | `/fr/category/education/` | Recreate (archived/historical) | Implemented |
| `/category/panels/` | EN | 200 | `/category/panels/` | Recreate (archived/historical) | Implemented |
| `/fr/category/panels/` | FR | 200 | `/fr/category/panels/` | Recreate (archived/historical) | Implemented |
| `/category/press-release/` | EN | 200 | `/category/press-release/` | Recreate (archived/historical) | Implemented |
| `/fr/category/press-release/` | FR | 200 | `/fr/category/press-release/` | Recreate (archived/historical) | Implemented |
| `/category/round-table/` | EN | 200 | `/category/round-table/` | Recreate (archived/historical) | Implemented |
| `/fr/category/round-table/` | FR | 200 | `/fr/category/round-table/` | Recreate (archived/historical) | Implemented |
| `/category/snfevent2018/` | EN | 200 | `/category/snfevent2018/` | Recreate (archived/historical) | Implemented |
| `/fr/category/snfevent2018/` | FR | 200 | `/fr/category/snfevent2018/` | Recreate (archived/historical) | Implemented |
| `/category/spotlight-nigeria-2018/` | EN | 200 | `/category/spotlight-nigeria-2018/` | Recreate (archived/historical) | Implemented |
| `/fr/category/spotlight-nigeria-2018/` | FR | 200 | `/fr/category/spotlight-nigeria-2018/` | Recreate (archived/historical) | Implemented |
| `/category/technology/` | EN | 200 | `/category/technology/` | Recreate (archived/historical) | Implemented |
| `/fr/category/technology/` | FR | 200 | `/fr/category/technology/` | Recreate (archived/historical) | Implemented |
| `/category/uncategorized/` | EN | 200 | — | Drop (410) | Implemented |
| `/fr/category/uncategorized/` | FR | 200 | — | Drop (410) | Implemented |
| `/category/updates/` | EN | 200 | `/category/updates/` | Recreate (archived/historical) | Implemented |
| `/fr/category/updates/` | FR | 200 | `/fr/category/updates/` | Recreate (archived/historical) | Implemented |
| `/tag/campus-france/` | EN | 200 | `/tag/campus-france/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/campus-france/` | FR | 200 | `/fr/tag/campus-france/` | Recreate (archived/historical) | Implemented |
| `/tag/diaspora/` | EN | 200 | `/tag/diaspora/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/diaspora/` | FR | 200 | `/fr/tag/diaspora/` | Recreate (archived/historical) | Implemented |
| `/tag/education/` | EN | 200 | `/tag/education/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/education/` | FR | 200 | `/fr/tag/education/` | Recreate (archived/historical) | Implemented |
| `/tag/france-nigeria-partnership/` | EN | 200 | `/tag/france-nigeria-partnership/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/france-nigeria-partnership/` | FR | 200 | `/fr/tag/france-nigeria-partnership/` | Recreate (archived/historical) | Implemented |
| `/tag/france/` | EN | 200 | `/tag/france/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/france/` | FR | 200 | `/fr/tag/france/` | Recreate (archived/historical) | Implemented |
| `/tag/franco-nigerian-ties/` | EN | 200 | `/tag/franco-nigerian-ties/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/franco-nigerian-ties/` | FR | 200 | `/fr/tag/franco-nigerian-ties/` | Recreate (archived/historical) | Implemented |
| `/tag/friends-of-nigeria-europe/` | EN | 200 | `/tag/friends-of-nigeria-europe/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/friends-of-nigeria-europe/` | FR | 200 | `/fr/tag/friends-of-nigeria-europe/` | Recreate (archived/historical) | Implemented |
| `/tag/friends-of-nigeria/` | EN | 200 | `/tag/friends-of-nigeria/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/friends-of-nigeria/` | FR | 200 | `/fr/tag/friends-of-nigeria/` | Recreate (archived/historical) | Implemented |
| `/tag/macrons-visit-to-nigeria/` | EN | 200 | `/tag/macrons-visit-to-nigeria/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/macrons-visit-to-nigeria/` | FR | 200 | `/fr/tag/macrons-visit-to-nigeria/` | Recreate (archived/historical) | Implemented |
| `/tag/nigeria/` | EN | 200 | `/tag/nigeria/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/nigeria/` | FR | 200 | `/fr/tag/nigeria/` | Recreate (archived/historical) | Implemented |
| `/tag/nigerian-cinema/` | EN | 200 | `/tag/nigerian-cinema/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/nigerian-cinema/` | FR | 200 | `/fr/tag/nigerian-cinema/` | Recreate (archived/historical) | Implemented |
| `/tag/nigerian-creative-arts-exchange/` | EN | 200 | `/tag/nigerian-creative-arts-exchange/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/nigerian-creative-arts-exchange/` | FR | 200 | `/fr/tag/nigerian-creative-arts-exchange/` | Recreate (archived/historical) | Implemented |
| `/tag/nollywood-week/` | EN | 200 | `/tag/nollywood-week/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/nollywood-week/` | FR | 200 | `/fr/tag/nollywood-week/` | Recreate (archived/historical) | Implemented |
| `/tag/nollywood/` | EN | 200 | `/tag/nollywood/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/nollywood/` | FR | 200 | `/fr/tag/nollywood/` | Recreate (archived/historical) | Implemented |
| `/tag/october/` | EN | 200 | `/tag/october/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/october/` | FR | 200 | `/fr/tag/october/` | Recreate (archived/historical) | Implemented |
| `/tag/paris/` | EN | 200 | `/tag/paris/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/paris/` | FR | 200 | `/fr/tag/paris/` | Recreate (archived/historical) | Implemented |
| `/tag/snfevent2018/` | EN | 200 | `/tag/snfevent2018/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/snfevent2018/` | FR | 200 | `/fr/tag/snfevent2018/` | Recreate (archived/historical) | Implemented |
| `/tag/spotlight-nigeria-2018/` | EN | 200 | `/tag/spotlight-nigeria-2018/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/spotlight-nigeria-2018/` | FR | 200 | `/fr/tag/spotlight-nigeria-2018/` | Recreate (archived/historical) | Implemented |
| `/tag/spotlight-nigeria-france/` | EN | 200 | `/tag/spotlight-nigeria-france/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/spotlight-nigeria-france/` | FR | 200 | `/fr/tag/spotlight-nigeria-france/` | Recreate (archived/historical) | Implemented |
| `/tag/spotlight-nigeria/` | EN | 200 | `/tag/spotlight-nigeria/` | Recreate (archived/historical) | Implemented |
| `/fr/tag/spotlight-nigeria/` | FR | 200 | `/fr/tag/spotlight-nigeria/` | Recreate (archived/historical) | Implemented |
| `/author/blueinctech/` | EN | 200 | `/author/blueinctech/` | Recreate (archived/historical) | Implemented |
| `/fr/author/blueinctech/` | FR | 200 | `/fr/author/blueinctech/` | Recreate (archived/historical) | Implemented |
| `/2018/` | EN | 200 | `/2018/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/` | FR | 200 | `/fr/2018/` | Recreate (archived/historical) | Implemented |
| `/2018/05/` | EN | 200 | `/2018/05/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/05/` | FR | 200 | `/fr/2018/05/` | Recreate (archived/historical) | Implemented |
| `/2018/05/03/` | EN | 200 | `/2018/05/03/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/05/03/` | FR | 200 | `/fr/2018/05/03/` | Recreate (archived/historical) | Implemented |
| `/2018/05/09/` | EN | 200 | `/2018/05/09/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/05/09/` | FR | 200 | `/fr/2018/05/09/` | Recreate (archived/historical) | Implemented |
| `/2018/05/12/` | EN | 200 | `/2018/05/12/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/05/12/` | FR | 200 | `/fr/2018/05/12/` | Recreate (archived/historical) | Implemented |
| `/2018/05/22/` | EN | 200 | `/2018/05/22/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/05/22/` | FR | 200 | `/fr/2018/05/22/` | Recreate (archived/historical) | Implemented |
| `/2018/06/` | EN | 200 | `/2018/06/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/06/` | FR | 200 | `/fr/2018/06/` | Recreate (archived/historical) | Implemented |
| `/2018/06/05/` | EN | 200 | `/2018/06/05/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/06/05/` | FR | 200 | `/fr/2018/06/05/` | Recreate (archived/historical) | Implemented |
| `/2018/06/21/` | EN | 200 | `/2018/06/21/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/06/21/` | FR | 200 | `/fr/2018/06/21/` | Recreate (archived/historical) | Implemented |
| `/2018/06/28/` | EN | 200 | `/2018/06/28/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/06/28/` | FR | 200 | `/fr/2018/06/28/` | Recreate (archived/historical) | Implemented |
| `/2018/07/` | EN | 200 | `/2018/07/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/07/` | FR | 200 | `/fr/2018/07/` | Recreate (archived/historical) | Implemented |
| `/2018/07/24/` | EN | 200 | `/2018/07/24/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/07/24/` | FR | 200 | `/fr/2018/07/24/` | Recreate (archived/historical) | Implemented |
| `/2018/08/` | EN | 200 | `/2018/08/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/08/` | FR | 200 | `/fr/2018/08/` | Recreate (archived/historical) | Implemented |
| `/2018/08/02/` | EN | 200 | `/2018/08/02/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/08/02/` | FR | 200 | `/fr/2018/08/02/` | Recreate (archived/historical) | Implemented |
| `/2018/09/` | EN | 200 | `/2018/09/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/09/` | FR | 200 | `/fr/2018/09/` | Recreate (archived/historical) | Implemented |
| `/2018/09/26/` | EN | 200 | `/2018/09/26/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/09/26/` | FR | 200 | `/fr/2018/09/26/` | Recreate (archived/historical) | Implemented |
| `/2018/09/28/` | EN | 200 | `/2018/09/28/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/09/28/` | FR | 200 | `/fr/2018/09/28/` | Recreate (archived/historical) | Implemented |
| `/2018/09/30/` | EN | 200 | `/2018/09/30/` | Recreate (archived/historical) | Implemented |
| `/fr/2018/09/30/` | FR | 200 | `/fr/2018/09/30/` | Recreate (archived/historical) | Implemented |
| `/2020/` | EN | 200 | `/2020/` | Recreate (archived/historical) | Implemented |
| `/fr/2020/` | FR | 200 | `/fr/2020/` | Recreate (archived/historical) | Implemented |
| `/2020/06/` | EN | 200 | `/2020/06/` | Recreate (archived/historical) | Implemented |
| `/fr/2020/06/` | FR | 200 | `/fr/2020/06/` | Recreate (archived/historical) | Implemented |
| `/2020/06/03/` | EN | 200 | `/2020/06/03/` | Recreate (archived/historical) | Implemented |
| `/fr/2020/06/03/` | FR | 200 | `/fr/2020/06/03/` | Recreate (archived/historical) | Implemented |
| `/2023/` | EN | 200 | `/2023/` | Recreate (archived/historical) | Implemented |
| `/fr/2023/` | FR | 200 | `/fr/2023/` | Recreate (archived/historical) | Implemented |
| `/2023/03/` | EN | 200 | `/2023/03/` | Recreate (archived/historical) | Implemented |
| `/fr/2023/03/` | FR | 200 | `/fr/2023/03/` | Recreate (archived/historical) | Implemented |
| `/2023/03/31/` | EN | 200 | `/2023/03/31/` | Recreate (archived/historical) | Implemented |
| `/fr/2023/03/31/` | FR | 200 | `/fr/2023/03/31/` | Recreate (archived/historical) | Implemented |
| `/hf_template/404-page/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/banner-speaker-single/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/blog-sidebar/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/event-header/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/event-map-header/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/event-single-title-bar/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/events-archive-title-bar/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/footer-2/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/footer-3/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/footer-4/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/footer-5/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/footer-cta/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/footer/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/header-2/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/header-3/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/header-4/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/header-5/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/header-dark/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/header/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/headern/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/inner-title-bar/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/speaker-single-title-bar/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/title-bar-cart-checkout/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/title-bar-schedule/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/title-bar-single-shop/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/title-bar/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/hf_template/title-single-blog/` | EN | 301 → / (live check) | — | Drop (410) | Implemented |
| `/new/sponsorship-registration/` | EN | 301 → /sponsorship-registration/ | `/sponsorship-registration/` | Redirect 301 → /sponsorship-registration/ | Implemented |
| `/fr/new/sponsorship-registration/` | FR | 301 → /fr/sponsorship-registration/ | `/fr/sponsorship-registration/` | Redirect 301 → /fr/sponsorship-registration/ | Implemented |
| `/about` | EN | 200 | `/about/` | Redirect 301 → /about/ | Implemented |
| `/events` | EN | 301 → /events/ | `/programme/` | Redirect 301 → /programme/ | Implemented |
| `/registration` | EN | 200 | `/registration/` | Redirect 301 → /registration/ | Implemented |
| `/2022/12/13/` | EN | 404 | — | No route (keep 404) | Implemented |
| `/fr/2022/12/13/` | FR | 404 | — | No route (keep 404) | Implemented |
| `/2023/01/03/` | EN | 404 | — | No route (keep 404) | Implemented |
| `/fr/2023/01/03/` | FR | 404 | — | No route (keep 404) | Implemented |
| `/blog` | EN | 404 | — | No route (keep 404) | Implemented |
| `/fr/blog/` | FR | 404 | — | No route (keep 404) | Implemented |
| `/contact` | EN | 404 | — | No route (keep 404) | Implemented |
| `/fr/contact/` | FR | 404 | — | No route (keep 404) | Implemented |
| `/event-venue/` | EN | 404 | — | No route (keep 404) | Implemented |
| `/fr/event-venue/` | FR | 404 | — | No route (keep 404) | Implemented |
| `/ghg` | EN | 404 | — | No route (keep 404) | Implemented |
| `/fr/ghg/` | FR | 404 | — | No route (keep 404) | Implemented |
| `/schedules` | EN | 404 | — | No route (keep 404) | Implemented |
| `/fr/schedules/` | FR | 404 | — | No route (keep 404) | Implemented |
| `/speaker` | EN | 404 | — | No route (keep 404) | Implemented |
| `/fr/speaker/` | FR | 404 | — | No route (keep 404) | Implemented |
| `/llms.txt` | EN | 200 | `/llms.txt` | Recreate (regenerate without demo URLs) | Implemented |
| `/fr` | FR | 200 | `/fr/` | Redirect 301 → /fr/ | Implemented |
| `/fr/hf_template/*` (not crawled individually) | FR | 301 → / (sample) | — | Drop (410) | Implemented |
| `/sitemap_index.xml`, `/post-sitemap.xml`, `/page-sitemap.xml`, `/speakers-sitemap.xml`, `/organizers-sitemap.xml`, `/events-sitemap.xml`, `/hf_template-sitemap.xml`, `/category-sitemap.xml`, `/post_tag-sitemap.xml`, `/events_cat-sitemap.xml`, `/events_tag-sitemap.xml`, `/author-sitemap.xml` | EN | 200 | `/sitemap.xml` (new) | Redirect 301 → /sitemap.xml (or serve sitemap_index.xml) | Implemented |
| `/feed/`, `/fr/feed/`, `/comments/feed/` | EN/FR | 200 | `/feed/` (if recreated) | Recreate RSS or Redirect 301 → /press-releases/ (FR → /fr/press-releases/) | Implemented |
| `/robots.txt` | — | 200 | `/robots.txt` | Recreate (point to new sitemap) | Implemented |

## Redirect & 410 rules (compact)

Old → new, with status code. FR rules mirror EN with the `/fr` prefix. Patterns may be collapsed into wildcard rules in `next.config` (shown first).

**Pattern rules (recommended):**
```
/:lang(fr)?/events/spotlight-nigeria-2023/  → /:lang/2023-programme2/          301
/:lang(fr)?/events/:slug*                   → /:lang/programme/                301   (archive + 11 demo events)
/:lang(fr)?/events_cat/:slug/               → /:lang/programme/                301
/:lang(fr)?/events_tag/:slug/               → /:lang/programme/                301
/:lang(fr)?/organizers/:slug*               → /:lang/about/                    301
/:lang(fr)?/speakers/ralph-edwards/         → /:lang/speakers/                 301
/:lang(fr)?/speakers/ralph-edwards-2/       → /:lang/speakers/                 301
/:lang(fr)?/schedule-list/                  → /:lang/2023-programme2/          301
/:lang(fr)?/schedule-horizontal-tab/        → /:lang/programme/                301
/:lang(fr)?/schedule-timeline/              → /:lang/programme/                301
/:lang(fr)?/digital-conference/             → /:lang/programme/                301
/:lang(fr)?/education-webinar/              → /:lang/programme/                301
/:lang(fr)?/new/sponsorship-registration/   → /:lang/sponsorship-registration/ 301
/:lang(fr)?/home/                           → /:lang/                          301
/:path*/page/1/                             → /:path*/                         301
/about  /registration  /fr  (no trailing slash) → add trailing slash          301   (global trailingSlash: true)
/:lang(fr)?/hf_template/:slug/              → 410 Gone
/:lang(fr)?/category/uncategorized/         → 410 Gone
```

**Every individual rule** (generated from the table above):
```
/digital-conference/ → /programme/ (301)
/fr/digital-conference/ → /fr/programme/ (301)
/education-webinar/ → /programme/ (301)
/fr/education-webinar/ → /fr/programme/ (301)
/schedule-horizontal-tab/ → /programme/ (301)
/fr/schedule-horizontal-tab/ → /fr/programme/ (301)
/schedule-list/ → /2023-programme2/ (301)
/fr/schedule-list/ → /fr/2023-programme2/ (301)
/schedule-timeline/ → /programme/ (301)
/fr/schedule-timeline/ → /fr/programme/ (301)
/home/ → / (301)
/fr/home/ → /fr/ (301)
/speakers/ralph-edwards-2/ → /speakers/ (301)
/fr/speakers/ralph-edwards-2/ → /fr/speakers/ (301)
/speakers/ralph-edwards/ → /speakers/ (301)
/fr/speakers/ralph-edwards/ → /fr/speakers/ (301)
/2018/09/page/1/ → /2018/09/ (301)
/fr/2018/09/page/1/ → /fr/2018/09/ (301)
/2018/page/1/ → /2018/ (301)
/fr/2018/page/1/ → /fr/2018/ (301)
/author/blueinctech/page/1/ → /author/blueinctech/ (301)
/fr/author/blueinctech/page/1/ → /fr/author/blueinctech/ (301)
/category/press-release/page/1/ → /category/press-release/ (301)
/fr/category/press-release/page/1/ → /fr/category/press-release/ (301)
/category/spotlight-nigeria-2018/page/1/ → /category/spotlight-nigeria-2018/ (301)
/fr/category/spotlight-nigeria-2018/page/1/ → /fr/category/spotlight-nigeria-2018/ (301)
/press-releases/page/1/ → /press-releases/ (301)
/fr/press-releases/page/1/ → /fr/press-releases/ (301)
/speakers/page/1/ → /speakers/ (301)
/fr/speakers/page/1/ → /fr/speakers/ (301)
/tag/france-nigeria-partnership/page/1/ → /tag/france-nigeria-partnership/ (301)
/fr/tag/france-nigeria-partnership/page/1/ → /fr/tag/france-nigeria-partnership/ (301)
/tag/spotlight-nigeria/page/1/ → /tag/spotlight-nigeria/ (301)
/fr/tag/spotlight-nigeria/page/1/ → /fr/tag/spotlight-nigeria/ (301)
/organizers/ → /about/ (301)
/fr/organizers/ → /fr/about/ (301)
/organizers/andrew-beers/ → /about/ (301)
/fr/organizers/andrew-beers/ → /fr/about/ (301)
/organizers/kate-platonova/ → /about/ (301)
/fr/organizers/kate-platonova/ → /fr/about/ (301)
/events/ → /programme/ (301)
/fr/events/ → /fr/programme/ (301)
/events/create-a-business-model-to-grow-your-business/ → /programme/ (301)
/fr/events/create-a-business-model-to-grow-your-business/ → /fr/programme/ (301)
/events/future-of-geotechnics-technology-ai-big-data/ → /programme/ (301)
/fr/events/future-of-geotechnics-technology-ai-big-data/ → /fr/programme/ (301)
/events/health-and-wellness-with-antony-dolan/ → /programme/ (301)
/fr/events/health-and-wellness-with-antony-dolan/ → /fr/programme/ (301)
/events/long-covid-rehab-the-long-road-to-recovery/ → /programme/ (301)
/fr/events/long-covid-rehab-the-long-road-to-recovery/ → /fr/programme/ (301)
/events/marketing-strategy-for-small-business/ → /programme/ (301)
/fr/events/marketing-strategy-for-small-business/ → /fr/programme/ (301)
/events/our-excellent-partner-france-pavilion-2/ → /programme/ (301)
/fr/events/our-excellent-partner-france-pavilion-2/ → /fr/programme/ (301)
/events/our-excellent-partner-france-pavilion-3/ → /programme/ (301)
/fr/events/our-excellent-partner-france-pavilion-3/ → /fr/programme/ (301)
/events/our-excellent-partner-france-pavilion/ → /programme/ (301)
/fr/events/our-excellent-partner-france-pavilion/ → /fr/programme/ (301)
/events/outside-lands-music-and-arts-festival/ → /programme/ (301)
/fr/events/outside-lands-music-and-arts-festival/ → /fr/programme/ (301)
/events/spotlight-nigeria-2023/ → /2023-programme2/ (301)
/fr/events/spotlight-nigeria-2023/ → /fr/2023-programme2/ (301)
/events/therapeutic-art-workshop/ → /programme/ (301)
/fr/events/therapeutic-art-workshop/ → /fr/programme/ (301)
/events/thursday-night-live-best-summer/ → /programme/ (301)
/fr/events/thursday-night-live-best-summer/ → /fr/programme/ (301)
/events_cat/art-craft/ → /programme/ (301)
/fr/events_cat/art-craft/ → /fr/programme/ (301)
/events_cat/business-marketing/ → /programme/ (301)
/fr/events_cat/business-marketing/ → /fr/programme/ (301)
/events_cat/concert-festival/ → /programme/ (301)
/fr/events_cat/concert-festival/ → /fr/programme/ (301)
/events_cat/education-training/ → /programme/ (301)
/fr/events_cat/education-training/ → /fr/programme/ (301)
/events_cat/medical-health/ → /programme/ (301)
/fr/events_cat/medical-health/ → /fr/programme/ (301)
/events_cat/music-entertainment/ → /programme/ (301)
/fr/events_cat/music-entertainment/ → /fr/programme/ (301)
/events_cat/technology-innovation/ → /programme/ (301)
/fr/events_cat/technology-innovation/ → /fr/programme/ (301)
/events_tag/conference/ → /programme/ (301)
/fr/events_tag/conference/ → /fr/programme/ (301)
/events_tag/events/ → /programme/ (301)
/fr/events_tag/events/ → /fr/programme/ (301)
/events_tag/life-style/ → /programme/ (301)
/fr/events_tag/life-style/ → /fr/programme/ (301)
/category/uncategorized/ → 410 Gone
/fr/category/uncategorized/ → 410 Gone
/hf_template/404-page/ → 410 Gone
/hf_template/banner-speaker-single/ → 410 Gone
/hf_template/blog-sidebar/ → 410 Gone
/hf_template/event-header/ → 410 Gone
/hf_template/event-map-header/ → 410 Gone
/hf_template/event-single-title-bar/ → 410 Gone
/hf_template/events-archive-title-bar/ → 410 Gone
/hf_template/footer-2/ → 410 Gone
/hf_template/footer-3/ → 410 Gone
/hf_template/footer-4/ → 410 Gone
/hf_template/footer-5/ → 410 Gone
/hf_template/footer-cta/ → 410 Gone
/hf_template/footer/ → 410 Gone
/hf_template/header-2/ → 410 Gone
/hf_template/header-3/ → 410 Gone
/hf_template/header-4/ → 410 Gone
/hf_template/header-5/ → 410 Gone
/hf_template/header-dark/ → 410 Gone
/hf_template/header/ → 410 Gone
/hf_template/headern/ → 410 Gone
/hf_template/inner-title-bar/ → 410 Gone
/hf_template/speaker-single-title-bar/ → 410 Gone
/hf_template/title-bar-cart-checkout/ → 410 Gone
/hf_template/title-bar-schedule/ → 410 Gone
/hf_template/title-bar-single-shop/ → 410 Gone
/hf_template/title-bar/ → 410 Gone
/hf_template/title-single-blog/ → 410 Gone
/new/sponsorship-registration/ → /sponsorship-registration/ (301)
/fr/new/sponsorship-registration/ → /fr/sponsorship-registration/ (301)
/about → /about/ (301)
/events → /programme/ (301)
/registration → /registration/ (301)
/fr → /fr/ (301)
/fr/hf_template/* → 410 Gone
```
