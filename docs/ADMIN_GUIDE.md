# Spotlight CMS — Administrator & editor guide

Sign in at **`/admin/`**, for example `https://spotlightnigeria-france.com/admin/`. The CMS replaces the WordPress dashboard. Everything the public site shows (pages, posts, menus, logos, footer text, forms) is edited here, without code.

## Roles

| Role | Can do |
|---|---|
| **Administrator** | Everything, including users, site settings, redirects and the activity log |
| **Editor** | Create, edit and publish all content; media; navigation; events, speakers, partners and testimonials; read form submissions |
| **Author** | Write their own posts and submit them for review; upload media. Cannot publish or edit pages |

## Everyday tasks

### Edit a page

1. Go to **Pages** and click a page title. The editor shows the page as a list of **blocks**, such as Hero, Stats, Partners, Testimonials or Form.
2. Click a block to edit its settings in the right-hand panel: text, images, buttons and links.
3. Use the controls on each block to:
   - **drag** it or use ↑/↓ to reorder;
   - **duplicate** or **hide** it (hidden blocks stay in the page but aren't shown);
   - **delete** it (you can undo from the notification).
4. Click **+** between blocks to insert a new one from the block library.
5. The **Page** tab holds the title, address (slug), parent page, language, header/footer style, featured image and SEO fields (title, description, social image). It also shows a Google-style preview.
6. Use **Preview** to see unsaved changes exactly as they will look; nothing is published.
7. On a published page, **Update** makes the changes live. On a draft, use **Save draft**, then **Publish** (or set a future date to schedule).

Your work is **autosaved** every 15 seconds. If you leave with unsaved changes, the browser warns you. **History** lists earlier versions; restore one with a click. Ctrl/Cmd + S saves.

### Write a post (press release)

1. Go to **Posts → New post**. Enter a title and write the body (headings, lists, links and images are supported).
2. In the sidebar:
   - choose categories and tags (you can create them there);
   - set a featured image and an excerpt;
   - fill in the byline (for example "Spotlight Nigeria Press Team").
3. **Publish**, **Schedule** (future date) or **Save draft**. Authors use **Submit for review**; editors see posts waiting for review on the dashboard.
4. Posts appear on **Press Releases** and on their category pages automatically.

### French versions

- Every page and post exists separately in English and in French. Lists show **"FR missing"** when there is no French version.
- **Add French version** creates a French draft as a copy of the English content, ready to translate. Nothing is machine-translated.
- French pages use the same slug under `/fr/`. The language switcher and search engines (hreflang) link the two versions automatically.
- Speakers, testimonials, events, categories and tags have their own French fields. Menus and site settings have English and French versions side by side. An empty French field falls back to English on the site.

### Images and documents — Media

- **Upload** by dragging files onto the Media page or any image field. Accepted: JPG, PNG, WebP, GIF, AVIF, SVG and PDF, up to 15 MB.
- Click a file to edit its **alt text** (EN and FR; describe the image for screen-reader users), title, caption and description. You can also **replace** the file: every page, post and bio that uses it updates, including images placed inside text.
- **On Vercel, uploads are limited to about 4.5 MB per file** by the hosting platform (the CMS itself allows 15 MB). Resize large photos and compress PDFs before uploading.
- **Where it's used** lists every page and record that references the file. Files in use can't be deleted.

### Menus — Navigation

- Choose a menu: the header, one of the three footer columns (the menu name is the column heading), or the legal links. Then choose the language.
- Add a **page**, which keeps working if the page's address changes; a **custom link**; or a **dropdown heading**. Drag items to reorder them, or drag one under another to make a dropdown.
- **Save** publishes the menu immediately. For French, **Copy structure from English** gives you a starting point.

### The forum — Events, Speakers, Partners, Testimonials

- **Events** holds one record per edition: dates, venue, theme, registration link, banner and gallery.
  - **Current edition** marks the edition being promoted.
  - The **Programme** tab manages sessions by day, with speakers and moderators.
  - The **Partners** tab attaches sponsors and partners with a tier.
  - Past editions stay as **Archived**, so their programmes remain available.
  - The draft event "Programme agenda (hidden on WordPress)" holds an agenda that was hidden on the old site. Review it, or delete it.
- **Speakers** are reused across sessions and pages. Each published speaker has a public page at `/speakers/<slug>/`.
- **Partners** are logos reused by the **Partners** blocks on pages and by events. Rename them here; some imported names come from file names.
- **Testimonials** appear in the "What participants say" slider. Toggle **Visible** to show or hide each one.

### Form submissions

The website's forms are contact, sponsorship, report download, press and newsletter.

- Every submission is stored in **Submissions** and emailed to the address set in **Settings → Notifications** (once email is configured).
- Filter by form or status, open a submission to read it, reply by email, mark it read, archived or spam, or **Export CSV**.
- A warning on a submission means the notification email has not been sent yet, with the reason (for example "Email not configured" or the provider's error). The submission itself is safe.
  - Failed emails are retried automatically: after later submissions, and by a daily job.
  - You can also click **Retry email** on the submission.
  - A green line means the email provider accepted the message. Delivery to the inbox can be checked in the email provider's dashboard.
- Identical submissions sent twice within 10 minutes (for example a double click) are stored once.

### Site settings (administrators)

**Settings** controls:
- the site name, logo and favicon;
- the header buttons;
- the green "Interested in being a Participant?" band, and the About page's footer band and newsletter text;
- contact details and social links;
- default SEO text and image;
- the **Google Search Console** and Bing verification codes. Keep the code the old site used (see `SEO_BASELINE.md`) so Search Console keeps recognising the site after the move;
- the Google Analytics ID (`G-…`) or Google tag ID (`GT-…`, which the old site used). It is only loaded after visitors accept cookies;
- the cookie banner;
- notification email addresses for each form.

"Discourage search engines" hides the whole site from Google. Use it only on a test copy.

Links in settings must be a site path such as `/registration/` or a full `https://` address. Other kinds of link are refused.

### Redirects (administrators)

When you change a page's address or remove a page, add a redirect from the old address so links and search rankings are kept. The redirect list warns about chains (A→B→C). Redirects for retired WordPress URLs are already built in.

### Users and your account

- **Users** (administrators): create accounts with a role. Share the temporary password securely. You can also deactivate people who leave, which signs them out everywhere, or reset passwords. You can't remove the last administrator.
- **Account** (everyone): change your name or password, and sign out other devices.
- **Forgot password**: the link on the sign-in page emails a reset link, if email is configured. Otherwise the technical contact can reset it from the server (see `DEPLOYMENT.md`).
  - A reset link works once, for one hour.
  - Older links stop working when the password changes.
- Sign-in attempts are limited. After repeated wrong passwords from one network, wait 15 minutes. Attempts from other networks are counted separately, so someone else's guessing cannot easily lock you out.
- **Activity log**: who changed what and when.

## Good practice

- Always fill in **alt text** for images, and keep **SEO descriptions** under about 155 characters.
- Use **Preview** before publishing large changes.
- Use headings in order (H2, then H3) inside rich text.
- Don't paste content from Word with heavy formatting. Use the toolbar to format instead.
