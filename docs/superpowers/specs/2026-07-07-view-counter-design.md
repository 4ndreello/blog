# View Counter — Design Spec

**Date:** 2026-07-07
**Status:** Approved (design), pending implementation plan

## Goal

Add a simple per-post view counter to the digital garden. Display "N views" on
each garden post detail page. Counts are deduplicated per visitor per day.
Vanity metric — non-critical, degrades silently on failure.

## Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Feature scope | Simple counter only (no analytics) |
| 2 | Backend runtime | GCP Cloud Run (serverless, scale-to-zero) |
| 3 | Database | Turso (hosted libsql / sqlite) |
| 4 | Counting | Dedup by IP+UA per UTC day (not naive) |
| 5 | Repo layout | pnpm monorepo, full `apps/web` + `apps/api` split |
| 6 | Slug validation | Regex only (`^[a-z0-9-]+$`) |
| 7 | Display location | Post detail page only (not list) |
| 8 | Site hosting | Migrate site GCS → Cloudflare R2 |

## Architecture

Two independent apps in one pnpm workspace, deployed to two clouds, talking
over HTTPS + CORS.

```
my-blog/                      (pnpm workspace root)
├── pnpm-workspace.yaml        apps/*, packages/*
├── apps/
│   ├── web/                  ← existing Astro site (moved here)  → deploy Cloudflare R2
│   └── api/                  ← new: bun + hono + Turso           → deploy GCP Cloud Run
└── packages/
    └── shared/               (optional) shared TS types
```

- **web** — existing Astro static site, moved to `apps/web/`. Adds a client-side
  fetch to the API. Deploys to R2 bucket `garden-web` + Cloudflare CDN.
- **api** — new bun + hono service, libsql client → Turso. Deploys to Cloud Run,
  scales to zero.
- Cross-cloud: web (R2 origin) calls api (Cloud Run URL). CORS locked to blog origin.

## Data Model (Turso / sqlite)

```sql
-- running total per post. read path hits only this.
CREATE TABLE views (
  slug   TEXT PRIMARY KEY,          -- post.id, matches Astro slug
  count  INTEGER NOT NULL DEFAULT 0
);

-- dedup ledger. one row = one visitor+post+day.
CREATE TABLE view_events (
  slug    TEXT NOT NULL,
  visitor TEXT NOT NULL,            -- sha256(ip + userAgent + day). NO raw IP stored.
  day     TEXT NOT NULL,            -- 'YYYY-MM-DD' UTC
  PRIMARY KEY (slug, visitor, day)
);
```

**Privacy:** raw IP is never persisted. Only the salted hash `visitor` is stored.

**Growth:** `view_events` grows unbounded. Acceptable for years at personal
scale. Optional prune cron later — out of scope now (YAGNI).

## API (bun + hono)

```
GET  /views/:slug   → { slug, count }    read-only, short cache TTL
POST /views/:slug   → { slug, count }    dedup-increment, returns new count
```

**Increment logic (POST):**
1. `day` = current UTC date `YYYY-MM-DD`.
2. `ip` from `X-Forwarded-For` first hop (Cloud Run behind Google LB); `ua` from
   `User-Agent`.
3. `visitor = sha256(ip + ua + day)`.
4. `INSERT OR IGNORE INTO view_events (slug, visitor, day)`.
5. If insert added a row (new visitor today) → `UPDATE views SET count = count + 1`
   (upsert `views` row if absent). Else no-op.
6. Return current count.

Effect: one visitor counted once per post per UTC day. Refresh spam blocked.
Rotating-IP bots still slip through — acceptable for a vanity metric.

**Validation:** `slug` must match `^[a-z0-9-]+$`, else `400`. No allowlist —
nonexistent-post slugs may create junk rows (accepted tradeoff).

**CORS:** allow only blog origin (`ALLOWED_ORIGIN`). Methods `GET, POST`. No credentials.

**Errors:** DB unreachable → `503`. Web treats counter as non-critical and hides
it silently.

**Config (env):** `TURSO_URL`, `TURSO_TOKEN`, `ALLOWED_ORIGIN`.

## Astro Integration

Static output → counter runs client-side.

- New component `<ViewCount slug={post.id} />` used in `[slug].astro`.
- Renders a placeholder `<span>`; on load runs a small script:
  1. `POST {PUBLIC_API_URL}/views/{slug}` → dedup-increment, receive count.
  2. Write count into placeholder.
- Fetch failure → placeholder stays hidden (non-critical).
- API base URL from `PUBLIC_API_URL` (Astro `import.meta.env`).
- Garden list page: no counts (YAGNI).

## Deploy & Tooling

**Monorepo:** pnpm workspaces. `pnpm-workspace.yaml` → `apps/*`, `packages/*`.
Moving Astro into `apps/web/` rewrites site paths + deploy script (one-time churn,
accepted).

**web → R2:**
- Build `apps/web` → `dist/` → push to R2 bucket `garden-web` (wrangler or rclone).
- Cloudflare CDN in front. Replaces current GCS hosting.
- `gcp-deploy.sh` + `docs/DEPLOY.md` rewritten for R2.

**api → Cloud Run:**
- Dockerfile on `oven/bun` base: copy `apps/api`, `bun install`, expose port, `bun run start`.
- `gcloud run deploy` with env `TURSO_URL`, `TURSO_TOKEN`, `ALLOWED_ORIGIN`.
- Turso DB created once (`turso db create`); schema applied via migration script.

**Env matrix:**

| App | Var | Purpose |
|-----|-----|---------|
| web | `PUBLIC_API_URL` | Cloud Run URL |
| api | `TURSO_URL` | Turso DB URL |
| api | `TURSO_TOKEN` | Turso auth token (secret) |
| api | `ALLOWED_ORIGIN` | CORS = blog domain |

All secrets live in `.env` (gitignored) locally and in Cloud Run / CI secrets.
Never committed.

## Security Notes

- Turso token and R2 keys were exposed in the design chat → must be rotated
  before/at deploy.
- `.env` already in `.gitignore`. Verify `.env.production` too (it is).

## Out of Scope (YAGNI)

- Analytics (referrers, unique visitors, dwell time, trends).
- View counts on the garden list page.
- Slug allowlist / validation against real posts.
- `view_events` pruning cron.
- Bot mitigation beyond per-day IP+UA dedup.
