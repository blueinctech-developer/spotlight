# Database schema

The source of truth is `prisma/schema.prisma`, and versioned SQL migrations live in `prisma/migrations/`. The database is PostgreSQL 15 or newer (developed on 17).

## Models

| Area | Model | Notes |
|---|---|---|
| Auth | `User` | Unique email; `role` is ADMIN/EDITOR/AUTHOR; `active` flag; Argon2id `passwordHash` |
| | `Session` | `id` is the SHA-256 hash of the cookie token; indexed by user and expiry; cascades when the user is deleted |
| | `PasswordResetToken` | Hashed token, valid for 1 hour, single use |
| | `RateLimit` | Fixed-window counters keyed by `purpose:identifier` (identifiers are hashed) |
| Content | `Page` | Unique on `(locale, path)` and on `(translationGroup, locale)`; `blocks` JSON; `status` + `publishedAt` (a future date means scheduled); `deletedAt` for trash; parent/child tree; SEO and Open Graph fields; header/footer variants; `legacyId`/`legacyUrl` from WordPress |
| | `Post` | Unique on `(locale, slug)` and on `(translationGroup, locale)`; sanitized HTML `content`; same publishing fields as `Page` |
| | `Category`, `Tag` (+ `PostCategory`, `PostTag`) | Many-to-many join tables with cascade delete; `nameFr` holds the French label; `legacyId` is unique |
| | `Revision` | Snapshots of pages and posts. `REVISION` rows are kept 50 per entity; one `AUTOSAVE` row is kept per user per entity |
| Media | `MediaAsset` | `storageKey` unique; type, size, dimensions; alt text (EN/FR), caption; sha256; `legacyUrl` unique (lets the import be re-run) |
| | `MediaUsage` | `(mediaId, entityType, entityId)` primary key. It is rebuilt on save and blocks deleting media that is in use |
| Navigation | `Menu`, `MenuItem` | One menu per `(location, locale)`. Items are nested through `parentId`. An item links either to a page by `pageGroup` (it follows that page's path in each language) or to a custom `url` |
| Events | `Event` | One row per edition: slug, edition number, year, dates, timezone, venue, theme/description (EN/FR), status, `isCurrent`, banner, `galleryIds` |
| | `EventSession` | Programme items with day, times, title/theme/description (EN/FR) and kind; ordered |
| | `SessionSpeaker` | Session ↔ speaker link with a role (speaker, moderator, panelist or keynote) and an order |
| | `Speaker` | Unique `slug` (public URL `/speakers/<slug>/`); job title and bio in EN/FR; photo; links |
| | `Partner`, `EventPartner` | A logo record is reused by page blocks and by events, with a tier per edition |
| | `Testimonial` | Quote and role in EN/FR, photo, company logo, visibility, order |
| Forms | `FormSubmission` | Form key, locale, name, email, data JSON, status, hashed IP, notification result |
| Site | `Setting` | One JSON document per key, validated by `src/lib/settings-schema.ts` |
| | `Redirect` | `fromPath` unique; 301/302/410; hit counter |
| | `AuditLog` | Who did what, when; indexed by date and by entity |

## Integrity rules

- Deleting a user keeps their content: `authorId` is set to null.
- Deleting media is blocked in the application while it is referenced. At the database level, foreign keys to media use `ON DELETE SET NULL`, so content survives even a forced delete.
- Changes that touch several rows run inside transactions. Examples:
  - first-administrator setup (serializable isolation);
  - replacing a menu's items;
  - updating child page paths after a slug change;
  - toggling which event is current;
  - syncing media usage.
- Block JSON is validated before every write. On read, invalid blocks are skipped rather than crashing the page.

## Migrations

| Environment | Command | What it does |
|---|---|---|
| Development | `npm run db:migrate:dev` | Creates and applies a new migration |
| Production / CI | `npm run db:migrate` | Runs `prisma migrate deploy`, which applies pending migrations and never resets data |

The Prisma client is generated into `src/generated/prisma`. This happens automatically on `npm install` through the `postinstall` script.

## Backups and restore

- **Daily logical backup**:

  ```sh
  pg_dump --format=custom --no-owner "$DATABASE_URL" > spotlight-$(date +%F).dump
  ```

  Keep at least 30 days, store them off-site, and encrypt them at rest. Most managed Postgres providers (Neon, Supabase, RDS, Render) also offer point-in-time recovery; turn it on.
- **Restore into an empty database**:

  ```sh
  pg_restore --no-owner --dbname "$NEW_DATABASE_URL" spotlight-YYYY-MM-DD.dump
  ```

  Then point `DATABASE_URL` at the restored database and redeploy.
- **Media** lives in the storage bucket. Turn on bucket versioning or replication. Database rows reference objects by `storageKey`, so restore the bucket and the database **from the same point in time**.
- **Test restores**: restore into a scratch database once a quarter and run `npm test` against it, with `TEST_DATABASE_URL` pointing at the restored copy. The tests wipe that database.
