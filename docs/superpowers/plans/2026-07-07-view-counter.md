# View Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-post view counter (dedup by IP+UA per UTC day) to the Astro digital garden, served by a bun+hono+Turso API on Cloud Run.

**Architecture:** pnpm monorepo. `apps/web` (existing Astro → Cloudflare R2) fetches counts client-side from `apps/api` (bun + hono + libsql → Turso, on GCP Cloud Run). Cross-cloud over HTTPS + CORS.

**Tech Stack:** pnpm workspaces, Astro, bun, hono, @libsql/client, Turso, Docker, GCP Cloud Run, Cloudflare R2.

**Reference spec:** `docs/superpowers/specs/2026-07-07-view-counter-design.md`

---

## File Structure

```
my-blog/
├── pnpm-workspace.yaml          (create) workspace globs
├── package.json                 (modify) root, private, workspace scripts
├── apps/
│   ├── web/                     (move) all current Astro files here
│   │   └── src/components/ViewCount.astro   (create)
│   └── api/                     (create) bun + hono service
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       ├── .dockerignore
│       ├── schema.sql
│       └── src/
│           ├── index.ts         hono app + routes + CORS
│           ├── db.ts            libsql client factory
│           ├── views.ts         dedup-increment + read logic (pure-ish, tested)
│           ├── visitor.ts       sha256(ip+ua+day), day helper, slug validation
│           └── views.test.ts    bun test
├── .env.example                 (create)
└── docs/DEPLOY.md               (modify) R2 + Cloud Run
```

---

## Task 1: Bootstrap pnpm monorepo, move Astro into apps/web

**Files:**
- Create: `pnpm-workspace.yaml`, root `package.json`
- Move: all current Astro files → `apps/web/`

- [ ] **Step 1: Move existing Astro app into apps/web**

```bash
cd /home/andreello/Desktop/dev/my-blog
mkdir -p apps/web
git mv src apps/web/src
git mv public apps/web/public 2>/dev/null || true
git mv astro.config.mjs apps/web/astro.config.mjs
git mv tsconfig.json apps/web/tsconfig.json 2>/dev/null || true
git mv package.json apps/web/package.json
git mv pnpm-lock.yaml apps/web/pnpm-lock.yaml 2>/dev/null || true
```

- [ ] **Step 2: Create root workspace file**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create root package.json**

Create `package.json`:

```json
{
  "name": "my-blog-monorepo",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "build:web": "pnpm --filter web build",
    "dev:api": "pnpm --filter api dev",
    "test:api": "pnpm --filter api test"
  }
}
```

- [ ] **Step 4: Reinstall and verify web still builds**

Run:
```bash
pnpm install
pnpm --filter web build
```
Expected: install succeeds; Astro build outputs `apps/web/dist/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: convert to pnpm monorepo, move astro to apps/web"
```

---

## Task 2: Scaffold apps/api (bun + hono)

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/index.ts`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "api",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@libsql/client": "^0.14.0"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: Minimal hono app**

Create `apps/api/src/index.ts`:

```ts
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 8080);
export default { port, fetch: app.fetch };
```

- [ ] **Step 4: Install and smoke-test**

Run:
```bash
cd apps/api && bun install && bun run start &
sleep 1 && curl -s localhost:8080/health && kill %1
```
Expected: `{"ok":true}`

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): scaffold bun+hono service"
```

---

## Task 3: visitor.ts — hashing, day, slug validation (TDD)

**Files:**
- Create: `apps/api/src/visitor.ts`, `apps/api/src/views.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/views.test.ts`:

```ts
import { expect, test, describe } from "bun:test";
import { visitorHash, isValidSlug, utcDay } from "./visitor";

describe("isValidSlug", () => {
  test("accepts kebab slug", () => {
    expect(isValidSlug("my-first-note")).toBe(true);
  });
  test("rejects uppercase, spaces, slashes, empty", () => {
    expect(isValidSlug("My Note")).toBe(false);
    expect(isValidSlug("a/b")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("utcDay", () => {
  test("formats YYYY-MM-DD in UTC", () => {
    expect(utcDay(new Date("2026-07-07T23:30:00Z"))).toBe("2026-07-07");
  });
});

describe("visitorHash", () => {
  test("is deterministic and hides raw ip", async () => {
    const a = await visitorHash("1.2.3.4", "UA", "2026-07-07");
    const b = await visitorHash("1.2.3.4", "UA", "2026-07-07");
    expect(a).toBe(b);
    expect(a).not.toContain("1.2.3.4");
    expect(a).toHaveLength(64); // sha256 hex
  });
  test("differs across day", async () => {
    const a = await visitorHash("1.2.3.4", "UA", "2026-07-07");
    const b = await visitorHash("1.2.3.4", "UA", "2026-07-08");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd apps/api && bun test`
