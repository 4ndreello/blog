#!/usr/bin/env bash
# gcp-deploy.sh — idempotent deploy of the Astro dist/ folder to a GCS bucket
set -euo pipefail

# ---------------------------------------------------------------------------
# configuration — edit these variables for your project
# ---------------------------------------------------------------------------
BUCKET_NAME="${BUCKET_NAME:-my-blog-static-site}"
DIST_DIR="${DIST_DIR:-./dist}"

# ---------------------------------------------------------------------------
# pre-flight checks
# ---------------------------------------------------------------------------
if ! command -v gsutil &> /dev/null; then
  echo "error: gsutil not found. install the gcloud sdk first."
  exit 1
fi

if [ ! -d "$DIST_DIR" ]; then
  echo "error: $DIST_DIR does not exist. run 'pnpm build' first."
  exit 1
fi

# ---------------------------------------------------------------------------
# build (optional — uncomment if you want the script to build as well)
# ---------------------------------------------------------------------------
# pnpm build

# ---------------------------------------------------------------------------
# sync dist/ to the bucket (rsync-like, deletes removed files)
# ---------------------------------------------------------------------------
echo "==> syncing $DIST_DIR to gs://$BUCKET_NAME/ ..."
gsutil -m rsync -r -d "$DIST_DIR" "gs://$BUCKET_NAME/"

# ---------------------------------------------------------------------------
# set cache headers for hashed assets (immutable, 1 year)
# ---------------------------------------------------------------------------
echo "==> setting cache headers for hashed assets ..."
if gsutil ls "gs://$BUCKET_NAME/_astro/**" > /dev/null 2>&1; then
  gsutil -m setmeta -h "Cache-Control: public, max-age=31536000, immutable" \
    "gs://$BUCKET_NAME/_astro/**"
fi

# ---------------------------------------------------------------------------
# set cache headers for images (30 days)
# ---------------------------------------------------------------------------
echo "==> setting cache headers for images ..."
if gsutil ls "gs://$BUCKET_NAME/images/**" > /dev/null 2>&1; then
  gsutil -m setmeta -h "Cache-Control: public, max-age=2592000" \
    "gs://$BUCKET_NAME/images/**"
fi

# ---------------------------------------------------------------------------
# set cache headers for html (no cache)
# ---------------------------------------------------------------------------
echo "==> setting cache headers for html ..."
if gsutil ls "gs://$BUCKET_NAME/*.html" > /dev/null 2>&1; then
  gsutil -m setmeta -h "Cache-Control: public, max-age=0, must-revalidate" \
    "gs://$BUCKET_NAME/*.html"
fi

echo "==> deploy complete."
echo "    bucket: gs://$BUCKET_NAME"
