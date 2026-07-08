# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal digital garden / blog. **pnpm monorepo** with two independently deployed apps:

- `apps/web` — Astro static site (content in Portuguese, pt-BR) → deployed to **Cloudflare R2**.
- `apps/api` — bun + hono view-counter service backed by **Turso** (libsql) → deployed to **GCP Cloud Run**.

The two talk over HTTPS + CORS: the static site fetches view counts client-side from the API.

## Commands

Run from repo root (pnpm workspace):

```
pnpm install              # install all workspace deps

pnpm run dev:web          # astro dev server (apps/web)
pnpm run build:web        # build static site -> apps/web/dist/
pnpm run dev:api          # bun --watch (apps/api, hot reload)
pnpm run test:api         # bun test (apps/api)
```

Per-app (cd into the app):

```
# apps/web
pnpm --filter web astro check     # type-check .astro
pnpm --filter web preview         # preview built site

# apps/api  (uses bun, NOT node/pnpm at runtime)
cd apps/api && bun test                       # run all tests
cd apps/api && bun test src/views.test.ts     # single test file
```

Tests exist only for `apps/api` (bun's built-in runner, files `*.test.ts`). `apps/web` has no tests. No linter configured.

## Architecture

### apps/web (Astro static site)
- **Content collections**: garden notes are markdown in `apps/web/src/content/garden/*.md`, loaded via the `glob` loader and validated by a zod schema in `apps/web/src/content.config.ts` (fields: `title`, `pubDate`, `updatedDate?`, `tags[]`, `related[]` of `{title, url}`). Adding a note = drop a matching markdown file; no registration elsewhere. `.gitkeep` keeps the dir alive when empty.
- **Routing**: `src/pages/index.astro` (landing). `src/pages/garden/index.astro` lists entries (sorted `pubDate` desc). `src/pages/garden/[slug].astro` is a dynamic route via `getStaticPaths` (slug = `post.id`), rendered with `render(post)`.
- **Layout**: `src/layouts/Layout.astro` is the single shared shell — global CSS custom properties (colors/spacing/radii/shadows), light/dark via `prefers-color-scheme`, and `.prose` styles for rendered markdown.
- **Components** (`src/components/`): `GardenCard`, `ReadingTime` (200 wpm estimate), `TagList`, `RelatedLinks`, and `ViewCount` (client-side fetch to the API — see below). All presentational, consume collection data directly.
- Static output (`output: 'static'`).

### apps/api (view-counter service)
- **Runtime is bun**, not node. Entry `src/index.ts` exports `{ port, fetch }` (hono app). Config via env: `TURSO_URL`, `TURSO_TOKEN`, `ALLOWED_ORIGIN`, `VISITOR_HASH_SECRET`.
- **Endpoints**: `GET /views/:slug` (read count), `POST /views/:slug` (dedup-increment), `GET /health`. Contract: `{ slug, count }`.
- **Dedup rule** (`src/views.ts`): a visitor counts at most once per slug forever. `recordView` runs inside a write transaction, does `INSERT OR IGNORE` into `view_events` (PK `slug,visitor`), and only when a new row lands does it bump `views.count` via `ON CONFLICT DO UPDATE`. `visitor` is `hmac-sha256(ip|ua)` using `VISITOR_HASH_SECRET` (`src/visitor.ts`) — **raw IP is never stored** and the secret makes the identifier resistant to offline enumeration. If the legacy `view_events` table still has a `day` column, `applySchema` runs `migration.sql` at boot to rebuild the table and recount totals; because old visitor hashes included the day, pre-migration repeat visitors remain split by day.
- **Schema** (`schema.sql`) is the single source of truth: `db.ts` imports it as text (`import schema from "../schema.sql" with { type: "text" }`) and `applySchema` runs it idempotently at boot. Do not reintroduce a duplicate inline schema string.
- Slug validation: `^[a-z0-9-]+$` only, no allowlist (unknown slugs can create rows — accepted tradeoff). DB errors degrade to `503`; the web counter hides silently on any failure.

### web ↔ api link
`ViewCount.astro` reads `import.meta.env.PUBLIC_API_URL` (set in `apps/web/.env`, gitignored) and on page load POSTs to `{PUBLIC_API_URL}/views/{slug}`, rendering the returned count. `ALLOWED_ORIGIN` on the API **must exactly match the site's public origin** or the browser fetch is CORS-blocked.

## Deploy

See `docs/DEPLOY.md` for full detail. In short:

- **Site → R2**: `./deploy-web.sh` (builds `apps/web`, `aws s3 sync apps/web/dist` to bucket `garden-web` via R2's S3 API, `--delete` prunes removed objects). Needs `aws` CLI + R2 creds in `.env`. Served through a Cloudflare **Worker** (a multi-domain router) that maps the hostname to an R2 static handler — the Worker resolves directory/extensionless paths to `index.html` because R2 serves objects by exact key with no index resolution.
- **API → Cloud Run**: from `apps/api`, `gcloud run deploy garden-api --source . --project webpolibrasil --region us-east1 --allow-unauthenticated --set-env-vars "TURSO_URL=...,ALLOWED_ORIGIN=..." --set-secrets "TURSO_TOKEN=turso-token:latest"`. Env-only tweaks: `gcloud run services update garden-api --region us-east1 --update-env-vars ...`. Live URL: `https://garden-api-361874528796.us-east1.run.app`.
- **Turso** DB `garden-viwes` (name has a typo for "views" — it is the real DB name). Token stored in GCP Secret Manager (`turso-token`), bound to the Cloud Run runtime service account. No local turso CLI — apply schema via a bun one-off using `db.ts`'s `applySchema`.

## Conventions
- Code comments in English, starting lowercase.
- Commits: no `Co-Authored-By` trailer.
- Secrets live in `.env` (gitignored) + GCP Secret Manager; `.env.example` documents variable names with empty secret values.
