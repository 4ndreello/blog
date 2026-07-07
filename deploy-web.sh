#!/usr/bin/env bash
set -euo pipefail

# load env (R2 creds + bucket)
set -a; . ./.env; set +a

pnpm --filter web build

# R2 speaks the S3 API. use the R2 keys as AWS creds for this invocation.
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 sync apps/web/dist "s3://${R2_BUCKET_NAME}" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --delete

echo "deployed apps/web/dist -> R2 bucket ${R2_BUCKET_NAME}"
