# Deploy

This is a pnpm monorepo with two deployable apps:

- **`apps/web`** — the Astro static site (the digital garden), hosted on **Cloudflare R2** behind Cloudflare.
- **`apps/api`** — the view-counter API (Bun + Hono), running on **Google Cloud Run**, backed by a **Turso** (libSQL) database.

The old GCS bucket + Load Balancer + Cloud CDN pipeline (`gcp-deploy.sh`) has been retired in favor of R2.

---

## Prerequisites

- pnpm installed
- [aws CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed (used against R2's S3-compatible API — no AWS account needed)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated (`gcloud auth login`), for API deploys
- A `.env` file at the repo root with real values (see `.env.example` — never commit `.env`)

---

## 1. Web deploy (Cloudflare R2)

The site builds to `apps/web/dist` and is synced to the `garden-web` R2 bucket using the S3-compatible API. Cloudflare sits in front of the bucket to serve the site publicly.

```bash
./deploy-web.sh
```

What it does:

1. Loads `.env` (needs `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
2. Runs `pnpm --filter web build`.
3. Syncs `apps/web/dist` to `s3://${R2_BUCKET_NAME}` against the R2 endpoint (`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`), deleting remote files no longer present locally.

The R2 access key/secret are used as AWS credentials for this single invocation only (R2 speaks the S3 API, so the `aws` CLI works against it directly).

---

## 2. API deploy (Cloud Run)

From `apps/api`:

```bash
gcloud run deploy garden-api \
  --source . \
  --project webpolibrasil \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars "TURSO_URL=...,ALLOWED_ORIGIN=..." \
  --set-secrets "TURSO_TOKEN=turso-token:latest"
```

Live URL: `https://garden-api-361874528796.us-east1.run.app`

`gcloud run deploy --source .` builds the container from `apps/api/Dockerfile` and pushes/deploys it. `TURSO_TOKEN` is pulled from GCP Secret Manager rather than passed as a plain env var.

### Database (Turso)

- Database: `garden-viwes` (note: the name has a typo for "views" — kept as-is since it's already provisioned).
- Engine: libSQL (Turso).
- Schema: `apps/api/schema.sql` is applied to the database once, manually, when the schema changes.

---

## 3. Secrets

- `TURSO_TOKEN` lives in **GCP Secret Manager** as `turso-token`, bound to the Cloud Run runtime service account, and injected via `--set-secrets` at deploy time. It is never passed as a plain env var.
- All other secrets (`TURSO_URL` when it contains embedded credentials, R2 keys, etc.) live only in the local, gitignored `.env` file. `.env.example` documents the variable names with empty values — never fill it in with real secrets.
- **Rotation note:** the Turso token and R2 access keys were exposed during initial setup and should be rotated before this is considered production-hardened.

---

## Environment variable matrix

| App | Variable | Where it lives | Notes |
|-----|----------|-----------------|-------|
| web | `PUBLIC_API_URL` | `.env` (build time) | base URL the static site calls for view counts |
| api | `TURSO_URL` | `.env` / `--set-env-vars` | libSQL connection URL |
| api | `TURSO_TOKEN` | GCP Secret Manager (`turso-token`) | injected via `--set-secrets`, never a plain env var |
| api | `ALLOWED_ORIGIN` | `.env` / `--set-env-vars` | CORS origin allowed to call the API |
| web deploy | `R2_ACCOUNT_ID` | `.env` | Cloudflare account id, used to build the R2 endpoint |
| web deploy | `R2_ACCESS_KEY_ID` | `.env` | R2 S3 API access key |
| web deploy | `R2_SECRET_ACCESS_KEY` | `.env` | R2 S3 API secret key |
| web deploy | `R2_BUCKET_NAME` | `.env` | bucket the site is synced to (`garden-web`) |
| web deploy | `R2_PUBLIC_URL` | `.env` | public URL the bucket is served from via Cloudflare |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `deploy-web.sh` fails with "command not found: aws" | install the aws CLI; it's used purely as an S3-compatible client against R2. |
| 403 / access denied syncing to R2 | check `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` and that the key has write access to `garden-web`. |
| Site serves stale content | Cloudflare may be caching; purge the cache for the affected paths. |
| API returns CORS errors | confirm `ALLOWED_ORIGIN` on Cloud Run matches the site's origin exactly. |
| Cloud Run deploy can't read `TURSO_TOKEN` | confirm the `turso-token` secret exists in Secret Manager and the Cloud Run service account has `secretmanager.secretAccessor` on it. |

---

## Resources

- [Cloudflare R2 docs](https://developers.cloudflare.com/r2/)
- [Cloud Run docs](https://cloud.google.com/run/docs)
- [Turso docs](https://docs.turso.tech/)
- [Astro Static Site Deployment](https://docs.astro.build/en/guides/deploy/)
