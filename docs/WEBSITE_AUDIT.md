# Spotlight Nigeria – Website Audit (WordPress → Next.js)

Source site: <https://spotlightnigeria-france.com/>. The site is the "Spotlight Nigeria Business and Investment Forum", an annual Franco-Nigerian forum organised by Friends of Nigeria (FON) Europe.
Audit date: 2026-10-28. Sources: Yoast sitemaps, a full crawl of the sitemap URLs, their `/fr/` variants and internally linked URLs, rendered HTML, WP REST dumps, Elementor CSS, screenshots and spot checks against the live site (read-only).

Conventions:
- **Visible** means the element is shown on at least one breakpoint.
- **Hidden/retained** means the element carries all four Elementor classes `elementor-hidden-desktop/laptop/tablet/mobile`. It is never shown to visitors and is recorded here only for completeness. Do **not** rebuild it as visible content.
- Element IDs such as `#5b7933a` are Elementor `data-id`s. They let you find the element in the saved HTML.
- Text is quoted verbatim, including the original typos. Nothing has been corrected.

---

## 1. Summary

### 1.1 Platform, plugins, theme

| Item | Finding |
|---|---|
| CMS | WordPress 7.1.3 (`<meta name="generator">`) |
| Theme | **SeatEvent** by JWS (`/wp-content/themes/seatevent/`, Redux 4.3.19.3 options framework). Theme CPTs: `speakers`, `organizers`, `events` (+ `events_cat`, `events_tag`), and `hf_template` (header/footer/title-bar templates built in Elementor) |
| Page builder | Elementor 4.3.5 + Elementor Pro. Features: `additional_custom_breakpoints`, containers, nested elements. Theme widgets use the prefixes `jws_*` and `bloompixel-gradient-button`. Sticky rows use the `cafe-row-sticky` classes |
| Multilingual | **TranslatePress** 3.3.8. English is the default at `/`. French is under `/fr/`. Switcher shortcode in the footer. `hreflang` tags: `en-US`, `fr-FR`, `en`, `fr` |
| SEO | **Yoast SEO**: sitemaps at `/sitemap_index.xml`, schema graph, OG/Twitter tags |
| Forms | Elementor Pro Forms with **reCAPTCHA v2 checkbox** (sitekey `6LeHdJ8nAAAAAKdd2A51lJnK9o8RmxbLolc0RPPp`). WPForms is installed (REST namespace present) but **no WPForms form appears on any crawled page**. External: 2 Google Forms and a Weezevent ticket widget/link |
| Other plugins (REST namespaces / markup) | Slider Revolution 7.2.0 (not used on visible pages), WP Rocket (delayed JS, lazy-load), LiteSpeed, Google Site Kit 1.189.0 (gtag `GT-PJSNCJK7`), WP Mail SMTP, Akismet, Hostinger Tools (generates `/llms.txt` and links a Hostinger MCP endpoint), All-in-One WP Migration |
| Verification | `google-site-verification` = `QNamKEFAiD7r3qW-Mp0yOL3ceJqIYb835GCD_8MQwc4` |
| Favicons | `<link rel="shortcut icon">` is declared twice: `/wp-content/uploads/2022/11/favicon.png` (theme) **and** `/wp-content/uploads/2025/08/cropped-fav_Blueinc-Technologies.png` (WP site icon, which is the developer's logo, not Spotlight's). Apple touch icon: `2022/11/favicon.png` |
| robots.txt | Yoast block: `User-agent: * / Disallow:` (empty), plus a sitemap line |
| Author | One user: `blueinctech`, display name "Spotlight Nigeria Press Team" |

### 1.2 Design tokens (Elementor kit `post-6.css` + theme CSS)

| Token | Value |
|---|---|
| Primary / Accent | `#21B354` (green). Kit custom colours `1bd8f8d`, `bdd1d65` and `ab3feee` are also `#21B354` |
| Secondary | `#323232` |
| Text | `#5C5C5C` |
| Dark | `#242328` (custom `73bf04f`) |
| White / Black | `#FFFFFF` / `#000000` |
| Other recurring colours | Footer copyright bar `#ECECEC`; dark sections `#191919` and a near-black navy (home sponsorship block); light section background `#F4F4F4` / `#F7F7F79E` (header); registration-card accent navy (the European card button, see screenshot); speaker CTA `#3A3386` |
| Body font | **Urbanist** (Google Fonts, weights 400/500/600/700). Kit typography primary/secondary/text/accent are all Urbanist, at 700/400/400/700 |
| Heading font | **Plus Jakarta Sans** (Google Fonts, weights 600/700). Used by the theme's `jws_widget_heading` titles |
| Container | Boxed sections at 1140px max-width (`.elementor-section-boxed > .elementor-container`, `--container-max-width:1140px`). Falls to 1024px at tablet and 767px at mobile |
| Widget spacing | 20px |
| Buttons | Font-weight 700, `border-radius: 5px` |
| Breakpoints (Elementor config) | mobile ≤ **767**, tablet ≤ **1024**, **laptop ≤ 1440** (custom, enabled), desktop > 1440. Mobile-extra, tablet-extra and widescreen are disabled. The theme CSS also uses 991/992 and 1441px |
| Animations | Elementor entrance animations, e.g. `zoomInUp` on the video popup and `fadeIn` on breadcrumbs. Title bars have floating decorative "shade" images (MoveZoomIn/MoveTop keyframes) |

### 1.3 Global header

There are **four header variants**, all Elementor `hf_template`s:

| Template | Used on | Desktop/laptop layout | Tablet/mobile layout |
|---|---|---|---|
| **17** (default) | Home, About, Gallery, Get in Touch, Press Releases, Press Registration, Previous Editions, Privacy, posts, blog archives, organizers | Logo (25%) · menu (50%) · **"Register"** button with ticket icon → `/registration` (25%). Dark text on light background | Logo · "Register" button → `/registration` · off-canvas toggle |
| **11303** | Programme, 2023 Programme2 | Same as 17, with white text over the dark hero (`#374dc17` "Register" → `/registration`) | Same as 17 |
| **4097** | Registration, Sponsorship Registration, Speakers archive and singles, schedule-* demo pages | Logo · menu · **"Register as Sponsor"** → `/sponsorship-registration/`. White text over the hero | Logo · off-canvas toggle only (no button) |
| 7445 / 899 / 1518 | events_tag archives / digital-conference / education-webinar (demo pages only) | Demo headers | – |

Header behaviour: the desktop row (`#1812136`) has `desktop-sticky cafe-scroll-up-sticky`, so it sticks when the user scrolls up. The tablet/mobile row (`#3d868ea`) has `tablet-sticky mobile-sticky cafe-scroll-up-sticky`. The current menu item is shown in green.

**Logo**: `/wp-content/uploads/2022/11/spotlight-nigeria-france.png`, linking to `/`.

**Main menu** (same in all headers and the off-canvas panel; hrefs verbatim):

| Item | Target |
|---|---|
| Home | `http://spotlightnigeria-france.com/` (http, causes a 301 to https) |
| About Us | `https://spotlightnigeria-france.com/about/` |
| Programme | `https://spotlightnigeria-france.com/programme/` |
| **Registrations** (dropdown, `#`) | → **Delegate Registration** `…/registration/` · **Press Registration** `…/press-registration/` |
| **Media** (dropdown, `#`) | → **Previous Editions** `…/previous-editions/` · **Spotlight Photostream** `https://www.flickr.com/photos/157014038@N02/albums/72177720329310046/` · **Spotlight Videostream** `https://www.youtube.com/channel/UC52gKkRlNU5rZ2SiK5R9z4A` · **Press Releases** `…/press-releases/` |
| Contact | `…/get-in-touch/` |

**Mobile off-canvas menu** (Elementor library template **6103**): a full-height panel containing a spacer (81px), the logo (37% width), the same menu as a vertical list with dropdowns (30px bottom padding), an empty inner section and a spacer. It is opened by the `Offcanvas` widget toggle (hamburger icon, `javascript:void(0)`).

### 1.4 Global footer (template **81**, used on every page except About and the demo pages)

1. **CTA band** (green `#21B354` background). There are two copies, one for desktop/laptop and one for tablet/mobile, with identical content:
   - White Nigeria-map icon: `/wp-content/uploads/2022/11/white-favicon-1-180x180-1.png`
   - Eyebrow "Spotlight nigeria 2026" (rendered uppercase)
   - H3 **"Interested in being a Participant?"**
   - Black button **"Register now"** → `http://spotlightnigeria-france.com/registration`
