# GitHub Actions CI/CD — deploy web + api on push to main

**Date:** 2026-07-08
**Repo:** `git@github.com:4ndreello/blog.git` (branch `main`)

## Objetivo

Qualquer push na `main` builda e faz deploy automático. Path-filtered: web só quando `apps/web` muda, api só quando `apps/api` muda. Sem GitHub Release/tag.

## Workflows

### `.github/workflows/deploy-web.yml`
- **Trigger:** `push` na `main`, paths: `apps/web/**`, `pnpm-lock.yaml`, `package.json`, `pnpm-workspace.yaml`, o próprio workflow.
- **Runner:** `ubuntu-latest` (tem `aws` CLI pré-instalado).
- **Steps:**
  1. checkout
  2. setup pnpm (`pnpm/action-setup@v4`, versão 11)
  3. setup node 22 + cache pnpm
  4. `pnpm install --frozen-lockfile`
  5. `pnpm --filter web build` — `PUBLIC_API_URL` vem de secret (inlinado pelo Astro no build).
  6. `aws s3 sync apps/web/dist s3://$R2_BUCKET_NAME --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com --delete` (mesma lógica do `deploy-web.sh`), com `AWS_ACCESS_KEY_ID/SECRET` = R2 keys.

### `.github/workflows/deploy-api.yml`
- **Trigger:** `push` na `main`, paths: `apps/api/**`, o próprio workflow.
- **Runner:** `ubuntu-latest`.
- **Steps:**
  1. checkout
  2. `google-github-actions/auth@v2` com `credentials_json: ${{ secrets.GCP_SA_KEY }}`
  3. `google-github-actions/setup-gcloud@v2`
  4. `gcloud run deploy garden-api --source apps/api --project webpolibrasil --region us-east1 --allow-unauthenticated --set-env-vars "TURSO_URL=...,ALLOWED_ORIGIN=..." --set-secrets "TURSO_TOKEN=turso-token:latest"`

## Secrets (GitHub → Settings → Secrets and variables → Actions)

| Nome | Uso | Valor |
|---|---|---|
| `R2_ACCOUNT_ID` | web deploy | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | web deploy | R2 access key |
| `R2_SECRET_ACCESS_KEY` | web deploy | R2 secret |
| `R2_BUCKET_NAME` | web deploy | `garden-web` |
| `PUBLIC_API_URL` | web build | `https://garden-api-361874528796.us-east1.run.app` |
| `GCP_SA_KEY` | api deploy | JSON key de service account com roles: run.admin, cloudbuild.builds.editor, iam.serviceAccountUser, storage.admin, secretmanager.secretAccessor |
| `TURSO_URL` | api deploy | `libsql://garden-viwes-...turso.io` |
| `ALLOWED_ORIGIN` | api deploy | origin público do site (ex. `https://blog.andreello.dev.br`) |

Hardcoded no workflow (não-secreto): project `webpolibrasil`, region `us-east1`, service `garden-api`.

## Setup manual do usuário (fora do código)

1. Criar service account no GCP + baixar JSON key, com as roles acima.
2. Colar os 8 secrets no GitHub.
3. `turso-token` já existe no GCP Secret Manager (usado via `--set-secrets`) — nada a fazer.

## Fora de escopo

- `deploy-web.sh` continua existindo (deploy manual local ainda funciona).
- Sem testes no CI de web (não há). `apps/api` tem `bun test` — **opcional**: rodar antes do deploy? (decidir).
- Workload Identity (escolhido SA key).
