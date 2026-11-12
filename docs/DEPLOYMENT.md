# Deployment, cutover and rollback

The app is a standard Next.js 16 Node server. It runs on **Vercel**, on a Node host (Render, Railway, Fly.io, a VPS behind Nginx), or in Docker (`output: "standalone"` can be added if needed). It needs three external services: PostgreSQL, S3-compatible object storage and SMTP.

## 1. Provision

| Service | Recommendation | Notes |
|---|---|---|
| PostgreSQL 15+ | Neon, Supabase, RDS, Render | Create a database and an app role that can read/write tables (no superuser). Turn on automated backups / PITR |
| Object storage | Cloudflare R2 (no egress fees) or AWS S3 | One bucket. Make objects publicly readable, or put a CDN domain such as `media.spotlightnigeria-france.com` in front. Give the access key permission for this bucket only (Get/Put/Delete/Head) |
| Email | Amazon SES (API keys), or any SMTP provider (Brevo, Postmark, WP Mail SMTP) | Verify the sender domain (SPF/DKIM). SES: move the account out of the sandbox so it can email any address |

## 2. Environment variables

Copy `.env.example` and fill it in. Secrets belong in the host's secret manager, never in git.

- **Required:** `DATABASE_URL`, `SITE_URL`, `APP_SECRET`, `STORAGE_DRIVER=s3` + `S3_*`.
- **Required before the first administrator exists:** `SETUP_TOKEN`. In production `/admin/setup/` stays locked without it. Alternatively, create the administrator with `npm run admin:create`. A deliberate override, `ALLOW_SETUP_WITHOUT_TOKEN=true`, exists but is not recommended.
- **Recommended:** `NEXT_PUBLIC_MEDIA_BASE_URL`, `EMAIL_FROM`, `NOTIFY_EMAIL`, `CRON_SECRET`, and either `SES_ACCESS_KEY_ID` + `SES_SECRET_ACCESS_KEY` + `SES_REGION` (Amazon SES, used first) or `SMTP_*`.
- **Only behind your own proxy (not Vercel):** `TRUSTED_PROXY_HOPS`, or `TRUSTED_IP_HEADER` (for example `cf-connecting-ip` behind Cloudflare). These decide which address the rate limits use. Without them the right-most `X-Forwarded-For` entry is used.
- `NEXT_PUBLIC_MEDIA_BASE_URL` is read at build time; rebuild after changing it.
- **Preview vs production on Vercel:** give Preview deployments their **own** `DATABASE_URL`, bucket and `SITE_URL`, and keep "Discourage search engines" on there. Never point a preview at the production database.

### Vercel specifics

- `vercel.json` sets the framework and one **cron job**: `/api/cron/notifications/` daily at 06:00 UTC. It retries form notification emails that have not reached the email provider yet.
  - Set `CRON_SECRET`; Vercel sends it automatically as a bearer token. Without it the endpoint answers 503.
  - On a Pro plan the schedule can be tightened, for example `*/15 * * * *`. Hobby allows daily jobs only.
  - Retries also happen after every new submission and from the CMS (**Retry email**), so the daily job is a backstop.
- **Migrations are not part of the build.** Running them in the build would also run them for Preview deployments. Run `npm run db:migrate` against production explicitly: after a backup, from CI or a trusted machine, before promoting a release that contains a new migration. Migrations are additive.
- `sharp` and `@node-rs/argon2` are native packages and run on Vercel's Node runtime (the default). Do not switch routes to the Edge runtime.
- Uploads are limited to 15 MB by the app. Vercel functions accept request bodies up to 4.5 MB, so **larger uploads fail on Vercel** unless they go directly to the bucket. Most images are smaller. Compress PDFs before uploading, or host large reports on the bucket/CDN and link to them.

## 3. Build and release

```sh
npm ci                  # also generates the Prisma client
npm run db:migrate      # prisma migrate deploy (safe, forward-only)
npm run build
npm start               # or the platform's start command
```

The build does not need the database to be populated. Pages render on their first request and are then cached.

## 4. Load content and create the first administrator

```sh
npm run migrate:fetch && npm run migrate:import   # pulls from the live WordPress site
```

