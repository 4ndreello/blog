# Deploy to Google Cloud Platform

This guide covers deploying the static Astro site to GCP using **Cloud Storage**, **Cloud Load Balancer**, and **Cloud CDN**.

---

## Prerequisites

- A GCP project with billing enabled
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated (`gcloud auth login`)
- `gsutil` or `gcloud storage` commands available

---

## 1. Create a Cloud Storage Bucket

### Using the Console

1. Open [Cloud Storage Buckets](https://console.cloud.google.com/storage/browser).
2. Click **Create**.
3. Name the bucket (e.g., `my-blog-static-site`).
4. Choose a region close to your audience.
5. Under **Access control**, select **Uniform**.
6. Click **Create**.

### Using the CLI

```bash
export BUCKET_NAME=my-blog-static-site
export REGION=us-central1

gcloud storage buckets create gs://${BUCKET_NAME} \
  --location=${REGION} \
  --uniform-bucket-level-access
```

---

## 2. Make the Bucket Publicly Readable

### Console

1. Go to the bucket's **Permissions** tab.
2. Click **Grant Access**.
3. Add `allUsers` with the role **Storage Object Viewer**.

### CLI

```bash
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

---

## 3. Enable Website Configuration (Optional for Direct GCS Hosting)

If you plan to serve directly from the bucket URL (not recommended for production), configure the main page and error page:

### Console

1. Go to the bucket's **Configuration** tab.
2. Under **Website configuration**, set:
   - **Main page**: `index.html`
   - **Not found page**: `404.html`

### CLI

```bash
gcloud storage buckets update gs://${BUCKET_NAME} \
  --web-main-page-suffix=index.html \
  --web-error-page=404.html
```

> **Note:** For production, use a **Cloud Load Balancer** with a backend bucket instead of direct GCS hosting. This enables HTTPS, custom domains, and Cloud CDN.

---

## 4. Build the Astro Site

From the project root:

```bash
npm run build
```

The static files are output to `./dist/`.

---

## 5. Upload to Cloud Storage

### Using `gcloud storage cp`

```bash
gcloud storage cp -r ./dist/* gs://${BUCKET_NAME}/
```

### Using `gsutil rsync` (recommended, rsync-like behavior)

```bash
gsutil -m rsync -r -d ./dist/ gs://${BUCKET_NAME}/
```

- `-m` enables multithreaded uploads
- `-r` is recursive
- `-d` deletes remote files not present locally (keeps the bucket in sync)

### Set Cache Headers for Static Assets

Set long-lived cache headers for hashed assets (e.g., JS/CSS with content hashes):

```bash
# cache JS/CSS for 1 year
gsutil -m setmeta -h "Cache-Control: public, max-age=31536000, immutable" \
  gs://${BUCKET_NAME}/_astro/**

# cache images for 30 days
gsutil -m setmeta -h "Cache-Control: public, max-age=2592000" \
  gs://${BUCKET_NAME}/images/**
```

---

## 6. Configure Cloud Load Balancer + Cloud CDN

### Console

1. Open [Cloud Load Balancing](https://console.cloud.google.com/net-services/loadbalancing).
2. Click **Create Load Balancer** → **HTTP(S) Load Balancer**.
3. Under **Backend configuration**, click **Create Backend Bucket**:
   - Name: `my-blog-backend-bucket`
   - Cloud Storage bucket: select `my-blog-static-site`
   - Enable **Cloud CDN**
4. Under **Host and path rules**, keep the default.
5. Under **Frontend configuration**, add an IP and certificate:
   - IP: create or select an existing global IP
   - Certificate: create or select an SSL certificate (or use a Google-managed certificate)
6. Click **Create**.

### Using the CLI

```bash
export LB_NAME=my-blog-lb
export BACKEND_BUCKET=my-blog-backend-bucket
export IP_NAME=my-blog-ip

# reserve a global static IP
gcloud compute addresses create ${IP_NAME} --global

# create a backend bucket with Cloud CDN enabled
gcloud compute backend-buckets create ${BACKEND_BUCKET} \
  --gcs-bucket-name=${BUCKET_NAME} \
  --enable-cdn

# create a URL map
gcloud compute url-maps create ${LB_NAME} \
  --default-backend-bucket=${BACKEND_BUCKET}

# create a target HTTP proxy (use HTTPS for production)
gcloud compute target-http-proxies create ${LB_NAME}-proxy \
  --url-map=${LB_NAME}

# create a forwarding rule
gcloud compute forwarding-rules create ${LB_NAME}-forwarding-rule \
  --global \
  --target-http-proxy=${LB_NAME}-proxy \
  --ports=80 \
  --address=${IP_NAME}
```

For HTTPS, add an SSL certificate and use `target-https-proxies` instead.

---

## 7. Point a Custom Domain (Optional)

1. Get the load balancer IP:

   ```bash
   gcloud compute addresses describe ${IP_NAME} --global --format='value(address)'
   ```

2. Create a DNS `A` record at your domain registrar pointing to that IP.

3. (If using Google-managed SSL certificates) Add the domain to the certificate mapping in the load balancer frontend configuration.

---

## 8. Automate Deployments

Use the provided script:

```bash
./gcp-deploy.sh
```

Or add it to your CI/CD pipeline (GitHub Actions, Cloud Build, etc.).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 403 Forbidden | Ensure `allUsers` has `roles/storage.objectViewer` on the bucket. |
| 404 on routes | Astro builds `index.html` for each route. Ensure `gsutil rsync` uploads all files and the LB/backend bucket serves `index.html` for directory paths. |
| CSS/JS not updating | Check cache headers; use versioned filenames (Astro does this by default in `_astro/`). |
| CDN serving stale content | Invalidate the CDN cache or set appropriate `Cache-Control` headers. |

---

## Resources

- [GCP Cloud Storage docs](https://cloud.google.com/storage/docs)
- [GCP Cloud CDN docs](https://cloud.google.com/cdn/docs)
- [GCP Cloud Load Balancing docs](https://cloud.google.com/load-balancing/docs)
- [Astro Static Site Deployment](https://docs.astro.build/en/guides/deploy/)