2. **Footer columns** (4 × 25%, light background):
   - Col 1: **language switcher** (TranslatePress shortcode). A bordered dropdown that shows the current language with its flag ("English" with the `en_US.png` flag). Options: English → `#` (current), French → `https://spotlightnigeria-france.com/fr/` (on FR pages the order flips and English → `/`)
   - **Information**: About Spotlight → `http://…/about/`; Press Releases → `http://…/press-releases/`; Contact us → `http://…/get-in-touch/`
   - **Registrations**: Delegate Registration → `http://…/registration`; Press Registration → `http://…/press-registration/`
   - **Press & Media**: Spotlight Photostream → `https://www.flickr.com/photos/157014038@N02/albums/72177720321269494/` (**a different album from the header's**); Spotlight Videostream → YouTube channel; Previous Editions → `http://…/previous-editions/`
3. **Copyright bar** (`#ECECEC`): "Copyright © 2026 Spotlight Nigeria-France. Designs by **Blueinc**", where "Blueinc" links to `https://blueinctech.com`. Right side: **Privacy** → `/privacy-policy/`, **Terms** → `/privacy-policy/` (same page), **Sitemap** → `#`.
4. Below the footer, injected as raw text after the scripts: "Developed and Maintained by **Blueinc_Technologies**", linking to `https://blueinctech.com`.

**About page footer** (template **3777**, a different design):
- Parallax CTA with background `2022/12/paralax-about.jpg`: H2 "Haven't booked your seat yet? Register now" and a "Register" button → `/registration`.
- **Newsletter** block: eyebrow "Subscribe to our Newsletter", H3 "Don't miss a thing! Get updated", and an Elementor form (see §4).
- Footer columns with the logo `2022/11/favicon.png` and the language switcher. The column links are the same, except Photostream → `https://www.flickr.com/photos/157014038@N02/`.
- Copyright reads "**© 2023**". Privacy, Terms and Sitemap all → `#`.
- There is no green CTA band.

### 1.5 Global non-visual elements present on every page

- **Elementor popup 10715** "Registration for Nigerian and African companies." This is a Google Form, see §4.
- **Elementor popup 10603** "Registration for Spotlight 2026", a Weezevent widget. No trigger was found on any crawled page, so it is an orphan.
- A hidden theme login form (`loginpopopform`, posting to `wp-login.php`). Do not rebuild it.

---

## 2. Full URL inventory

The crawl covered 136 sitemap URLs (EN), their `/fr/` variants, and internally linked URLs. Status counts:
- EN: 132 × 200, 11 × 301, 8 × 404, **20 × 500**
- FR: 130 × 200, 10 × 301, 8 × 404, **20 × 500**

Every `/events/*` and `/events_cat/*` URL returns **HTTP 500** in both languages. `/hf_template/*` URLs **301 to `/`** (checked live).

Infrastructure URLs (not pages):
- `/sitemap_index.xml` (Yoast) and its sub-sitemaps: post, page, speakers, organizers, events, hf_template, category, post_tag, events_cat, events_tag, author
- `/robots.txt`
- `/feed/`, `/fr/feed/`, `/comments/feed/` (200)
- `/wp-json/`
- `/llms.txt` (200; `/fr/llms.txt` is 404)
- http→https 301s for all URLs

Additional variants:
- `/fr` (no trailing slash) is served **200**, as a duplicate of `/fr/`.
- `/about` and `/registration` (no slash) are also served 200.

"FR status" below is the status of the same path prefixed with `/fr`. "DEMO" means theme sample content that was verified by reading the page; reasons are given in the notes.

| URL (EN path) | Language(s) | Type | Template | EN status | FR status | Notes |
|---|---|---|---|---|---|---|
| `/` | EN + FR | page | Elementor page id 2 (header 17, footer 81) | 200 | 200 |  |
| `/2023-programme2/` | EN + FR | page | Elementor page id 11292 (header 11303) | 200 | 200 | 2023 (6th edition) programme; orphan (not linked) |
| `/about/` | EN + FR | page | Elementor page id 27 (header 17, alt. footer 3777) | 200 | 200 |  |
| `/digital-conference/` | EN + FR | page | Elementor page id 937 | 200 | 200 | **DEMO** – SeatEvent demo ("Tech summit", "Brigton Hall, 2715 Ash Dr. San Jose", lorem ipsum) |
| `/education-webinar/` | EN + FR | page | Elementor page id 1560 | 200 | 200 | **DEMO** – SeatEvent demo ("Digital learning opportunities", "Live webinar", lorem ipsum) |
| `/gallery/` | EN + FR | page | Elementor page id 4429 (title bar 5125) | 200 | 200 | Not linked from nav/footer (orphan) |
| `/get-in-touch/` | EN + FR | page | Elementor page id 4851 (title bar 5125) | 200 | 200 |  |
| `/press-registration/` | EN + FR | page | Elementor page id 10681 (title bar 5125) | 200 | 200 | Visible: Google Form iframe only; Elementor form + "closed" notice hidden |
| `/press-releases/` | EN + FR | page | Elementor page id 5458 (title bar 5125), jws_blog grid | 200 | 200 | Yoast og:description/og:image show stale demo post |
| `/previous-editions/` | EN + FR | page | Elementor page id 10682 (title bar 5125) | 200 | 200 |  |
| `/privacy-policy/` | EN + FR | page | Classic page id 3 (title bar 5125) | 200 | 200 | Body is WordPress default "Suggested text" boilerplate |
| `/programme/` | EN + FR | page | Elementor page id 11439, template elementor_header_footer (header 11303) | 200 | 200 | Only "COMING SOON (2026)" + "06 October 2026" visible; a full agenda is retained hidden |
| `/registration/` | EN + FR | page | Elementor page id 5082 (header 4097) | 200 | 200 |  |
| `/schedule-horizontal-tab/` | EN + FR | page | Elementor page id 2515 | 200 | 200 | **DEMO** – SeatEvent demo ("Choose the right session from our event", New York music-festival filler text) |
| `/schedule-list/` | EN + FR | page | Elementor page id 2510 | 200 | 200 | **DEMO** – SeatEvent demo template ("Join the world's leading companies at Technology Conference") partly filled with 2023 sessions |
| `/schedule-timeline/` | EN + FR | page | Elementor page id 2522 | 200 | 200 | **DEMO** – SeatEvent demo ("Using your time wisely…", "Dowload Agenda") |
| `/sponsorship-registration/` | EN + FR | page | Elementor page id 10527 (header 4097) | 200 | 200 |  |
| `/home/` | EN + FR | page alias | slug of page id 2 | 301 → / (live check) | 301 → /fr/ (live check) | Live: 301 → / |
| `/ccef-nigeria-qa-session-with-french-companies-and-investors-interested-in-nigeria/` | EN + FR | post | Single post id 10653 (2018-09-30) | 200 | 200 |  |
| `/covid-19-information-the-5th-edition-of-spotlight-nigeria-moved-to-2021/` | EN + FR | post | Single post id 10654 (2020-06-03) | 200 | 200 |  |
| `/education-key-to-fostering-long-term-relations-between-nigeria-and-france/` | EN + FR | post | Single post id 10640 (2018-06-05) | 200 | 200 |  |
| `/fon-roundtable-on-harnessing-the-entrepreneurial-potential-of-the-nigerian-diaspora-in-europe/` | EN + FR | post | Single post id 10652 (2018-09-30) | 200 | 200 |  |
| `/france-to-boost-agribusiness-ties-in-nigeria/` | EN + FR | post | Single post id 10643 (2018-07-24) | 200 | 200 |  |
| `/nigerian-creative-arts-exchange-takes-paris/` | EN + FR | post | Single post id 10638 (2018-05-12) | 200 | 200 |  |
| `/opportunities-in-the-european-economy-for-nigerian-companies/` | EN + FR | post | Single post id 10656 (2023-03-31) | 200 | 200 |  |
| `/plenary-session-1-opening-plenary/` | EN + FR | post | Single post id 10651 (2018-09-28) | 200 | 200 |  |
| `/plenary-session-five-real-estate-hospitality-and-construction/` | EN + FR | post | Single post id 10647 (2018-09-28) | 200 | 200 |  |
| `/plenary-session-four-agribusiness-and-fast-moving-consumer-goods/` | EN + FR | post | Single post id 10648 (2018-09-28) | 200 | 200 |  |
| `/plenary-session-six-digital-and-technology-taking-part-in-the-nigerian-silicon-valley-story-opportunities-for-foreign-investments-knowledge-sharing-and-strategic-partnerships/` | EN + FR | post | Single post id 10646 (2018-09-28) | 200 | 200 |  |
| `/plenary-session-three-creative-industry/` | EN + FR | post | Single post id 10649 (2018-09-28) | 200 | 200 |  |
| `/plenary-session-two-energy-power/` | EN + FR | post | Single post id 10650 (2018-09-28) | 200 | 200 |  |
| `/president-macron-to-visit-nigeria-strengthening-business-ties-between-france-and-nigeria/` | EN + FR | post | Single post id 10642 (2018-06-28) | 200 | 200 |  |
| `/spotlight-nigeria-2018-the-diaspora-effect/` | EN + FR | post | Single post id 10645 (2018-09-26) | 200 | 200 |  |
| `/spotlight-nigeria-2018-will-highlight-investment-opportunities-between-franco-nigerian-investors/` | EN + FR | post | Single post id 10637 (2018-05-09) | 200 | 200 |  |
| `/spotlight-nigeria-2018/` | EN + FR | post | Single post id 10636 (2018-05-03) | 200 | 200 |  |
| `/spotlight-nigeria-investment-forum/` | EN + FR | post | Single post id 10644 (2018-08-02) | 200 | 200 |  |
| `/strengthening-franco-nigerian-ties-through-nigerian-cinema/` | EN + FR | post | Single post id 10639 (2018-05-22) | 200 | 200 |  |
| `/there-is-a-way-of-doing-business-in-nigeria-alec-fokapu/` | EN + FR | post | Single post id 10641 (2018-06-21) | 200 | 200 |  |
| `/speakers/` | EN + FR | archive (speakers CPT) | Speakers archive (header 4097, title bar 3931), 6/page | 200 | 200 | 13 real + 2 demo speakers; orphan (no nav link) |
| `/speakers/adebowale-adeyeye/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/amb-tunde-mustapha/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/arnaud-floris/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/damien-de-la-rocque/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/dr-steve-ogidan-mni/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/etienne-giros/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/hon-abike-dabiri-erewa-oon/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/juliana-olayinka/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/olanrewaju-boluwaji/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/oluwajoba-oloba/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/ralph-edwards-2/` | EN + FR | speaker | Single speaker (4097/4354/4367 + demo bio block 4345) | 200 | 200 | **DEMO** – Lorem bio "Graciela is the founder at Automate All the Things", perez@seatevent.com |
| `/speakers/ralph-edwards/` | EN + FR | speaker | Single speaker (4097/4354/4367 + demo bio block 4345) | 200 | 200 | **DEMO** – Lorem bio "Graciela is the founder at Automate All the Things", perez@seatevent.com |
| `/speakers/toyosi-ayodele/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/valor-iduh/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/speakers/yves-battesti/` | EN + FR | speaker | Single speaker (header 4097, banner 4354, CTA 4367) | 200 | 200 | 2023-edition speaker |
| `/2018/09/page/1/` | EN + FR | pagination | Blog archive (noindex), 6/page | 301 → /2018/09/ | 301 → /fr/2018/09/ |  |
| `/2018/09/page/2/` | EN + FR | pagination | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/page/1/` | EN + FR | pagination | Blog archive (noindex), 6/page | 301 → /2018/ | 301 → /fr/2018/ |  |
| `/2018/page/2/` | EN + FR | pagination | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/page/3/` | EN + FR | pagination | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/author/blueinctech/page/1/` | EN + FR | pagination | Blog archive ("Spotlight Nigeria Press Team"), 6/page | 301 → /author/blueinctech/ | 301 → /fr/author/blueinctech/ |  |
| `/author/blueinctech/page/2/` | EN + FR | pagination | Blog archive ("Spotlight Nigeria Press Team"), 6/page | 200 | 200 |  |
| `/author/blueinctech/page/3/` | EN + FR | pagination | Blog archive ("Spotlight Nigeria Press Team"), 6/page | 200 | 200 |  |
| `/author/blueinctech/page/4/` | EN + FR | pagination | Blog archive ("Spotlight Nigeria Press Team"), 6/page | 200 | 200 |  |
| `/category/press-release/page/1/` | EN + FR | pagination | Blog archive (5125+5231+5264), 6/page | 301 → /category/press-release/ | 301 → /fr/category/press-release/ |  |
| `/category/press-release/page/2/` | EN + FR | pagination | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/press-release/page/3/` | EN + FR | pagination | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/press-release/page/4/` | EN + FR | pagination | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/spotlight-nigeria-2018/page/1/` | EN + FR | pagination | Blog archive (5125+5231+5264), 6/page | 301 → /category/spotlight-nigeria-2018/ | 301 → /fr/category/spotlight-nigeria-2018/ |  |
| `/category/spotlight-nigeria-2018/page/2/` | EN + FR | pagination | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/press-releases/page/1/` | EN + FR | pagination |  | 301 → /press-releases/ | 301 → /fr/press-releases/ |  |
| `/press-releases/page/2/` | EN + FR | pagination | Press Releases p.2 (canonical → /press-releases/) | 200 | 200 |  |
| `/speakers/page/1/` | EN + FR | pagination | Speakers archive p.1 | 301 → /speakers/ | 301 → /fr/speakers/ |  |
| `/speakers/page/2/` | EN + FR | pagination | Speakers archive p.2 | 200 | 200 |  |
| `/speakers/page/3/` | EN + FR | pagination | Speakers archive p.3 | 200 | 200 |  |
| `/tag/france-nigeria-partnership/page/1/` | EN + FR | pagination | Blog archive, 6/page | 301 → /tag/france-nigeria-partnership/ | 301 → /fr/tag/france-nigeria-partnership/ |  |
| `/tag/france-nigeria-partnership/page/2/` | EN + FR | pagination | Blog archive, 6/page | 200 | 200 |  |
| `/tag/spotlight-nigeria/page/1/` | EN + FR | pagination | Blog archive, 6/page | 301 → /tag/spotlight-nigeria/ | 301 → /fr/tag/spotlight-nigeria/ |  |
| `/tag/spotlight-nigeria/page/2/` | EN + FR | pagination | Blog archive, 6/page | 200 | 200 |  |
| `/organizers/` | EN + FR | archive (organizers CPT) | Blog-style archive | 200 | 200 | **DEMO** – Lists Kate Platonova & Andrew Beers (stock photos) |
| `/organizers/andrew-beers/` | EN + FR | organizer | Blog-style single | 200 | 200 | **DEMO** – Theme sample organizer, stock photo, no body |
| `/organizers/kate-platonova/` | EN + FR | organizer | Blog-style single | 200 | 200 | **DEMO** – Theme sample organizer, stock photo, no body |
| `/events/` | EN + FR | archive (events CPT) | Theme events archive | 500 | 500 | HTTP 500 on live site |
| `/events/create-a-business-model-to-grow-your-business/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/future-of-geotechnics-technology-ai-big-data/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/health-and-wellness-with-antony-dolan/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/long-covid-rehab-the-long-road-to-recovery/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/marketing-strategy-for-small-business/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/our-excellent-partner-france-pavilion-2/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/our-excellent-partner-france-pavilion-3/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/our-excellent-partner-france-pavilion/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/outside-lands-music-and-arts-festival/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/spotlight-nigeria-2023/` | EN + FR | event | Single event | 500 | 500 | Real event (sitemap image SPOT.jpg) but HTTP 500 on live site |
| `/events/therapeutic-art-workshop/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events/thursday-night-live-best-summer/` | EN + FR | event | Single event | 500 | 500 | **DEMO** – Theme stock image in sitemap; body unretrievable (HTTP 500) |
| `/events_cat/art-craft/` | EN + FR | taxonomy (events_cat) | Events taxonomy archive | 500 | 500 | **DEMO** – Demo taxonomy; HTTP 500 |
| `/events_cat/business-marketing/` | EN + FR | taxonomy (events_cat) | Events taxonomy archive | 500 | 500 | **DEMO** – Demo taxonomy; HTTP 500 |
| `/events_cat/concert-festival/` | EN + FR | taxonomy (events_cat) | Events taxonomy archive | 500 | 500 | **DEMO** – Demo taxonomy; HTTP 500 |
| `/events_cat/education-training/` | EN + FR | taxonomy (events_cat) | Events taxonomy archive | 500 | 500 | **DEMO** – Demo taxonomy; HTTP 500 |
| `/events_cat/medical-health/` | EN + FR | taxonomy (events_cat) | Events taxonomy archive | 500 | 500 | **DEMO** – Demo taxonomy; HTTP 500 |
| `/events_cat/music-entertainment/` | EN + FR | taxonomy (events_cat) | Events taxonomy archive | 500 | 500 | **DEMO** – Demo taxonomy; HTTP 500 |
| `/events_cat/technology-innovation/` | EN + FR | taxonomy (events_cat) | Events taxonomy archive | 500 | 500 | **DEMO** – Demo taxonomy; HTTP 500 |
| `/events_tag/conference/` | EN + FR | taxonomy (events_tag) | Blog-style archive (header 7445, footer 3183) | 200 | 200 | **DEMO** – Lists demo event "Therapeutic Art Workshop" |
| `/events_tag/events/` | EN + FR | taxonomy (events_tag) | Blog-style archive (header 7445, footer 3183) | 200 | 200 | **DEMO** – Lists demo event "Therapeutic Art Workshop" + "Spotlight Nigeria 2023" (links to a 500 page) |
| `/events_tag/life-style/` | EN + FR | taxonomy (events_tag) | Blog-style archive (header 7445, footer 3183) | 200 | 200 | **DEMO** – Lists demo event "Therapeutic Art Workshop" |
| `/category/agriculture/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/education/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/panels/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/press-release/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/round-table/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/snfevent2018/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/spotlight-nigeria-2018/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/technology/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/category/uncategorized/` | EN + FR | taxonomy (category) | Blog archive | 200 | 200 | Empty ("Nothing Found"); not in sitemap |
| `/category/updates/` | EN + FR | taxonomy (category) | Blog archive (5125+5231+5264), 6/page | 200 | 200 |  |
| `/tag/campus-france/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/diaspora/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/education/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/france-nigeria-partnership/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/france/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/franco-nigerian-ties/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/friends-of-nigeria-europe/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/friends-of-nigeria/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/macrons-visit-to-nigeria/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/nigeria/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/nigerian-cinema/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/nigerian-creative-arts-exchange/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/nollywood-week/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/nollywood/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/october/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/paris/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/snfevent2018/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/spotlight-nigeria-2018/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/spotlight-nigeria-france/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/tag/spotlight-nigeria/` | EN + FR | taxonomy (tag) | Blog archive, 6/page | 200 | 200 |  |
| `/author/blueinctech/` | EN + FR | author | Blog archive ("Spotlight Nigeria Press Team"), 6/page | 200 | 200 |  |
| `/2018/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/05/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/05/03/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/05/09/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/05/12/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/05/22/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/06/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/06/05/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/06/21/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/06/28/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/07/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/07/24/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/08/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/08/02/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/09/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/09/26/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/09/28/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2018/09/30/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2020/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2020/06/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2020/06/03/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2023/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2023/03/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/2023/03/31/` | EN + FR | date archive | Blog archive (noindex), 6/page | 200 | 200 |  |
| `/hf_template/404-page/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/banner-speaker-single/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/blog-sidebar/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/event-header/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/event-map-header/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/event-single-title-bar/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/events-archive-title-bar/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/footer-2/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/footer-3/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/footer-4/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/footer-5/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/footer-cta/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/footer/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/header-2/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/header-3/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/header-4/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/header-5/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/header-dark/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/header/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/headern/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/inner-title-bar/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/speaker-single-title-bar/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/title-bar-cart-checkout/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/title-bar-schedule/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/title-bar-single-shop/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/title-bar/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/hf_template/title-single-blog/` | EN | theme template (hf_template) | Internal header/footer/title-bar template | 301 → / (live check) | not crawled (sample `/fr/hf_template/footer/` → 301 /) | Live: 301 → / ; listed in Yoast sitemap |
| `/new/sponsorship-registration/` | EN + FR | legacy redirect | — | 301 → /sponsorship-registration/ | 301 → /fr/sponsorship-registration/ | Linked from homepage sponsorship block |
| `/about` | EN | variant | — | 200 | not crawled | 200 duplicate of /about/ |
| `/events` | EN | variant | — | 301 → /events/ | not crawled | 301 → /events/ (which is 500) |
| `/registration` | EN | variant | — | 200 | not crawled | 200 duplicate of /registration/ (header/footer "Register" buttons link here) |
| `/2022/12/13/` | EN + FR | broken link target | — | 404 | 404 | 404 on live; date of demo organizers (linked from /organizers/) |
| `/2023/01/03/` | EN + FR | broken link target | — | 404 | 404 | 404 on live; date of demo event (linked from /events_tag/*) |
| `/blog` | EN + FR | broken link target | — | 404 | 404 | 404 on live; linked from theme/demo markup |
| `/contact` | EN + FR | broken link target | — | 404 | 404 | 404 on live; linked from theme/demo markup |
| `/event-venue/` | EN + FR | broken link target | — | 404 | 404 | 404 on live; linked from demo markup |
| `/ghg` | EN + FR | broken link target | — | 404 | 404 | 404 on live; linked from demo markup |
| `/schedules` | EN + FR | broken link target | — | 404 | 404 | 404 on live; linked from demo markup |
| `/speaker` | EN + FR | broken link target | — | 404 | 404 | 404 on live; linked from demo markup |
| `/llms.txt` | EN | file | Generated by Hostinger Tools plugin | 200 | not crawled | Also lists demo pages |
| `/fr` | FR | variant | — | — | 200 | No-slash duplicate of `/fr/` |

### 2.1 Demo / placeholder content (verified)

| URL(s) | Evidence |
|---|---|
| `/speakers/ralph-edwards/`, `/speakers/ralph-edwards-2/` | Both titled "Ralph Edwards" ("Web Technologist" / "Co-founder"). Stock photos `andrew-466x466.jpg` and `Rolph-466x466.jpg`. Bio "Graciela is the founder at Automate All the Things…", email `perez@seatevent.com`, website `seatevent@example.com`, company "Automate All Inc", lorem ipsum "Experiences". Social links `facebook.com`, `twitter.com/login?lang=it`, `linkedin.com`. **Both are still listed on `/speakers/page/2/` and in the "Other Speakers" carousel on every speaker page.** |
| `/organizers/`, `/organizers/andrew-beers/`, `/organizers/kate-platonova/` | Theme sample organizers with stock photos `darrell.jpg` and `cameron-min-1.jpg`. Dated December 13, 2022. No body text. |
| `/events/` and 11 events: `marketing-strategy-for-small-business`, `future-of-geotechnics-technology-ai-big-data`, `create-a-business-model-to-grow-your-business`, `therapeutic-art-workshop`, `long-covid-rehab-the-long-road-to-recovery`, `health-and-wellness-with-antony-dolan`, `our-excellent-partner-france-pavilion` (+ `-2`, `-3`), `outside-lands-music-and-arts-festival`, `thursday-night-live-best-summer` | All return HTTP 500, so the bodies cannot be read. Their sitemap images are SeatEvent stock files (`event-3/4/5/6-min.jpg`, `thumbnail-1.jpg`, `slide-2.jpg`, `thubnail-event-min.jpg`, `product-school-min.jpg`, `thumbnail-bg.jpg`, `thumbnail-blog.jpg`) and they were all created on 2023-01-16/18. "Therapeutic Art Workshop" is shown on the events_tag archives. **Exception: `/events/spotlight-nigeria-2023/` is real** (image `2023/01/SPOT.jpg`) but also returns 500. |
| `/events_cat/*` (7 terms) | Generic theme categories: art-craft, business-marketing, concert-festival, education-training, medical-health, music-entertainment, technology-innovation. All 500. |
| `/events_tag/conference/`, `/events_tag/events/`, `/events_tag/life-style/` | Theme demo tags. They list "Therapeutic Art Workshop" (and "Spotlight Nigeria 2023" on `events`). Demo header 7445 and footer 3183. |
| `/schedule-horizontal-tab/` | H2 "Choose the right session from our event", "Looking for the coolest and music New York Music Festivals in 2021 & 2022?", "Down Load Agenda". Tab labels say "2014 Edition … 2022 Edition", but the body is demo text. |
| `/schedule-list/` | H2 "Join the world's leading companies at Technology Conference" (demo). The schedule widget **has been partly filled with real 2023 sessions** (4 March 2023, L'Hôtel de l'Industrie, Amb. Tunde Mustapha…). This is the same widget that is hidden on the homepage. |
| `/schedule-timeline/` | "Using your time wisely and getting the most out of all that's there.", "Dowload Agenda", "Schedule Plan". |
| `/digital-conference/` | "upcoming event / Tech summit / our big conference 2023", "Get the latest info about TECH Summit", "October 08 - October 12", "Brigton Hall, 2715 Ash Dr. San Jose, South Dakota 83475", lorem ipsum. Yoast outputs FAQPage schema. |
| `/education-webinar/` | "Live webinar / Digital learning opportunities", "21.07 Tuesday 09:30 11:30", "Why Attend Our Webinar?", speakers "Kate Platonova", "Ray Richardson", lorem ipsum. |
| `/hf_template/*` (27) | Internal Elementor header/footer/title-bar templates (header, header-2…5, header-dark, headern, footer, footer-2…5, footer-cta, title-bar, inner-title-bar, title-single-blog, blog-sidebar, speaker-single-title-bar, banner-speaker-single, events-archive-title-bar, event-header, event-single-title-bar, event-map-header, title-bar-schedule, title-bar-single-shop, title-bar-cart-checkout, 404-page). They are not demo content as such, but they are not pages. They are listed in the Yoast sitemap and 301 to `/`. |
| Demo tags with 0 posts (REST only, not in sitemap) | `business`, `conference`, `events`, `life-style`, `speaker`, `technology` |
| Demo text inside real pages (hidden or partial) | Homepage hidden pricing table and schedule (see §3.1). The speaker single CTA "Only 50 FREE tickets are available / Grab your free ticket now! / Reserve Your Seat" (`#`) is **visible** on all real speaker pages. The blog sidebar "Connect with us" icons link to bare `facebook.com/`, `twitter.com/`, `linkedin.com/`, `youtube.com/`. |

---

## 3. Per-page detail (real pages)

Unless noted otherwise, every page has header 17, footer 81 (CTA band, columns and copyright) and the hidden popups.

### 3.1 Home `/` (page id 2)

**Visible sections, in order:**

1. **Hero** (`#151d66c9`). The section background is `2023/08/HOME-HEADER-2-1.jpg`, shown in a blob mask on the right on desktop. Content:
   - Eyebrow "#SNFEvent2026", H1 **"Spotlight Nigeria"**, H3 **"Business and Investment Forum"**.
   - Icon list:
     - Location: "L'Hôtel de l'Industrie, 4 Place Saint Germain des Prés, 75006 Paris"
     - Calendar: "9th Edition | 6th October 2026"
     - Quote icon, in green caps: "TRANSLATING OPPORTUNITIES TO BUSINESS DEALS"
   - Buttons row:
     - Desktop/laptop variant `#1b28875`: gradient button **"Register"** → `https://spotlightnigeria-france.com/registration/`; a pulsing play button (**YouTube popup `https://youtu.be/ISRj4chtkpw`**); the label "Get more information" (an icon-box with no link).
     - Tablet/mobile variant `#0624738`: Register, "Get more information" (hidden on tablet) and the play button.
   - Right column image `2023/08/HOME-HEADER-2-1.jpg`, **shown on tablet/mobile only**. On desktop the image is the section background.
2. **Intro** (grey background). H2 **"The highly anticipated Spotlight Nigeria 2026"** followed by this paragraph:
   > "From the maiden edition in 2014 , **Spotlight Nigeria** has become the foremost event in France for European companies, business leaders and investors interested in investment and business opportunities in Nigeria. The event has had participation from all over Europe and Nigeria, including top executives, business leaders, prominent members of the Diaspora and reputable organizations."

   The heading widget is duplicated: `#5b7933a` is hidden on mobile and `#cde2000` is shown on mobile only.

   A **countdown** widget (`#0a26a12`) is **visible on tablet only**. It has `data-time-now="2023-10-02 07:00"`, which is stale. It displays Days/Hours/Minutes/Seconds.
3. **"Spotlight Nigeria at a glance"** (H2).
4. **At-a-glance block** (two columns):
   - Left: decorative `2022/11/plus-black-double.svg`; a **YouTube popup `https://www.youtube.com/watch?v=BEh7BWi5oTk`** (zoomInUp animation); images `2023/08/52418694368_331203a808_o.jpg` and `52418695503_2a500838eb_o` (Elementor thumb).
   - Right: a green dash heading ("-"), then this paragraph:
     > "Spotlight Nigeria offers a platform for companies and business leaders from Nigeria and the European business community to discuss concrete business and project opportunities for mutual benefits. The event is attended by a notable number of private sector business leaders, corporates, SMEs, and High Net worth Individuals (HNIs) from Nigeria across different sectors of the economy. The event also attracts the participation of representatives of strategic national or sub-national government entities, policy, and decision-makers from Nigeria."
   - Below it, a **green counter strip** with 5 Elementor counters. All animate from 0 over 2000 ms, with a "," delimiter and a "+" suffix:

     | Counter | `data-to-value` |
     |---|---|
     | Attendees | **2000** |
     | Companies Attended | **700** |
     | Organisations Impacted | **8000** |
     | Countries | **15** |
     | Speakers | **100** |
5. **Sponsorship** (two columns). The left column background is `2023/08/bg-workshop.jpg` (black-and-white audience photo). The right column is dark navy and contains:
   - Eyebrow "SPONSORSHIP", H2 **"Are you interested in sponsoring?"**
   - "Sponsoring is an opportunity to give your company unparalleled access to the stakeholders that matter and the opportunities and deals that would be discussed at the event. If you are interested in sponsoring, [please click] to register your interest, and we'll be in touch with you soon."
   - Button **"Register now"**.
   - Both links → **`/new/sponsorship-registration/`**, a legacy URL that 301s to `/sponsorship-registration/`.
6. **Partners & Sponsors**: H2 "Partners & Sponsors", subtitle "Some of our corporate partners". Then:
   - H5 **"Previous Sponsors"** + divider, then a logo slider `#34d55d0`:
     - Slick: 4 slides per view, scrolls 4, autoplay every 6000 ms, pause on hover, no arrows or dots; 4 at ≤1024 and **1 at ≤768**.
     - Clicking a logo opens a lightbox (`jws-popup-global`) on the full image.
     - Logos: `2025/06/NIG.jpg`, `2025/06/BPI.jpg`, `2025/06/CIAN.jpg`, `2025/06/EMB-FR.jpg`, `2026/03/Flutterwaves-logo.png`, `2026/03/universal_homes_fze_logo.jpg`.
   - H5 **"PREVIOUS PARTNERS"**, then a slider `#fbbf303` (5 per view, scrolls 1, **2 at ≤768**; links `#`) with 17 logos:
     - `2023/08/Copy-of-Comite-d-echanges-afrique-france-quadri-negatif.jpg` (CCI-IDF)
     - `Copy-of-Cian-LOGO-2023-JPG.jpg`
     - `Copy-of-Copy-of-bpi-france.jpg`
     - `Copy-of-Copy-of-Business_France.jpg`
     - `2024/03/4.png`
     - `2024/09/5.-Embassy-of-Nigeria-Logo.jpg`
     - `2024/09/Africalink.jpg`
     - `2024/09/MOV.png`
     - `2024/09/Office-of-the-VP.jpg`
     - `2024/07/NETIS-Logo-02.png`
     - `2026/03/Embassy-of-France-in-Nigeria.png`
     - `2026/03/Seal_of_the_Vice_President_of_Nigeria.svg`
     - `2026/03/CBL-ACP.png`
     - `2026/03/Access-bank-Uk.png`
     - `2026/03/Africa-Mutandi-scaled-1.jpg`
     - `2026/03/Bridge-and-Values-logo.png`
     - `2026/03/CCI-France-Nigeria-Logo.jpg`
   - Divider, H5 **"Previous Media PARTNERS"**, then a slider `#e9bd773` (3 per view, 1 at ≤768; lightbox) with `2024/03/5.png`, `2024/07/ryan.png` and `2026/03/Big-cabal-Media.png`.
7. **Highlights gallery** `#45e7d81`: a metro grid (layout2) of 6 tiles. Each has an H6 title and an "@Spotlight Nigeria" caption, and links to `#`:
   - PRESENTATIONS (`2023/08/S1.jpg`)
   - NETWORKING (`L1.jpg`)
   - BRAND SHOWCASE (`L2.jpg`)
   - **EHIBITIONS** (`S4.jpg`)
   - INTERACTIVE SESSIONS (`S3.jpg`)
   - SPOTLIGHT NIGERIA 2022 "Highlights" (`S5.jpg`)
8. **"What participants say"** (H2): testimonials widget `jws_testimonial_slider` `#c38204e`. It uses `slider_layout_grid layout4` and renders as **3 cards in a grid** (no real carousel). Each card has a company logo, quote, avatar, name and role:
   - "I was lucky to be part of the 2019 edition, and now to see the involvement and the progress made, and the support offered to us, thanks for having us." — **Deborah Gael**, Co-founder & COO, KOOLBOKS (logo `logo12` thumb, avatar `2023/08/deborah-gael.jpg`)
   - "For me, it is always interesting to come to this kind of event because I always find clients that are looking for excellent sales to channel to Africa and Nigeria." — **Jean-Philippe Lethon**, Business Developper, SATGURU TRAVELS (`logg-1` thumb, `2023/08/jean-philippe.jpg`)
   - "I find Spotlight Nigeria quite very useful for our business, It is a forum that we do need. We need more of these types of events and platforms to help organizations." — **Sebastian Kreitz**, Directory of Fx Sales, EBURY (`d-1` thumb, `2023/08/sebastian-kreitz.jpg`)

**Hidden/retained** (never shown):
- `#bd8d320`: H2 "Join the world's leading companies at Technology Conference" plus a `jws_events_schedule` with the 2023 "1 st Day March 4, 2023" sessions.
- `#3d3b829`: "Get your ticket" pricing table: Beginner $30/mo, Advanced $30/mo, Premium $140/mo, each "Full Conference (workshop, coffee etc) / Live videos (Can access onlie free) / Meet speaker (Ask question privately) / Buy a ticket".
- H2 "Co-organizers of the 7th edition of Spotlight Nigeria" with the NETIS logo; H2 "With the support of" with Office-of-the-VP.
- Older sponsor sliders `#2dd05e2` (2024 sponsors: ABUK Paris, Providus Bank, ABJAR Agro, Data Science Nigeria, Emerging Africa, Greenhills, Raiz, Growth Energy, Skylab, Tradeflow) and `#85e8cd4` (2023 sponsors: Schneider Electric, Taxaide, GFA, Sapphire Scents, FONIV, Aldelia, Translantic Dev, Vergnet, CSN Energy, Nessco, RIF Agro, Agrorite, Koolboks, Ensiate…).
- Older partner slider `#e8f6195` and media slider `#5664049` (Jeune Afrique, The Africa Report, JAMAA, Big Cabal…).

**Responsive notes:**
- Hero image: background on desktop, inline image on tablet/mobile.
- Sliders drop to 1–2 logos per view on mobile.
- The counters stack on mobile (see `shots/orig/home@390.png`).
- The countdown appears only between 768 and 1024px.

### 3.2 About `/about/` (page id 27, footer 3777)

1. Hero section with a starry-dot background (screenshot). H1 **"About Spotlight Nigeria"** (green).
2. **Intro, desktop/tablet variant** (`#9c64f66`, hidden on mobile). Left column:
   - H2 **"Translating Business Opportunities to Business Deals"**
   - "Spotlight Nigeria is the foremost event in France for Companies, Business Leaders and Investors interested in investment and business opportunities in Nigeria; attracting participants from all over Europe and Nigeria, including top executives, business leaders, and reputable organizations. An Initiative of Friends of Nigeria (FON) Europe"
   - Two "menu_list" items with `#` links: **Where**: "L'Hôtel de l'Industrie, 4 Place Saint Germain des Prés, 75006 Paris". **When**: "The 9th edition holds on **Tuesday, October 6th 2026**".

   Right column: an image collage of `2023/08/person1.jpg`, `2022/11/thumbnail-blog-1.jpg` (not in the media library) and `2023/08/person2.jpg`.
3. **Intro, mobile variant** (`#9c8fe45`, mobile only). The images come first, then:
   - H2 "Translating Business Opportunities to Business Deals"
   - "**Spolight** Nigeria is the foremost forum in Europe for companies, business leaders and investors interested in Nigeria. An Initiative of Friends of Nigeria (FON) Europe"
   - Where: same venue. When: "The 9th edition holds on **Wednesday, October 7th 2026**". This **contradicts** the desktop variant.
4. **"5 REASONS TO ATTEND"** (H2) with the subtitle "Participating is an opportunity to give your company unparalleled access to the stakeholders that matter and the opportunities and deals that would be discussed at the event."

   **Tabs** (`jws_tab`, pill buttons). The active tab is dark and inactive tabs have green text. Each tab body is **a single photo, with no text**:

   | Tab | Image |
   |---|---|
   | P - Promote your brand | `2023/08/52418186856_d2abe9a1c0_c-1.jpg` |
   | A - Access opportunities | `52418696698_a2f394763f_o.jpg` |
   | R - Reach out | `52418693998_3e593d1368_o.jpg` |
   | I - Initiate partnerships | `52418624605_f2a960bde0_o.jpg` |
   | S - Sign Deals | `52418184336_98a9453b47_o.jpg` |
5. **"ABOUT THE ORGANIZER"** (H2, green). FON logo `2023/08/FON-good.jpg`, then:
   > "Friends of Nigeria (FON) is a non-profit organization registered in France which is involved in facilitating the access of Nigerian professionals in Europe to business and professional development opportunities and promoting Nigeria's attractiveness to French and European companies and investors. FON is open to collaborating with organizations who are seeking opportunities to achieve their business and social objectives via this event, and also put their brand on the spotlight. Visit **FRIEND OF NIGERIA** to learn more."

   "FRIEND OF NIGERIA" links to `https://friendsofnigeria.net`.
6. Footer 3777 (see §1.4): parallax CTA, newsletter and the 2023 copyright.

**Hidden/retained:** two "Register Now" gradient buttons → `/registration/`.

### 3.3 Programme `/programme/` (page id 11439, header 11303)

**Visible content:**
1. Hero (min-height, background `2023/09/eventum-img38.jpg`, dark overlay): H1 **"COMING SOON (2026)"** and H3 **"06 October 2026"**.
2. An empty spacer section (light lavender background).
3. Footer.

**Hidden/retained:** a complete agenda of about 25 sections, laid out as time-slot rows with speaker photo cards and "Special Keynote and Special Presentation" buttons. It most likely belongs to the 2025 (8th) edition: it contains "(12:20 PM - 12:30 PM) Announcement - FON 10th year anniversary and Spotlight Nigeria 2026". The sessions are:
- (8:30–9:00) Welcome Breakfast
- Opening Remarks (John Okoro…)
- (9:00–9:10) Special Opening Remarks / Goodwill Messages (Amb. Segun Ige Wasa…)
- (9:10–9:20) Keynotes (Arnaud FLORIS, Bpifrance…)
- (9:20–9:50) Opening Plenary
- Standalone Presentation (Dr. Toyin F. Sanni)
- Finance and Digital Innovation panel
- Real Estate presentation
- Agriculture panel
- Diaspora Session
- Creative Industry panel
- FON Honorary Board Announcement
- Closing
- Lunch / Networking / B2B
- Several alternative 2024-style rows: Finance Panel, Oil and Gas, Digital Innovation, Renewable Energy…
- 2023 Plenary blocks and an "Event Schedule ROOM 1" widget

Keep this content only as source material if a future programme is needed. The live page shows only "Coming soon".

### 3.4 Registration `/registration/` (page id 5082, header 4097)

1. **Hero** (background `2022/12/hero-title-bar.jpg`, dark):
   - H3 **"Register Your Company for the Spotlight Nigeria 2026 and Unlock New Opportunities!"**
   - "We are thrilled to invite you to participate in the Spotlight Nigeria Event that brings together industry leaders, innovators, and visionaries from around the globe. This event offers an exceptional platform for companies like yours to showcase their products, network with key industry players, and explore exciting business opportunities."
2. **Two pricing-style cards** overlapping the hero. They have no prices, and each has a ticket-notch decoration:

   | Card | Top border / H4 colour | H4 | Checklist | Button |
   |---|---|---|---|---|
   | European | navy | **"Registration for European companies."** | "Access to the Plenary Sessions" · "Access to Break-out sessions" · "Access to Networking space and Exhibition hall" · "Access to Business Lunch" | Navy **"Register now"** → `https://my.weezevent.com/spotlight-nigeria-business-forum-2026?_gl=1*17n5kyq*_gcl_au*NjcyMTU0NDg3LjE3NDI5OTMzNzcuNTQyNjkxNjEyLjE3NDYxMjU2NTAuMTc0NjEyNTY1Ng` (Weezevent ticketing) |
   | Nigerian/African | green | **"Registration for Nigerian and African companies."** | "Access to the Plenary" (the word "Sessions" is missing) · same three items | Green **"Register now"** → `#elementor-action:action=popup:open&settings={"id":"10715","toggle":false}`, which opens **popup 10715** (Google Form) |
3. **"Need help?"** (H4): "Please reach out to us. We are open: **09:00H to 18:00H, Monday to Friday.**" Icon list:
   - Phone: "+33 620578844, +33 7 58 68 37 71" → `tel:+33620578844`
   - Email: "**contact @friendsofnigeria.net**" (with a space) → **`tel:+33620578844`** (wrong link)
4. Footer.

### 3.5 Press Registration `/press-registration/` (page id 10681)

- Title bar 5125: H1 "Press Registration - Spotlight Nigeria", breadcrumb "Home / Press Registration".
- **Visible**: an HTML widget containing a **Google Form iframe** `https://docs.google.com/forms/d/e/1FAIpQLSe92ZnbHdkzTXK3Wx6MAmz7XOtr2DntuFb-2tWNzefAlWnv9w/viewform?embedded=true` (800×660). It shows "Loading…" until it loads. The form is titled **"Press Registration for Spotlight Nigeria 2026"**; fields are in §4.
- A spacer that is hidden on tablet and mobile.
- **Hidden/retained:**
  - Text "Press Registration for Spotlight Nigeria 2026 is closed"
  - The original Elementor press form (fields in §4)
- Note: the Yoast og:description is built from the hidden text: "Press Registration for Spotlight Nigeria 2026 is closed Loading…".

### 3.6 Sponsorship Registration `/sponsorship-registration/` (page id 10527, header 4097)

1. Hero (background `2022/12/hero-title-bar.jpg`): H1 **"Register as a sponsor"**.
2. A centred column (side columns hidden on mobile):
   - H4 **"Sponsorship form"**: "Sponsoring is an opportunity to give your company unparalleled access to the stakeholders that matter and the opportunities and deals that would be discussed at the event. If you are interested in sponsoring, please fill this form, and we will be in touch with you."
   - Elementor form (see §4).
3. H4 **"For More Information"**: "Please **reachout** to us. We are open: 09:00H to 18:00H, Monday to Friday." Icon list:
   - "+33 620578844, +33 758683771" → `tel:+33620578844`
   - "contact@friendsofnigeria.net" → `mailto:contact@friendsofnigeria.net` (this one is correct)
4. H4 **"Follow Us"**: social icons:
   - Facebook → `https://www.facebook.com/Friends-of-Nigeria-805717569606527/`
   - Twitter → `https://twitter.com/FON_EUROPE`
   - LinkedIn → `https://www.linkedin.com/company/11407971/`
   - Instagram → `https://instagram.com/friendsofnigeria`

### 3.7 Previous Editions `/previous-editions/` (page id 10682)

- Title bar 5125: H1 "Previous Editions - Spotlight Nigeria", breadcrumb.
- Image `2023/08/72be1f3f_c-1.jpg`, then a spacer.
- H4 **"Complete the form below to download the post-event report that captures the journey of Spotlight Nigeria Business and Investment Forum over six editions"**. The og:description still says "five editions".
- Divider, then the **report-download form** (§4). Submit label: "Download Report".

### 3.8 Press Releases `/press-releases/` (page id 5458)

- Title bar 5125: H1 "Press Releases - Spotlight Nigeria", breadcrumb.
- `jws_blog` grid of all 20 posts in date order: **11 on page 1, 9 on `/press-releases/page/2/`**. Numbered pagination. Page 2 has canonical `/press-releases/`.
- Each card shows the featured image (if any), category links, H5 title (link), an excerpt, the date (→ day archive) and the author "Spotlight Nigeria Press Team" (→ author archive).
- Only 4 posts have featured images:
  - "Opportunities in the European Economy…": `2023/08/Opportunities-in-the-EU.jpeg`
  - COVID-19: `2023/08/web-image4.jpg`
  - Plenary Four: `2023/08/unnamed-1.png`
  - Nigerian Creative Arts Exchange: media 10255

### 3.9 Gallery `/gallery/` (page id 4429). Orphan: not linked from the nav.

- Title bar 5125: H1 "Gallery - Spotlight Nigeria".
- `jws_gallery` `#e9c8094`, **masonry** (layout2). It has 10 images, each linking to its full-size file for a lightbox. The first tile has the caption "PRESENTATIONS @Spotlight Nigeria"; the others show raw filenames as titles ("person1", "52418696138_53f8924a4c_o", …). The images are:
  - `2023/08/S1.jpg`
  - `person1.jpg`
  - `52418696138_53f8924a4c_o.jpg`
  - `52418695888_5e2a06013c_o-e1691753443770.jpg`
  - `52418696533_0509971051_o-e1691753478782.jpg`
  - `52418694433_04a00b2fde_o-e1691753516271.jpg`
  - `L1-1.jpg`
  - `72be1f3f_c-1.jpg`
  - `52418696698_a2f394763f_o.jpg`
  - `52418696738_8584d1e978_o.jpg`
- H3 **"Want to see more pictures from past editions?"** with a button **"Check our Flickr Gallery"** → `https://www.flickr.com/photos/157014038@N02/`.

### 3.10 Get in Touch `/get-in-touch/` (page id 4851)

- Title bar 5125: H1 "Get in Touch - Spotlight Nigeria", breadcrumb "Home / Get in Touch".
- Four icon boxes (4 × 25%, green titles; links `#`):
  - **Europe(France):** "229 rue Saint-Honoré, 75001, Paris,"
  - **Nigeria**: "Suite A301, Global Plaza, Obafemi Awolowo Way, Jabi, Abuja"
  - **Phone**: "Tel: : +33 620578844, +33 758683771" (double colon)
  - **Email**: "contact @friendsofnigeria.net" (with a space; link `#`)
- Divider. H2 **"Drop us a line"**: "Have a question, feedback or to contact our team? Use the form below and a member of our team will contact you shortly."
- Contact form (§4).

### 3.11 Privacy Policy `/privacy-policy/` (page id 3, classic editor)

- Title bar 5125.
- The body is the **unedited WordPress default template**. Every section starts with "Suggested text:". The H2s are: Who we are, Comments, Media, Cookies, Embedded content from other websites, Who we share your data with, How long we retain your data, What rights you have over your data, Where your data is sent.
- The footer "Terms" link also points here.

### 3.12 2023 Programme `/2023-programme2/` (page id 11292, header 11303). Orphan, historical.

1. Hero (background `2023/09/eventum-img38.jpg`): H1 **"Spotlight Nigeria 2023"**.
2. Intro column: image `2023/01/SPOT.jpg`, then long text that begins "Investing in Nigeria requires more than just rhetorics…" and continues "On its 6th edition this year, the summit will place a special emphasis on Nigeria's agricultural value chain, the banking & financial sector, and the country's burgeoning tech and digital industry…". A second paragraph discusses FX ("Financial services and access to foreign exchange remain a major concern…").
3. H4 **"Sectors of Focus"**: Banking / Financial Sector · Digital Technology · Agricultural value chain.
4. H4 "The various activities and sessions will address the following questions (and more);", then the list: "Why Nigeria? What are the concrete opportunities vis-a-vis the risks, and the incentives (sector specific focus)?" · "Who are the stakeholders (private and public sector) that are relevant to your success in Nigeria?"
5. H2 **"Event Schedule"**, a timeline:
   - H5 "Registration and Coffee (8am - 9am)"
   - H4 "Welcome remarks and plenary sessions" (9:00 am - 12:30 pm). Photos of Hon. Abike Dabiri-Erewa and Mr. Tunde Mustapha. Text: opening remarks, goodwill message, keynote (Stéphane Tabarié), special address, FON snapshot, Bpifrance (Arnaud FLORIS).
   - **Plenary 1**: Etienne Giros, Yves Battesti, Valor Iduh, Damien de la Rocque, "Julianna Olayinka". Text: "Opening Plenary – Business outlook France-Nigeria…", "Moderator: Juliana Olayinka", "Stand alone session: Navigating foreign exchange bottlenecks (Ebury)".
   - **Plenary 2**: Oluwajoba Oloba, Dr Steve Ogidan. "Topic: Digital Innovation and Financial Services… Olanrewaju **Ogundipe** (CEO, Imperial Edtech)… Moderator: Nicholas Norbrook".
   - **Plenary 3**: Adebowale Adeyeye, Toyosi Ayodele. "Bridging the consumer-demand gap (Agriculture, Distribution)…"
   - H5 "Networking Lunch and B2B (12:30pm - 3pm)"
6. **Hidden/retained:** H3 "Theme: Partnership that works"; "Interact with them during the event." with a 4-item list.

### 3.13 Speakers archive `/speakers/` (+ `/page/2/`, `/page/3/`). Header 4097, title bar 3931.

- Title bar: background `2022/12/hero-title-bar.jpg`, H1 "Speakers Archive - Spotlight Nigeria", breadcrumb "Home / Speakers".
- Grid of **6 per page**: photo (466×466 crop), H5 name and link. Numbered pagination 1–3. Not linked from the nav.
- Order:
  - Page 1: Olanrewaju Boluwaji, Toyosi Ayodele, Adebowale Adeyeye, Arnaud Floris, Dr Steve Ogidan mni, Valor Iduh
  - Page 2: Juliana Olayinka, Etienne GIROS, Amb. Tunde Mustapha, *Ralph Edwards (demo, -2)*, Damien de la Rocque, *Ralph Edwards (demo)*
  - Page 3: Hon. Abike Dabiri-Erewa (OON), Yves Battesti, Oluwajoba Oloba
- Several cards have no photo. Those speakers use the placeholder `2022/11/boble.svg` on their single pages.

### 3.14 Single speaker template `/speakers/<slug>/`

- Header 4097.
- Banner 4354 (background `2022/12/single-speaker-hero.jpg`): H1 name (two copies: `#3c7807a` on mobile only, `#f8a5050` hidden on mobile) and breadcrumb "Home / Speakers / {Name}".
- Two columns:
  - **Sidebar (4/12)**: photo, name, job title, social icons (all `#` for real speakers).
  - **Content (8/12)**: H4 "Sessions by {Name}", a session card (H5 "1st Day", "March 4, 2023", H5 session title, session description, "09:00 AM - 12:30 PM"), then H3 **"Other Speakers"**, a slick carousel of the other 14 speakers (including the demo ones).
- Then CTA 4367 (`#3A3386`): H4 "Only 50 FREE tickets are available", H5 "Grab your free ticket now!", button "Reserve Your Seat" → `#`. This is demo copy.
- Footer 81.

Real speaker data, all from the 2023 edition. "Session" is the session title shown on the page.

| Slug | Name | Job | Photo | Session |
|---|---|---|---|---|
| adebowale-adeyeye | Adebowale Adeyeye | CEO, Creativo El Matador | placeholder `boble.svg` | Plenary 2: Bridging the consumer-demand gap |
| amb-tunde-mustapha | Amb. Tunde Mustapha | Chargé d'affaires - Embassy of Nigeria, Paris | `2022/11/Tunde-Mustapha` | Short Plenary Sessions |
| arnaud-floris | Arnaud Floris | *(empty)* | `2022/11/Arnaud-Floris` | Short Plenary Sessions |
| damien-de-la-rocque | Damien de la Rocque | Deputy Head of Unit Sub-Saharan Africa, Monetary Cooperation and French Development Agency | placeholder | Opening Plenary |
| dr-steve-ogidan-mni | Dr Steve Ogidan, mni | CEO, Successory | `2022/11/Dr-Steeve-Ogidan` | Plenary 1: Digital Innovation and Financial Services |
| etienne-giros | Etienne GIROS | President - CIAN | placeholder | Opening Plenary |
| hon-abike-dabiri-erewa-oon | Hon. Abike Dabiri-Erewa (OON) | CEO, Nigerians in Diaspora Commission (NiDCOM) | `2022/11/HON-Abike-Dabiri` | Short Plenary Sessions |
| juliana-olayinka | Juliana Olayinka | Journalist and Broadcaster | placeholder | Opening Plenary |
| olanrewaju-boluwaji | Olanrewaju Boluwaji | CEO, Imperial Edtech | `2022/11/Olarenwaju-Boluwaji` | *(no session listed)* |
| oluwajoba-oloba | Oluwajoba Oloba | Co-Founder, The Nest Hub | placeholder | Plenary 1 |
| toyosi-ayodele | Toyosi Ayodele | CEO, Agrorite | `2022/11/Toyosi-Ayodele` | Plenary 2 |
| valor-iduh | Valor Iduh | Senior Trade Advisor - Business France, Nigeria | placeholder | Opening Plenary |
| yves-battesti | Yves Battesti | Senior Advisor – West & Central Africa, Bpifrance | placeholder | Opening Plenary |

Session numbering is inconsistent: the speaker pages call "Digital Innovation…" Plenary 1 and "consumer-demand gap" Plenary 2, while `/2023-programme2/` calls them Plenary 2 and 3.

### 3.15 Single post template `/<slug>/` (20 posts, 2018-05-03 → 2023-03-31)

- Header 17.
- Title bar 5125: H1 = Yoast title, e.g. "Opportunities in the European Economy for Nigerian Companies - Spotlight Nigeria". Breadcrumb "Home / {first category} / {title}".
- **Main column**:
  - Featured image (855×460 crop), if any
  - Category links; date (→ `/YYYY/MM/DD/`); author "Spotlight Nigeria Press Team" (→ `/author/blueinctech/`)
  - Body (classic HTML)
  - "Share via:" Facebook / X (Twitter) / LinkedIn / More (all `#`, JS share)
  - Previous/next post links with H6 titles
  - "Related Post" carousel (image, categories, H5 title, date)
- **Sidebar** (template 5231 → 5264):
  - Search
  - Categories (all 10, including Uncategorized)
  - Latest Post (3, with 80×80 thumbs)
  - Tag cloud (20 tags)
  - "Connect with us" (generic social roots)
- No comments area.
- Many 2018 post bodies embed images from **`https://172.104.245.184/~friends1/spotlightnigeria-france.com/wp-content/uploads/2018/…`**, an old host that is now unreachable. The same files 404 on the current domain. There are 13+ such images (e.g. `2018/05/SNF.jpg`, `2018/09/ATTENDING_Mrs.-Abike-Dabiri-1024x683.jpg`). The og:image of `/spotlight-nigeria-2018/` also points to that IP.

Posts with their categories (IDs: 62 Press Release, 63 Spotlight Nigeria 2018, 77 #SNFEvent2018, 76 Education, 81 Technology, 83 Agriculture, 88 panels, 89 round-table, 90 Updates):
- 2023-03-31 opportunities-in-the-european-economy-for-nigerian-companies [62, 81, 90]
- 2020-06-03 covid-19-information-the-5th-edition-of-spotlight-nigeria-moved-to-2021 [62, 90]
- 2018-09-30 ccef-nigeria-qa-session… [62, 89]
- 2018-09-30 fon-roundtable… [62, 89]
- 2018-09-28 plenary-session-1/two/three/four/five/six (6 posts) [88, 62]
- 2018-09-26 spotlight-nigeria-2018-the-diaspora-effect [77, 62, 63]
- 2018-08-02 spotlight-nigeria-investment-forum
- 2018-07-24 france-to-boost-agribusiness-ties-in-nigeria
- 2018-06-28 president-macron-to-visit-nigeria…
- 2018-06-21 there-is-a-way-of-doing-business-in-nigeria-alec-fokapu
- 2018-06-05 education-key-to-fostering…
- 2018-05-22 strengthening-franco-nigerian-ties-through-nigerian-cinema
- 2018-05-12 nigerian-creative-arts-exchange-takes-paris
- 2018-05-09 spotlight-nigeria-2018-will-highlight…
- 2018-05-03 spotlight-nigeria-2018

### 3.16 Blog archives (category / tag / date / author)

- Header 17.
- Title bar 5125 (H1 = Yoast title). Examples:
  - "Press Release Archives - Spotlight Nigeria"
  - "Press Release Archives - Page 2 of 4 - Spotlight Nigeria"
  - "Nigeria Archives - Spotlight Nigeria"
  - "2018 - Spotlight Nigeria", "May 3, 2018 - Spotlight Nigeria"
  - "Spotlight Nigeria Press Team, Author at Spotlight Nigeria"
- List: **6 posts per page**. Each item has a featured image (816×460), category links, H3 title, date and author. There is no excerpt.
- Numbered pagination. `/page/1/` 301s to the base URL.
- Sidebar 5264, same as on posts.
- `/category/uncategorized/` shows H2 "Nothing Found" and "It seems we can't find what you're looking for. Perhaps searching can help."
- Date archives are **`noindex, follow`**. Category, tag and author archives are `index, follow`.

Term counts (REST):

| Taxonomy | Term (count) |
|---|---|
| Categories | press-release (20, 4 pages), spotlight-nigeria-2018 (10, 2 pages), snfevent2018 (6), panels (6), education (2), round-table (2), technology (2), updates (2), agriculture (1), uncategorized (0) |
| Tags | france-nigeria-partnership (8, 2 pages), spotlight-nigeria (7, 2 pages), snfevent2018 (6), spotlight-nigeria-france (6), franco-nigerian-ties (4), friends-of-nigeria-europe (4), paris (4), friends-of-nigeria (3), nigeria (3), education (2), macrons-visit-to-nigeria (2), campus-france, diaspora, france, nigerian-cinema, nigerian-creative-arts-exchange, nollywood, nollywood-week, october, spotlight-nigeria-2018 (1 each) |
| Date archives | 2018 (3 pages); 2018/05, 06, 07, 08, 09 (09 has 2 pages); 2020, 2020/06; 2023, 2023/03; plus every day that has a post |
| Author | blueinctech (20 posts, 4 pages) |

---

## 4. Forms & integrations

### 4.1 Elementor Pro forms

All of them post via AJAX to `admin-ajax.php` with the hidden fields `post_id`, `form_id`, `referer_title` and `queried_id`, and they use **reCAPTCHA v2 checkbox**. The email recipients and actions (email, webhook, redirect, download) are configured server-side and **cannot be determined from the HTML**. The media library holds three candidate PDFs for the report-download action:
- `2022/11/Spotlight-Nigeria-Previous-Events-Report.pdf` ("Spotlight Nigeria Previous Events Report", 2.1 MB)
- `2022/11/Spotlight-Nigeria-_-Journey-over-5-Editions.pdf`
- `2022/11/Spotlight-Nigeria-2023-Draft-Agenda-ASAT-25092023.pdf`

The forms on Get in Touch, Previous Editions and Press Registration share the widget id `dc9487e`, because the widget was copied between pages.

**A. Contact form, `/get-in-touch/`** (form "New Form", widget `dc9487e`)

| # | Label / placeholder | Type | Field id | Required | Options |
|---|---|---|---|---|---|
| 1 | Name / "First Name *" | text (50%) | `name` | yes | |
| 2 | "Last Name *" | text (50%) | `field_691818f` | yes | |
| 3 | "Phone Number *" | text (50%) | `field_76dd513` | yes | |
| 4 | Email / "Email *" | email (50%) | `email` | yes | |
| 5 | "Which best describes you? *" | select | `field_4a8a04a` | yes | Entrepreneur/ Startup · Investor · Solutions Provider · Media/ PR · Non-profit/ Industry Association · **Goverment** · Other |
| 6 | "Inquiry Type *" | select | `field_75de395` | yes | General · Attendance · Sponsorship/Exhibition · Speaking |
| 7 | Message / "Your message *" | textarea | `message` | **no** (placeholder has `*`) | |
| 8 | reCAPTCHA v2 | | | | |

Submit button: **"Submit"** (full width).

**B. Report download, `/previous-editions/`** (widget `dc9487e`)

| # | Label / placeholder | Type | Field id | Required | Options |
|---|---|---|---|---|---|
| 1 | "First Name *" | text 50% | `name` | yes | |
| 2 | "Last Name *" | text 50% | `field_691818f` | yes | |
| 3 | "Phone Number *" | text 50% | `field_76dd513` | yes | |
| 4 | "Email *" | email 50% | `email` | yes | |
| 5 | "Which best describes your company industry? *" | select | `field_4a8a04a` | yes | Agriculture · Fashion and Cosmetics · ICT · Digital and Entertainment · Energy · Finance · Media · Multisector Company · Consulting and services · NGO/Foundation/Association · Government · Regulator · Academic/Research Institution · Embassies/Consulates/Trade Mission |
| 6 | "City" | text 50% | `field_273cbe3` | yes | |
| 7 | "Job Title" | text 50% | `field_3b62a54` | yes | |
| 8 | "Job Function" | text 100% | `field_d133f58` | yes | |
| 9 | reCAPTCHA v2 | | | | |

Submit button: **"Download Report"**.

**C. Sponsorship, `/sponsorship-registration/`** (widget `c4e8047`)

| # | Label / placeholder | Type | Field id | Required |
|---|---|---|---|---|
| 1 | "Your Name" | text | `name` | no |
| 2 | "Company name" | text | `field_13e12ac` | no |
| 3 | Email / "Your Email (name@website.com)" | email | `email` | **yes** |
| 4 | Message / "Your message" | textarea | `field_a8e9723` | no |
| 5 | reCAPTCHA v2 | | | |

Submit button: **"Submit"**.

**D. Press registration (Elementor), `/press-registration/`** (widget `dc9487e`). **Hidden/retained; not shown to visitors.**

| # | Label / placeholder | Type | Field id | Required | Options |
|---|---|---|---|---|---|
| 1 | "First Name *" | text | `name` | yes | |
| 2 | "Last Name *" | text | `field_691818f` | yes | |
| 3 | "Phone Number *" | text | `field_76dd513` | yes | |
| 4 | Job / "Job Title" | text | `field_e5b789f` | yes | |
| 5 | "Email *" | email | `email` | yes | |
| 6 | "Are you fluent in English? *" | select | `field_4a8a04a` | yes | Yes · No |
| 7 | "Media Organisation" | text | `field_8b91ad8` | yes | |
| 8 | "Website Address" | text | `field_d606ddd` | yes | |
| 9 | (HTML heading "Media Category") + "Media Category Options" | checkboxes | `field_b6a3ddd` | no | Press · News agency · Magazine · Radio · TV · Online Daily · Newspaper · Investment Media |
| 10 | (HTML heading "Media Coverage") + "Media Coverage Options" | checkboxes | `field_682f07b` | no | Interviews · Post-event report · Pre-event publicity |
| 11 | "Where will these be published? *" | text | `field_49cb0a8` | yes | |
| 12 | "Date of publication" | date | `field_5df151a` | yes | |
| 13 | "Twitter Account" | text | `field_5ffecd7` | yes | |
| 14 | "LinkedIn Account" | text | `field_5572f56` | yes | |
| 15 | "To complete your registration, please click to accept the term below:" | acceptance | `message` | yes | "I will notify the organizers of Spotlight Nigeria within one week to the event if I am unable to attend the event." |
| 16 | reCAPTCHA v2 | | | | |

Submit button: "Submit".

**E. Newsletter, About page footer 3777** (widget `2cf2898`). One field: Email / "Enter your email" (email, 70% width, required). Submit button **"Subscribe"** (30% width). The destination cannot be determined from the HTML.

### 4.2 External forms and ticketing

**F. Popup 10715, "Registration for Nigerian and African companies."** It is opened only by the green "Register now" button on `/registration/`. The popup contains:
1. The logo `2022/11/spotlight-nigeria-france.png`
2. H2 **"Registration for Nigerian and African companies."**
3. An HTML widget with a Google Form iframe `https://docs.google.com/forms/d/e/1FAIpQLSc7PEfB8gzAFkTFg6nVus0RIh9TBeo7TDaUqsiedpigeexaew/viewform?embedded=true` (name "2024 spotlight", 1000×1000, scrolling)
4. A spacer

The overlay is `rgba(0,0,0,.8)`. Google Form title: **"Registration Form - SN2026"**. Description: "This form is for persons, companies or organizations interested in participating in the Spotlight Nigeria Business and Investment Forum 2026 in Paris - 6th October, 2026". Fields (read from the public form definition):

| # | Question | Type | Required | Options |
|---|---|---|---|---|
| 1 | First Name | short text | yes | |
| 2 | Last Name | paragraph | yes | |
| 3 | Name of Company / Organization | paragraph | yes | |
| 4 | Role / Position | paragraph | yes | |
| 5 | Email address | paragraph | yes | |
| 6 | Phone Number | short text | yes | |
| 7 | Sector of Activities (E.g. Agriculture, Renewable Energy, Technology, Education, etc.) | paragraph | yes | |
| 8 | Company website | paragraph | no | |
| 9 | Country of operation | paragraph | yes | |
| 10 | Company year of creation | short text | yes | |
| 11 | Number of employees | multiple choice | yes | Self employed · 1 - 10 · 11 - 50 · 51 - 100 · 100 and above |
| 12 | Participation level at the event | checkboxes | yes | Delegate · Exhibitor · Sponsor |
| 13 | How did you hear about Spotlight Nigeria 2026? | checkboxes | yes | Mailing / Newsletter · LinkedIn · Referral (a friend or professional contact) · Online through other social media or news platforms · FNCCI · (Other – free text) |
| 14 | Which association, organization, business group, chamber of commerce or FON's partner are you affiliated with? Mention the name of the organization | paragraph | no | |
| 15 | Other Comments | paragraph | no | |
| 16 | Section "Privacy": "The personal information collected is processed by Friends of Nigeria (FON). They are necessary for your access to the event and to send you communications about the event and other activities by the …" (truncated in the form data) | text block | | |

Submissions go to the Google Form owner's response sheet.

**G. Press Registration Google Form** (visible on `/press-registration/`). Title: "Press Registration for Spotlight Nigeria 2026". Description: "Media accreditation is granted solely for the purpose of covering any concerned FON event including Spotlight Nigeria. Submitting an application does not automatically guarantee accreditation. The Spotlight Nigeria Organising Committee reserves the right to approve or decline any application based on the event's media objectives and operational requirements." Fields (all required):

| # | Question | Type | Options |
|---|---|---|---|
| 1 | Full Name | short text | |
| 2 | Job Title | short text | |
| 3 | Email Address | short text | |
| 4 | Telephone Number | short text | |
| 5 | Country | short text | |
| 6 | Media Organisation | paragraph | |
| 7 | Website | paragraph | |
| 8 | Type of Media | checkboxes | Print Media, Television, Radio, Online publications, Business publications, News agencies, Photographers, Videographers, Podcasters, Content Creator |
| 9 | Professional Credentials | checkboxes | Press Card, Media Identification |
| 10 | Link to portfolio or recent articles or reports | paragraph | |
| 11 | Coverage Details | checkboxes | Photography, Video Coverage, Written Reporting, Interviews, Live Coverage, Social Media Coverage |

It ends with the text block "Kindly send your Professional Credentials (Press card or Media Identification) via email to contact@friendsofnigeria.net".

**H. Weezevent**
- The European "Register now" button on `/registration/` links to `https://my.weezevent.com/spotlight-nigeria-business-forum-2026?_gl=…` (new tab not specified).
- Popup **10603** contains a Weezevent embed (`<a class="weezevent-widget-integration" data-src="https://widget.weezevent.com/ticket/E1834169/?code=59783&locale=en-GB&width_auto=1&color_primary=00AEEF" data-id="1834169">` + `https://widget.weezevent.com/weez.js`). Its heading is "Registration for Spotlight 2026" and its text is "After your registration and payment, you will receive a confirmation email with your ticket." No page triggers it.

### 4.3 External links

| Purpose | URL |
|---|---|
| Flickr album (header "Spotlight Photostream") | `https://www.flickr.com/photos/157014038@N02/albums/72177720329310046/` |
| Flickr album (footer 81 "Spotlight Photostream") | `https://www.flickr.com/photos/157014038@N02/albums/72177720321269494/` |
| Flickr photostream root (Gallery button, About footer) | `https://www.flickr.com/photos/157014038@N02/` |
| YouTube channel ("Spotlight Videostream") | `https://www.youtube.com/channel/UC52gKkRlNU5rZ2SiK5R9z4A` |
| YouTube videos (popups) | `https://youtu.be/ISRj4chtkpw` (hero), `https://www.youtube.com/watch?v=BEh7BWi5oTk` (at a glance) |
| Facebook | `https://www.facebook.com/Friends-of-Nigeria-805717569606527/` |
| Twitter/X | `https://twitter.com/FON_EUROPE` |
| LinkedIn | `https://www.linkedin.com/company/11407971/` |
| Instagram | `https://instagram.com/friendsofnigeria` |
| Organizer | `https://friendsofnigeria.net` |
| Developer credit | `https://blueinctech.com` |
| Contact | `contact@friendsofnigeria.net`; +33 6 20 57 88 44; +33 7 58 68 37 71; Paris office 229 rue Saint-Honoré 75001; Abuja office Suite A301, Global Plaza, Obafemi Awolowo Way, Jabi |
| Venue | L'Hôtel de l'Industrie, 4 Place Saint Germain des Prés, 75006 Paris |

---

## 5. SEO

**No page has a meta description**: Yoast is not outputting `<meta name="description">` anywhere. Every page has:
- the Yoast title pattern "{Title} - Spotlight Nigeria"
- `og:site_name` "Spotlight Nigeria"
- `og:locale` `en_US` (EN) or `fr_FR` (FR)
- `twitter:card` = `summary_large_image`
- self-referencing canonicals (FR canonicals point to `/fr/…`)
- **hreflang** alternates `en-US`, `fr-FR`, `en`, `fr` (EN → `/path/`, FR → `/fr/path/`)

There is no `x-default`. Titles and `og:title` are **not translated** on FR pages.

| Page | `<title>` | Canonical | og:type | og:image | og:description (start) | Robots |
|---|---|---|---|---|---|---|
| `/` | Spotlight Nigeria - Business and Investment Forum - Spotlight Nigeria | `/` | website | `2023/08/HOME-HEADER-2-1.jpg` (898×1382) | "#SNFEvent2026 Spotlight Nigeria Business and Investment Forum L'Hôtel de l'Industrie, … 9th Edition \| 6th October 2026" | index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1 |
| `/about/` | About - Spotlight Nigeria | `/about/` | article | `2023/08/person1.jpg` | "About Spotlight Nigeria Translating Business Opportunities to Business Deals Spotlight Nigeria is the foremost event…" | same |
| `/programme/` | Programme - Spotlight Nigeria | `/programme/` | article | `2023/09/favi.jpg` | "COMING SOON (2026) 06 October 2026 (8:30 AM- 9:00 AM) Welcome Breakfast…" (built from the hidden agenda) | same |
| `/registration/` | Registration - Spotlight Nigeria | `/registration/` | article | — | "Register Your Company for the Spotlight Nigeria 2026 and Unlock New Opportunities! …" | same |
| `/press-registration/` | Press Registration - Spotlight Nigeria | `/press-registration/` | article | — | "Press Registration for Spotlight Nigeria 2026 is closed Loading…" | same |
| `/sponsorship-registration/` | Sponsorship Registration - Spotlight Nigeria | `/sponsorship-registration/` | article | — | "Register as a sponsor Sponsorship form Sponsoring is an opportunity…" | same |
| `/previous-editions/` | Previous Editions - Spotlight Nigeria | `/previous-editions/` | article | `http://…/2023/08/72be1f3f_c-1.jpg` | "Complete the form below to download the post-event report … over five editions." | same |
| `/press-releases/` | Press Releases - Spotlight Nigeria | `/press-releases/` (page 2 also canonicalises here) | article | `http://…/2022/12/Supercharge-Your-Event-Strategy-scaled.jpg` (**demo**) | "Life style Supercharge Your Event Strategy As a creator…" (**demo**) | same |
| `/gallery/` | Gallery - Spotlight Nigeria | `/gallery/` | article | `http://…/2023/08/S1.jpg` | "PRESENTATIONS @Spotlight Nigeria person1 52418696138_…" | same |
| `/get-in-touch/` | Get in Touch - Spotlight Nigeria | `/get-in-touch/` | article | — | "Europe(France): 229 rue Saint-Honoré, 75001, Paris, Nigeria Suite A301…" | same |
| `/privacy-policy/` | Privacy Policy - Spotlight Nigeria | `/privacy-policy/` | article | — | "Who we are Suggested text: Our website address is…" | same |
| `/2023-programme2/` | 2023 Programme2 - Spotlight Nigeria | `/2023-programme2/` | article | `http://…/2023/01/SPOT.jpg` | "Spotlight Nigeria 2023 Theme: Partnership that works…" | same |
| `/speakers/` | Speakers Archive - Spotlight Nigeria | `/speakers/` | website | — | — | same |
| `/speakers/<slug>/` | {Name} - Spotlight Nigeria | self | article | — | — | same |
| Post | {Post title} - Spotlight Nigeria | self | article | featured image or embedded image (some from `172.104.245.184`) | excerpt; plus `article:published_time` / `modified_time`, `twitter:label1` "Written by" / "Spotlight Nigeria Press Team", reading time | same |
| Category / tag | {Term} Archives - Spotlight Nigeria | self (paged: self) | article | — | — | index, follow |
| Author | Spotlight Nigeria Press Team, Author at Spotlight Nigeria | self | profile | — | — | index, follow |
| Date archives | {Date} - Spotlight Nigeria | none | website | — | — | **noindex, follow** |
| Organizers (demo) | organizers Archive / {Name} - Spotlight Nigeria | self | website/article | — | — | index, follow |

**Yoast schema** (`@graph` types found):
- `WebSite`: name "Spotlight Nigeria", description "Business and Investment Forum", with a `SearchAction` on `/?s=`
- `WebPage`, `ImageObject` (primaryimage), `BreadcrumbList`
- `Article` + `Person` (author) on posts
- `CollectionPage` on archives
- `ProfilePage` + `Person` on the author archive
- `FAQPage` only on demo `/digital-conference/`

No `Organization` and no `Event` schema is output.

---

## 6. French version (`/fr/`)

- **Coverage:** every EN URL that returns 200 also returns 200 under `/fr/` (130 FR URLs), including the demo pages, organizers, events_tag archives and all blog archives. `/fr/events/*` and `/fr/events_cat/*` return 500, like EN. `/fr/llms.txt` is 404.
- **Layout:** **no FR page has a different layout.** For every main page (home, about, programme, registration, press/sponsorship registration, previous editions, press releases, gallery, get in touch, privacy, 2023 programme, speakers, speaker single, post single, category archive), the ordered list of Elementor element IDs and their visibility classes is identical between EN and FR. TranslatePress translates strings in place. Images, links to external services, the counters' `data-to-value`, the forms' field IDs and the Google Form / Weezevent URLs are the same. The Google Form itself is English-only.
- **Internal links** are rewritten to `/fr/…`, e.g. footer "S'inscrire maintenant" → `http://…/fr/registration/`. In the language switcher on FR pages, "French" is current (`#`) and "English" → `/`.
- Posts and speaker pages are translated too. For example, `/fr/spotlight-nigeria-2018/` reads "La 3ème édition de Spotlight Nigeria est le plus grand rassemblement des Chefs d'Entreprises France-Nigeria…", with the H1 "Spotlight Nigéria 2018 - Spotlight Nigéria". The privacy boilerplate becomes "Qui nous sommes / Texte suggéré : …".

**Examples of translated strings (EN → FR, verbatim):**

| EN | FR |
|---|---|
| Home / About Us / Registrations / Media / Contact | **Maison** / À propos de nous / Inscriptions / Médias / Contact |
| Delegate Registration / Press Registration / Previous Editions | Inscription des délégués / Inscription presse / Éditions précédentes |
| Spotlight Photostream / Spotlight Videostream / Press Releases | **Flux de photos en vedette** / Flux vidéo Spotlight / Communiqués de presse |
| Register (header and hero buttons) | **Registre** |
| Register now | S'inscrire maintenant |
| Spotlight Nigeria (H1) / Business and Investment Forum | Spotlight Nigéria / Forum des affaires et de l'investissement |
| TRANSLATING OPPORTUNITIES TO BUSINESS DEALS | TRADUIRE LES OPPORTUNITÉS EN AFFAIRES COMMERCIALES |
| Get more information | Obtenir plus d'informations |
| Spotlight Nigeria at a glance | Spotlight Nigeria en un coup d'oeil |
| Counters: Attendees / Countries / Speakers | Participants / **Des pays** / **Haut-parleurs** (literally "loudspeakers") |
| SPONSORSHIP / Are you interested in sponsoring? | PARRAINAGE / Êtes-vous intéressé à parrainer? |
| About Spotlight Nigeria | À propos de Spotlight Nigéria |
| Translating Business Opportunities to Business Deals | Traduire les opportunités commerciales en transactions commerciales |
| Registration for European companies. | Inscription pour les sociétés européennes. |
| Registration for Nigerian and African companies. | Enregistrement pour les entreprises nigérianes et africaines. |
| Register as Sponsor | Inscrivez-vous en tant que parrain |
| Get in Touch (breadcrumb) / Get in Touch - Spotlight Nigeria (H1) | Entrer en contact / Contactez-nous - Spotlight Nigeria |
| Want to see more pictures from past editions? | Vous voulez voir plus de photos des éditions précédentes ? |
| Your Name / Submit | votre nom / Soumettre |
| Designs by Blueinc | **Dessins de Blueinc** |
| Privacy / Terms / Sitemap | Confidentialité / Termes / Plan du site |
| Sessions by … / 1st Day | Séances par … / 1er jour |

Several FR strings are poor machine translations ("Maison", "Registre", "Haut-parleurs", "Dessins de Blueinc", "Flux de photos en vedette"). They are recorded here as found.

**Untranslated strings on FR pages** (identical to EN):
- Home: "The highly anticipated Spotlight Nigeria 2026", "Companies Attended", "Organisations Impacted", "Previous Sponsors", "Previous Media PARTNERS", "#SNFEvent2026", "@Spotlight Nigeria", the nav item "Programme"
- About: both "The 9th edition holds on Tuesday, October 6th 2026" and "…Wednesday, October 7th 2026"; the venue address
- Registration: the H3 "Register Your Company for the Spotlight Nigeria 2026 and Unlock New Opportunities!" (the paragraph below it is translated)
- Press registration (hidden): "Press Registration for Spotlight Nigeria 2026 is closed"
- Programme: "COMING SOON (2026)" and the whole hidden agenda
- Sponsorship: "Message", social labels
- All `<title>`/`og:title` values
- The Google Forms and Weezevent

---

## 7. Content issues found (recorded, not fixed)

| # | Issue | Where |
|---|---|---|
| 1 | All `/events/*` (12 + archive) and `/events_cat/*` (7) URLs return **HTTP 500** in EN and FR, yet they are listed in the Yoast sitemaps. `/events_tag/events/` links to `/events/spotlight-nigeria-2023/` (500). | events CPT |
| 2 | Theme demo content is published and indexable. See §2.1 (31 URLs plus FR variants, including 2 demo speakers listed among real ones). | various |
| 3 | `/hf_template/*` (27 internal templates) are listed in the sitemap and 301 to the homepage. | sitemap |
| 4 | **Inconsistent event date** on About: the desktop/tablet copy says "Tuesday, October 6th 2026"; the mobile copy says "Wednesday, October 7th 2026". 6 Oct 2026 is a Tuesday. Home, Programme and the Google Form say 6 October 2026. | `/about/` |
| 5 | Typos: "**EHIBITIONS**" (home highlights), "**Spolight** Nigeria" (About mobile), "Can access **onlie** free" (hidden pricing), "Please **reachout**" (sponsorship), "Business **Developper**" and "**Directory** of Fx Sales" (testimonials), "**Goverment**" (contact form option), "**Dowload** Agenda" / "Down Load Agenda" (demo), "FRIEND OF NIGERIA" (About link text), "Tel: :" double colon (contact), "Access to the Plenary" (missing "Sessions" on the African card), "Julianna Olayinka" vs "Juliana Olayinka", "Dr-Steeve-Ogidan" image name, "L'Hôtel de l'Industrie, 4 Place Saint Germain **de** Prés" (schedule widget) vs "des Prés". | various |
| 6 | Email shown as "**contact @friendsofnigeria.net**" (with a space). On `/registration/` it is linked as **`tel:+33620578844`**; on `/get-in-touch/` it is linked to `#`. Only `/sponsorship-registration/` has a correct `mailto:contact@friendsofnigeria.net`. | registration, get-in-touch |
| 7 | Counters (2000+ attendees, 700+ companies, **8000+ organisations impacted** (more than the attendee count), 15+ countries, 100+ speakers) are hard-coded marketing figures. They are not translated on FR ("Companies Attended", "Organisations Impacted") or are badly translated ("Haut-parleurs"). | home |
| 8 | Countdown widget target `2023-10-02 07:00` (stale). Visible on tablet only. | home |
| 9 | Homepage sponsorship links use the legacy `/new/sponsorship-registration/` (301). | home |
| 10 | Header/footer links use `http://` and `/registration` without a trailing slash. `/registration` and `/about` are served 200, which is duplicate content with no redirect. | global |
| 11 | Two different Flickr album URLs (header vs footer) and the photostream root (gallery, about footer). | global |
| 12 | Footer "Terms" points to the Privacy Policy; "Sitemap" → `#`. The About footer has © 2023 and all of Privacy/Terms/Sitemap → `#`. | footer |
| 13 | Privacy Policy is the unedited WordPress default ("Suggested text: …"). | `/privacy-policy/` |
| 14 | No meta descriptions anywhere. The `og:description` on `/press-releases/` and its `og:image` come from a deleted demo post ("Supercharge Your Event Strategy"). `/previous-editions/` og:description says "five editions" while the page says "six". `/programme/` og:description is built from hidden content. | SEO |
| 15 | 2018 posts embed images from `https://172.104.245.184/~friends1/…` (unreachable); the same paths 404 on the current domain. | posts |
| 16 | Speaker CTA "Only 50 FREE tickets are available / Grab your free ticket now! / Reserve Your Seat" (`#`) is demo copy shown on all real speaker pages. 7 of 13 real speakers have the placeholder photo `boble.svg`. Arnaud Floris has no job title. "Olanrewaju Boluwaji" (speaker CPT) vs "Olanrewaju Ogundipe" (2023 programme), both "CEO, Imperial Edtech". Plenary numbering differs between the speaker pages and the 2023 programme. | speakers |
| 17 | Blog sidebar "Connect with us" links to bare `facebook.com/`, `twitter.com/`, `linkedin.com/`, `youtube.com/`. | posts/archives |
| 18 | Gallery tiles show raw filenames as titles ("52418696138_53f8924a4c_o", "L1", "person1"). | gallery |
| 19 | The WP site icon is the developer's logo (`cropped-fav_Blueinc-Technologies.png`), declared alongside the Spotlight favicon. | `<head>` |
| 20 | The `/programme/` hero says "COMING SOON (2026)" one month after the 6 Oct 2026 event (audit date 2026-10-28). The registration and press registration pages still invite 2026 sign-ups. | programme, registrations |
| 21 | Popup 10603 (Weezevent embed) has no trigger. The Google Form iframe in popup 10715 is named "2024 spotlight". | popups |
| 22 | **Privacy/security:** `/wp-content/uploads/2022/11/attendee_list-13.csv` ("attendee_list (13)") is publicly listed in the REST media endpoint and returns 200. It was not opened during this audit, but by its name it likely contains personal data. **Do not migrate**; the site owner should remove it. A `drive-download-20230815T111011Z-001.zip` is also public. | media library |
| 23 | `/category/uncategorized/` (empty, "Nothing Found") is served 200 and indexable. The sidebar lists "Uncategorized". | archives |
| 24 | `/llms.txt` (Hostinger) lists the demo pages and the demo press-release excerpt, and links a Hostinger MCP endpoint. | root |

---

## 8. Media

`wp/rest/media.json` contains **599 items**. The live REST header `X-WP-Total` reports **741**, but paging through the public endpoint again also returned 599, so 142 items are not publicly listed (probably attached to non-public posts). In addition, several files that visible pages use are **not** in the public listing:
- `2022/11/Tunde-Mustapha.jpg`, `Arnaud-Floris.jpg`, `Toyosi-Ayodele.jpg`, `Olarenwaju-Boluwaji.jpg`, `Dr-Steeve-Ogidan.jpg`, `HON-Abike-Dabiri.jpg`, `Etienne-GIROS.jpg`, `Valor-Iduh.jpg`, `Damien-De-La-Rocque.jpg`, `Rolph.jpg`, `andrew.jpg`
- `2022/12/Adebowale.jpg`
- `2023/01/SPOT.jpg`
- `2022/11/thumbnail-blog-1.jpg`
- `white-favicon-1-180x180-1.png`

When migrating assets, take files from the page HTML, not only from the media listing.

**By year (upload folder) and MIME type:**

| Year | JPEG | PNG | SVG | WebP | GIF | PDF | ZIP | CSV | MP4 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| 2022 | 52 | 37 | 71 | – | – | 3 | – | 1 | 1 | **165** |
| 2023 | 244 | 61 | 9 | 3 | 2 | – | 1 | – | – | **320** |
| 2024 | 14 | 57 | – | – | – | – | – | – | – | **71** |
| 2025 | 30 | 2 | – | – | – | – | – | – | – | **32** |
| 2026 | 3 | 6 | 1 | – | – | – | – | – | – | **10** |
| (no year folder) | – | 1 | – | – | – | – | – | – | – | **1** |
| **Total** | 343 | 164 | 81 | 3 | 2 | 3 | 1 | 1 | 1 | **599** |

Non-image media:
- `2022/11/Spotlight-Nigeria-Previous-Events-Report.pdf`
- `2022/11/Spotlight-Nigeria-_-Journey-over-5-Editions.pdf`
- `2022/11/Spotlight-Nigeria-2023-Draft-Agenda-ASAT-25092023.pdf`
- `2023/08/drive-download-20230815T111011Z-001.zip`
- `2022/11/attendee_list-13.csv` (**sensitive, see §7 #22**)
- `2022/11/arena.mp4` (theme demo video)

Most of the 71 SVGs from 2022 are theme demo icons.

**Referenced by visible pages.** These are images in visible Elementor elements on the real pages, in the header and footers, in CSS backgrounds, and in the speaker and press-release lists. Hidden elements, demo pages and post bodies are excluded.

| Upload year | In media listing | Referenced by visible pages |
|---|---|---|
| 2022 | 165 | 3 |
| 2023 | 320 | 43 |
| 2024 | 71 | 8 |
| 2025 | 32 | 4 |
| 2026 | 10 | 10 (all) |

That is about 82 distinct files in total, of which about 67 match items in the public media listing; the other 15 are listed above. Main groups:
- Hero and section backgrounds:
  - `2023/08/HOME-HEADER-2-1.jpg`, `2023/08/bg-workshop.jpg`
  - `2022/12/hero-title-bar.jpg`, `2022/12/single-speaker-hero.jpg`, `2022/12/paralax-about.jpg`
  - `2023/09/eventum-img38.jpg`
- Brand: `2022/11/spotlight-nigeria-france.png` (logo), `2022/11/favicon.png`, `white-favicon-1-180x180-1.png`, `2023/08/FON-good.jpg`
- Event photos (`2023/08/52418…_o.jpg` Flickr exports, `S1/S3/S4/S5/L1/L2.jpg`, `person1/2.jpg`, `72be1f3f_c-1.jpg`)
- Testimonial avatars and logos
- Sponsor, partner and media logos from 2023/08, 2024/03–09, 2025/06 and 2026/03
- Speaker photos (2022/11)
- Post featured images (2023/08)

Everything else in the library is unreferenced on visible pages: demo assets, retained hidden logos, and old uploads.