The import writes media into the configured bucket. Run it from a machine that has the production environment variables.

Then create the first administrator in either of two ways:

- **In the browser:** open `https://<domain>/admin/setup/` and enter `SETUP_TOKEN` (required in production). This page disables itself once an account exists.
- **From the command line:**

  ```sh
  ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD='…' npm run admin:create
  ```

**Account recovery:** if a password is lost and email isn't configured, run:

```sh
ADMIN_EMAIL=… ADMIN_PASSWORD='new…' npm run admin:create -- --reset
```

This also signs the user out of every session.

## 5. Validate on a staging domain first

- Deploy to a temporary domain such as `new.spotlightnigeria-france.com`.
- In **Settings → SEO**, turn on "Discourage search engines" so staging is not indexed.
- Run the checks in `QA_REPORT.md`, plus `npm test` and `npm run test:e2e` against staging.
- Ask the organisers to review the content, and especially the French pages.

## 6. Cutover (DNS)

1. Freeze content changes on WordPress, then run `npm run migrate:fetch && npm run migrate:import` one last time. CMS-edited records are preserved.
2. Lower the DNS TTL to 300 s a day in advance.
3. Point `spotlightnigeria-france.com` (and `www`) at the new host, and let the host issue TLS certificates.
4. Set `SITE_URL=https://spotlightnigeria-france.com`. Turn **off** "Discourage search engines". Redeploy.
5. Smoke-test the following. A script-friendly list is in `QA_REPORT.md`.
   - `/`, `/fr/`, `/about/`, `/registration/`, a post, `/speakers/`
   - `/sitemap.xml`, `/robots.txt`
   - a legacy redirect such as `/events/`
   - submitting the contact form (check that the email arrives)
6. In Google Search Console:
   - submit the new sitemap;
   - watch Coverage and 404s for two weeks;
   - add any missing redirect in **CMS → Redirects**.
7. Keep the WordPress installation **untouched** (on another hostname, or as a backup) for at least 30 days.

## 7. Rollback

The full launch checklist and rollback procedure are in [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md). Summary:

- **App regression:** redeploy the previous build. On Vercel, use "Instant Rollback". On other hosts, deploy the previous git tag. Migrations are forward-only and additive, so the previous build keeps working with the current schema.
- **Full rollback to WordPress:** point DNS back to the WordPress host (TTL 300 s makes this quick). Form submissions received by the new site stay in its database and can be exported as CSV from **CMS → Submissions**.
- **Data:** restore the database from the latest backup (see `DATABASE_SCHEMA.md`). Restore the bucket from versioning if media was lost.

## 8. Operations

- **Logs:** application errors go to stdout or stderr; use the platform's log drain.
- **Scheduled content:** no cron is needed. Pages revalidate at most every 5 minutes, so a scheduled post appears within 5 minutes of its publish time.
- **Form notifications:** every submission is stored before any email is attempted. **CMS → Submissions** shows whether the email provider accepted the notification, the error otherwise, and the number of attempts.
  - Pending notifications are retried with back-off (5 min, 15 min, 45 min…, at most 5 attempts) after new submissions, by the daily cron job and from the **Retry email** button.
  - "Accepted" means the SMTP server took the message. Inbox delivery is only visible in the email provider's dashboard.
- **Security headers** are set in `next.config.ts`:
  - HSTS, nosniff, Referrer-Policy, frame-ancestors (SAMEORIGIN), Permissions-Policy;
  - a baseline Content-Security-Policy (`object-src 'none'; base-uri 'self'; frame-ancestors 'self'`, plus `upgrade-insecure-requests` when `SITE_URL` is https). Script sources are not restricted yet, because the embeds and analytics need them; a nonce-based `script-src` is a possible next step;
  - `X-Robots-Tag: noindex` on `/admin`.
- **Upgrades:** run `npm outdated` monthly. Upgrade Next and Prisma together on a branch and run the full test suite.
- **Local development:** `npm run dev`. You need a Postgres database. This repository's own setup used a project-local cluster in `.data/pg` on port 5544. To start it:

  ```sh
  pg_ctl -D .data/pg -o "-p 5544" start
  ```
