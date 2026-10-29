# Launch checklist and rollback plan

Production changes (DNS, domain, WordPress retirement) require the site owner's explicit approval. Nothing in this repository changes them automatically.

## A. Before launch (staging / Vercel preview)

| # | Check | Who | Done |
|---|---|---|---|
| 1 | Production PostgreSQL provisioned with backups/PITR, app role without superuser | Owner / ops | ☐ |
| 2 | Separate **preview** database (preview deployments must never use the production `DATABASE_URL`) | Ops | ☐ |
| 3 | S3/R2 bucket + public CDN URL; `STORAGE_DRIVER=s3` | Ops | ☐ |
| 4 | SMTP provider with SPF/DKIM for the sender domain; `SMTP_*`, `NOTIFY_EMAIL` | Owner | ☐ |
| 5 | Secrets set in Vercel: `APP_SECRET`, `SETUP_TOKEN`, `CRON_SECRET`, `SITE_URL` | Ops | ☐ |
| 6 | `npm run db:migrate` against production (from CI or a trusted machine, after a backup) | Ops | ☐ |
| 7 | Content import against production (`migrate:fetch` + `migrate:import`), then `reconcile.ts --live` | Ops | ☐ |
| 8 | First administrator created (`/admin/setup/` with `SETUP_TOKEN`, or `npm run admin:create`) | Owner | ☐ |
| 9 | Settings → SEO: **Discourage search engines ON** while on the staging domain | Admin | ☐ |
| 10 | Settings → SEO: Google verification code `QNamKEFAiD7r3qW-Mp0yOL3ceJqIYb835GCD_8MQwc4` (the code on the current site), if Search Console uses the meta-tag method | Admin | ☐ |
| 11 | Settings → Analytics: Google tag `GT-PJSNCJK7` (the tag on the current site), or a GA4 `G-` ID | Admin | ☐ |
| 12 | Upload the missing speaker portraits and the post-event report PDF | Owner | ☐ |
| 13 | Run `npm test` and `npm run test:e2e` against staging (`E2E_BASE_URL`) | Dev | ☐ |
| 14 | Submit each public form once; confirm the email arrives and the submission shows "accepted by the email provider" in the CMS | Owner | ☐ |
| 15 | Trigger the retry job once: `curl -H "Authorization: Bearer $CRON_SECRET" https://<staging>/api/cron/notifications/` returns `{ ok: true }` | Dev | ☐ |
| 16 | Upload an image in the CMS, redeploy, and confirm the image still loads (persistent storage) | Dev | ☐ |
| 17 | Owner acceptance review of design, content and French copy | Owner | ☐ |
| 18 | Accessible green: decided to keep the brand green `#21B354` (29 Oct 2026; DESIGN_SYSTEM.md › Contrast) | Owner | ☑ |

## B. Cutover (owner-approved window)

1. Freeze WordPress edits. Run the final import and reconciliation (MIGRATION_PLAN.md).
2. Lower the DNS TTL to 300 s at least 24 h in advance.
3. Add `spotlightnigeria-france.com` and `www` to the Vercel project. Set `SITE_URL=https://spotlightnigeria-france.com` and redeploy.
4. Turn **off** "Discourage search engines". Check `/robots.txt` (no `Disallow: /`) and that pages do not carry `noindex`.
5. Point DNS at Vercel. Wait for TLS.
6. Smoke test:
   - pages: `/`, `/fr/`, `/about/`, `/registration/`, a post, `/speakers/`;
   - `/sitemap.xml`, `/robots.txt`, `/feed/`;
   - redirects: `/events/`, `/sitemap_index.xml`, `/?s=nigeria`;
   - one contact form submission.
7. Search Console: confirm verification still holds, submit `/sitemap.xml`, and watch Coverage, 404s and Core Web Vitals for 2–4 weeks. Add missing redirects in **CMS → Redirects**.
8. Keep WordPress running and untouched on its hosting (another hostname or IP) for at least 30 days.

## C. Rollback

| Situation | Action | Time |
|---|---|---|
| Bad application release | Vercel → Deployments → previous deployment → **Instant Rollback** (or redeploy the previous git tag). Migrations are additive (forward-only), so the previous build works with the current schema | Minutes |
| Bad content change | CMS → page/post → **Revisions** → restore. Trashed items can be restored from **Trash** | Minutes |
| Data loss / corruption | Restore PostgreSQL from the provider's point-in-time backup (DATABASE_SCHEMA.md › Backups). Restore media from bucket versioning | Under 1 h |
| Full rollback to WordPress | Point DNS back to the WordPress host (TTL 300 s). Export submissions received on the new site from **CMS → Submissions → Export CSV**, so no enquiries are lost | Minutes plus DNS propagation |
| Email outage | Submissions are still stored. Fix SMTP; the scheduled job and new submissions retry pending notifications automatically, or use **Retry email** on each submission | — |

**Rollback triggers:**
- a core journey is broken: home, registration links or the contact form;
- error rate above 1% in Vercel logs;
- an indexing disaster: `noindex` or `Disallow: /` live in production;
- a security incident.

**Decision owner:** the site owner, advised by the developer on call.

## D. After launch

- Remove the staging domain or protect it (Vercel deployment protection).
- Retire WordPress only after 30 days without rollback, with owner approval, and after a final database export is archived.
- Delete `wp-content/uploads/2022/11/attendee_list-13.csv` from WordPress now. It is publicly downloadable and appears to contain personal data (found in the original audit).