Expected: FAIL — cannot resolve `./visitor`.

- [ ] **Step 3: Implement visitor.ts**

Create `apps/api/src/visitor.ts`:

```ts
// utc date as YYYY-MM-DD
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// slug must be kebab: lowercase alphanumerics + hyphen
const SLUG_RE = /^[a-z0-9-]+$/;
export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && SLUG_RE.test(slug);
}

// sha256 hex of ip+ua+day. raw ip never stored.
export async function visitorHash(ip: string, ua: string, day: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${ua}|${day}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd apps/api && bun test`
Expected: PASS (all visitor tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/visitor.ts apps/api/src/views.test.ts
git commit -m "feat(api): visitor hashing, day, slug validation with tests"
```

---

## Task 4: db.ts + schema + views.ts dedup logic (TDD against in-memory libsql)

**Files:**
- Create: `apps/api/src/db.ts`, `apps/api/schema.sql`, `apps/api/src/views.ts`
- Modify: `apps/api/src/views.test.ts`

- [ ] **Step 1: Create schema.sql**

Create `apps/api/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS views (
  slug  TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS view_events (
  slug    TEXT NOT NULL,
  visitor TEXT NOT NULL,
  day     TEXT NOT NULL,
  PRIMARY KEY (slug, visitor, day)
);
```

- [ ] **Step 2: Create db.ts (client factory + schema apply)**

Create `apps/api/src/db.ts`:

```ts
import { createClient, type Client } from "@libsql/client";

export function makeClient(url: string, authToken?: string): Client {
  return createClient({ url, authToken });
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS views (
  slug  TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS view_events (
  slug    TEXT NOT NULL,
  visitor TEXT NOT NULL,
  day     TEXT NOT NULL,
  PRIMARY KEY (slug, visitor, day)
);`;

export async function applySchema(db: Client): Promise<void> {
  await db.executeMultiple(SCHEMA);
}
```

- [ ] **Step 3: Write failing tests for views logic**

Append to `apps/api/src/views.test.ts`:

```ts
import { makeClient, applySchema } from "./db";
import { getCount, recordView } from "./views";

async function freshDb() {
  const db = makeClient(":memory:");
  await applySchema(db);
  return db;
}

describe("recordView / getCount", () => {
  test("first view increments to 1", async () => {
    const db = await freshDb();
    const n = await recordView(db, "note-a", "v1", "2026-07-07");
    expect(n).toBe(1);
    expect(await getCount(db, "note-a")).toBe(1);
  });

  test("same visitor same day does not double count", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1", "2026-07-07");
    const n = await recordView(db, "note-a", "v1", "2026-07-07");
    expect(n).toBe(1);
  });

  test("same visitor next day counts again", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1", "2026-07-07");
    const n = await recordView(db, "note-a", "v1", "2026-07-08");
    expect(n).toBe(2);
  });

  test("different visitors both count", async () => {
    const db = await freshDb();
    await recordView(db, "note-a", "v1", "2026-07-07");
    const n = await recordView(db, "note-a", "v2", "2026-07-07");
    expect(n).toBe(2);
  });

  test("getCount is 0 for unseen slug", async () => {
    const db = await freshDb();
    expect(await getCount(db, "nope")).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests, verify they fail**

Run: `cd apps/api && bun test`
Expected: FAIL — cannot resolve `./views`.

- [ ] **Step 5: Implement views.ts**

Create `apps/api/src/views.ts`:

```ts
import type { Client } from "@libsql/client";

// current total for a slug, 0 if none.
export async function getCount(db: Client, slug: string): Promise<number> {
  const rs = await db.execute({
    sql: "SELECT count FROM views WHERE slug = ?",
    args: [slug],
  });
  return rs.rows.length ? Number(rs.rows[0].count) : 0;
}

// dedup-insert the event; increment total only if the visitor is new today.
// returns the current total after the operation.
export async function recordView(
  db: Client,
  slug: string,
  visitor: string,
  day: string,
): Promise<number> {
  const ins = await db.execute({
    sql: "INSERT OR IGNORE INTO view_events (slug, visitor, day) VALUES (?, ?, ?)",
    args: [slug, visitor, day],
  });
  if (ins.rowsAffected > 0) {
    await db.execute({
      sql: `INSERT INTO views (slug, count) VALUES (?, 1)
            ON CONFLICT(slug) DO UPDATE SET count = count + 1`,
      args: [slug],
    });
  }
  return getCount(db, slug);
}
```

- [ ] **Step 6: Run tests, verify pass**

Run: `cd apps/api && bun test`
Expected: PASS (all views + visitor tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/db.ts apps/api/src/views.ts apps/api/schema.sql apps/api/src/views.test.ts
git commit -m "feat(api): dedup view recording + count read, tested on in-memory libsql"
```

---

## Task 5: Wire routes + CORS in index.ts

**Files:**
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Replace index.ts with full app**

Replace `apps/api/src/index.ts`:

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { makeClient, applySchema } from "./db";
import { getCount, recordView } from "./views";
import { visitorHash, isValidSlug, utcDay } from "./visitor";

const db = makeClient(process.env.TURSO_URL!, process.env.TURSO_TOKEN);
await applySchema(db);

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGIN ?? "*",
    allowMethods: ["GET", "POST"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.get("/views/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return c.json({ error: "bad slug" }, 400);
  try {
    return c.json({ slug, count: await getCount(db, slug) });
  } catch {
    return c.json({ error: "unavailable" }, 503);
  }
});

app.post("/views/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return c.json({ error: "bad slug" }, 400);
  const ip = (c.req.header("x-forwarded-for") ?? "0.0.0.0").split(",")[0].trim();
  const ua = c.req.header("user-agent") ?? "";
  const day = utcDay(new Date());
  try {
    const visitor = await visitorHash(ip, ua, day);
    return c.json({ slug, count: await recordView(db, slug, visitor, day) });
  } catch {
    return c.json({ error: "unavailable" }, 503);
  }
});

const port = Number(process.env.PORT ?? 8080);
export default { port, fetch: app.fetch };
```

- [ ] **Step 2: Local run against a temp local sqlite file**

Run:
```bash
cd apps/api
TURSO_URL="file:local-test.db" ALLOWED_ORIGIN="*" bun run start &
sleep 1
curl -s -X POST localhost:8080/views/hello-world
curl -s localhost:8080/views/hello-world
curl -s -X POST localhost:8080/views/hello-world   # same ip+ua same day -> no increment
kill %1; rm -f local-test.db
```
Expected: first POST `{"slug":"hello-world","count":1}`, GET `count:1`, second POST still `count:1`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat(api): GET/POST /views/:slug routes with CORS"
```

---

## Task 6: Dockerfile + .dockerignore

**Files:**
- Create: `apps/api/Dockerfile`, `apps/api/.dockerignore`

- [ ] **Step 1: Create Dockerfile**

Create `apps/api/Dockerfile`:

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["bun", "run", "src/index.ts"]
```

- [ ] **Step 2: Create .dockerignore**

Create `apps/api/.dockerignore`:

```
node_modules
*.db
.env
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/Dockerfile apps/api/.dockerignore
git commit -m "chore(api): dockerfile for cloud run"
```

---

## Task 7: Create Turso schema + deploy API to Cloud Run

**Files:** none (infra). Uses project `webpolibrasil`, region `us-east1`, account `gabrielandreello.exe@gmail.com`.

**Prereq:** `.env` at repo root holds `TURSO_URL`, `TURSO_TOKEN`, `ALLOWED_ORIGIN`, R2 vars. Already gitignored.

- [ ] **Step 1: Apply schema to Turso**

Run (turso CLI, or via a one-off bun script using `applySchema`):
```bash
turso db shell garden-viwes < apps/api/schema.sql
```
Expected: no error. (If turso CLI absent, run a one-off: `TURSO_URL=... TURSO_TOKEN=... bun -e 'import{makeClient,applySchema}from"./apps/api/src/db.ts";const d=makeClient(process.env.TURSO_URL,process.env.TURSO_TOKEN);await applySchema(d);console.log("ok")'`)

- [ ] **Step 2: Deploy from source to Cloud Run**

Run:
```bash
cd apps/api
gcloud run deploy garden-api \
  --source . \
  --project webpolibrasil \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars "TURSO_URL=<url>,ALLOWED_ORIGIN=<blog-origin>" \
  --set-secrets "TURSO_TOKEN=turso-token:latest"
```
Note: create the secret first: `printf '%s' "<token>" | gcloud secrets create turso-token --data-file=- --project webpolibrasil` (or `versions add` if it exists). Expected: deploy succeeds, prints a service URL.

- [ ] **Step 3: Smoke-test deployed service**

Run:
```bash
SVC=$(gcloud run services describe garden-api --region us-east1 --project webpolibrasil --format='value(status.url)')
curl -s "$SVC/health"
curl -s -X POST "$SVC/views/smoke-test"
```
Expected: `{"ok":true}` then `{"slug":"smoke-test","count":1}`.

- [ ] **Step 4: Record the service URL** into `.env` as `PUBLIC_API_URL` for the web app. (No commit — secrets/urls stay in `.env`.)

---

## Task 8: Astro ViewCount component + integration

**Files:**
- Create: `apps/web/src/components/ViewCount.astro`
- Modify: `apps/web/src/pages/garden/[slug].astro`
- Create: `apps/web/.env` entry `PUBLIC_API_URL` (gitignored)

- [ ] **Step 1: Create ViewCount.astro**

Create `apps/web/src/components/ViewCount.astro`:

```astro
---
interface Props { slug: string }
const { slug } = Astro.props;
const apiUrl = import.meta.env.PUBLIC_API_URL;
---
<span class="view-count" data-slug={slug} data-api={apiUrl} hidden></span>

<script>
  document.querySelectorAll<HTMLElement>(".view-count").forEach(async (el) => {
    const slug = el.dataset.slug;
    const api = el.dataset.api;
    if (!slug || !api) return;
    try {
      const res = await fetch(`${api}/views/${slug}`, { method: "POST" });
      if (!res.ok) return;
      const { count } = await res.json();
      el.textContent = `${count} ${count === 1 ? "view" : "views"}`;
      el.hidden = false;
    } catch {
      // non-critical: stay hidden
    }
  });
</script>

<style>
  .view-count {
    font-size: 0.85rem;
    color: var(--color-text-muted, #888);
  }
</style>
```

- [ ] **Step 2: Use it in the post detail page**

In `apps/web/src/pages/garden/[slug].astro`, import and render near the post metadata (adjacent to `ReadingTime`):

```astro
---
import ViewCount from "../../../components/ViewCount.astro";
// ...existing frontmatter (post, render, etc.)
---
<!-- in the meta row, alongside ReadingTime -->
<ViewCount slug={post.id} />
```

(Adjust the import depth to match the existing component imports in this file, and place `<ViewCount>` wherever `ReadingTime` currently renders.)

- [ ] **Step 3: Add env var**

Add to `apps/web/.env`:
```
PUBLIC_API_URL=<cloud-run-service-url>
```

- [ ] **Step 4: Build + preview, verify counter appears**

Run:
```bash
pnpm --filter web build && pnpm --filter web preview &
sleep 2
# open a garden post URL; DevTools network shows POST /views/<slug>; count renders
kill %1
```
Expected: on a post page, a `POST /views/<slug>` fires and the count renders.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ViewCount.astro apps/web/src/pages/garden/[slug].astro
git commit -m "feat(web): view counter on garden post detail"
```

---

## Task 9: R2 deploy for the site + docs update

**Files:**
- Create/modify: root deploy script (replace `gcp-deploy.sh`), `docs/DEPLOY.md`, `.env.example`

- [ ] **Step 1: Create .env.example (documents names, no secrets)**

Create `.env.example`:

```
# API (Cloud Run)
TURSO_URL=libsql://garden-viwes-4ndreello.aws-us-east-1.turso.io
TURSO_TOKEN=
ALLOWED_ORIGIN=https://<blog-domain>

# Web (Astro build)
PUBLIC_API_URL=https://<cloud-run-url>

# Cloudflare R2 (site hosting)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=garden-web
R2_PUBLIC_URL=
```

- [ ] **Step 2: Write R2 deploy script**

Create `deploy-web.sh` (uses rclone or aws-cli S3 API against R2):

```bash
#!/usr/bin/env bash
set -euo pipefail
source .env
pnpm --filter web build
aws s3 sync apps/web/dist "s3://${R2_BUCKET_NAME}" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --delete
echo "deployed to R2 bucket ${R2_BUCKET_NAME}"
```
(`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env must be set to the R2 keys before running, or add an `aws` profile.)

- [ ] **Step 3: Rewrite docs/DEPLOY.md** to document: monorepo layout, `deploy-web.sh` (R2), `gcloud run deploy` (API), env matrix, and the secret-rotation note. Remove the old GCS bucket + Load Balancer + CDN pipeline.

- [ ] **Step 4: Remove old gcp-deploy.sh**

```bash
git rm gcp-deploy.sh 2>/dev/null || rm -f gcp-deploy.sh
```

- [ ] **Step 5: Commit**

```bash
git add .env.example deploy-web.sh docs/DEPLOY.md
git rm --cached gcp-deploy.sh 2>/dev/null || true
git commit -m "chore: R2 site deploy script + deploy docs"
```

---

## Self-Review Notes

- **Spec coverage:** scope→T8 (detail only), Cloud Run→T7, Turso→T4/T7, dedup→T4, monorepo split→T1, regex slug→T3, R2 migration→T9. All 8 spec decisions have a task.
- **Types consistent:** `recordView(db, slug, visitor, day)`, `getCount(db, slug)`, `visitorHash(ip, ua, day)`, `isValidSlug`, `utcDay(now)` used identically across tasks.
- **Known follow-ups (out of scope):** `view_events` pruning; custom domain / Cloudflare DNS for R2; secret rotation is a manual op the user owns.
