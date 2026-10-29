# Spotlight Nigeria — website & CMS

This repository replaces the WordPress site at https://spotlightnigeria-france.com. The new site is a Next.js 16 application with a built-in bilingual CMS, backed by PostgreSQL. The original design and URLs are preserved.

## Quick start (development)

```sh
cp .env.example .env              # set DATABASE_URL (and TEST_DATABASE_URL for tests)
npm install                       # also generates the Prisma client
npm run db:migrate:dev            # create tables
npm run migrate:fetch             # download the live WordPress content (read-only)
npm run migrate:import            # import pages, posts, media, menus, settings…
npm run dev                       # http://localhost:3000
```

Then open http://localhost:3000/admin/setup/ to create the first administrator. Alternatively, run:

```sh
ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD='…' npm run admin:create
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run typecheck`, `npm run lint` | TypeScript strict check, ESLint |
| `npm test` | Unit + integration tests (Vitest, uses `TEST_DATABASE_URL`, which is wiped) |
| `npm run test:e2e` | Browser tests (Playwright + Chrome) against `E2E_BASE_URL`; CMS tests need `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` |
| `npm run db:migrate` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run migrate:fetch` / `migrate:import` | Repeatable WordPress migration |
| `npm run admin:create [-- --reset]` | Create an administrator, or reset a password (account recovery) |
| `npx tsx --conditions=react-server scripts/migration/reconcile.ts [--live]` | Read-only content counts, compared with the live WordPress site |
| `node scripts/audit/*.cjs` | SEO crawl, old/new URL comparison, link check (see `scripts/audit/README.md`) |

## Documentation

| Document | Contents |
|---|---|
| [docs/WEBSITE_AUDIT.md](docs/WEBSITE_AUDIT.md) | Inventory of the original site: pages, templates, forms, SEO, French version, issues |
| [docs/MIGRATION_MAP.md](docs/MIGRATION_MAP.md) | Every old URL → new route, with redirect and 410 rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the application is built, plus caching, security, media, forms and SEO |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Data model, integrity rules, backups and restore |
| [docs/CONTENT_MIGRATION.md](docs/CONTENT_MIGRATION.md) | What was migrated, how, and the known gaps |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hosting, environment variables, cutover and rollback |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | How to use the CMS |
| [docs/QA_REPORT.md](docs/QA_REPORT.md) | Test results, fixes, accessibility, performance, security, open items |
| [docs/COMPLIANCE_MATRIX.md](docs/COMPLIANCE_MATRIX.md) | Every requirement with evidence, verification method and status |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Brand colours, fonts, layout, components, motion, contrast notes |
| [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) / [docs/MIGRATION_REPORT.md](docs/MIGRATION_REPORT.md) | Repeatable migration procedure, including the cutover catch-up / reconciliation of source vs destination |
| [docs/SEO_BASELINE.md](docs/SEO_BASELINE.md) / [docs/SEO_MIGRATION_REPORT.md](docs/SEO_MIGRATION_REPORT.md) / [docs/REDIRECT_MAP.csv](docs/REDIRECT_MAP.csv) | Live-site SEO baseline, old → new comparison, full redirect map (raw data in `docs/seo/`) |
| [docs/ROLLBACK_PLAN.md](docs/ROLLBACK_PLAN.md) | Launch checklist, cutover and rollback |
