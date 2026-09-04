# Production Environment Checklist

Use this list before deploying MVP and running Production Smoke. Deployment
steps and the full variable matrix stay in [`infra/README.md`](../../infra/README.md).
Commerce and non-default Locale publishing stay disabled.

Local Page Builder Visual is already `accepted` (12/12). This checklist only
unblocks the remaining Production Smoke evidence.

## 1. Hosting

- [ ] Cloud PostgreSQL (not `localhost`) with committed Prisma migrations
- [ ] Cloud Redis over `rediss://`
- [ ] Independent Node.js API host with HTTPS `API_URL`
- [ ] Vercel storefront with HTTPS `WEB_URL`
- [ ] Vercel Root Directory set to `apps/web` (not the monorepo root)
- [ ] Vercel Production env `API_URL` pointing at the deployed API `/api/v1` origin
- [ ] Vercel Production env `WEB_URL` set, or rely on `VERCEL_URL` for the default `.vercel.app` host
- [ ] Admin static host with HTTPS `ADMIN_URL`
- [ ] Cloudflare R2 private bucket plus public CDN origin

## 2. Required GitHub `production` secrets

- [ ] `PRODUCTION_API_URL`
- [ ] `PRODUCTION_WEB_URL`
- [ ] `PRODUCTION_ADMIN_URL`
- [ ] `PRODUCTION_DATABASE_URL`
- [ ] `PRODUCTION_REDIS_URL`
- [ ] `PRODUCTION_SMOKE_ADMIN_EMAIL` (not the documented local default)
- [ ] `PRODUCTION_SMOKE_ADMIN_PASSWORD`
- [ ] `PRODUCTION_R2_ACCOUNT_ID`
- [ ] `PRODUCTION_R2_ACCESS_KEY_ID`
- [ ] `PRODUCTION_R2_SECRET_ACCESS_KEY`
- [ ] `PRODUCTION_R2_BUCKET`
- [ ] `PRODUCTION_PREVIEW_TOKEN_SECRET`
- [ ] `PRODUCTION_JWT_PRIVATE_KEY`
- [ ] `PRODUCTION_JWT_PUBLIC_KEY`
- [ ] `PRODUCTION_STOREFRONT_REVALIDATE_SECRET`
- [ ] `PRODUCTION_STOREFRONT_REVALIDATE_URL`

Leave `PRODUCTION_STRIPE_SECRET_KEY` and `PRODUCTION_STRIPE_WEBHOOK_SECRET`
empty for MVP.

## 3. Required GitHub `production` variables

- [ ] `PRODUCTION_MEDIA_CDN_BASE_URL` (real HTTPS CDN, not `example` / local / private)
- [ ] `PRODUCTION_R2_REGION`
- [ ] `PRODUCTION_MEDIA_EXTERNAL_URL_HOSTS` (optional allowlist)
- [ ] `PRODUCTION_ANALYTICS_ENABLED=false` until Cookie Consent exists
- [ ] `PRODUCTION_ANALYTICS_CONSENT_GRANTED=false`
- [ ] `PRODUCTION_GTM_CONTAINER_ID` empty or a valid GTM id
- [ ] `PRODUCTION_GA4_MEASUREMENT_ID` empty or a valid GA4 id
- [ ] `PRODUCTION_CLARITY_PROJECT_ID` empty or a valid Clarity id

## 4. Runtime flags

Set the same values on API, Web, Admin build, and the smoke runner:

```env
COMMERCE_ENABLED=false
MULTI_LOCALE_ENABLED=false
DEFAULT_MARKET=us
DEFAULT_LOCALE=en-US
DEFAULT_CURRENCY=USD
FALLBACK_LOCALE=en-US
```

## 5. After services are live

1. `pnpm --filter @app-starter/api exec prisma migrate deploy --schema prisma/schema.prisma`
2. Seed the production smoke admin and MVP starter pages.
3. Confirm `/api/v1/health`, storefront `/en`, Admin shell, and R2 upload.
4. Run `pnpm release:requests` and replace Production Smoke dispatch placeholders.
5. Trigger GitHub Actions `Production Smoke` with:
   - `visual_artifact_name=page-builder-visual-fixture-<run_number>`
   - `visual_artifact_run_id`
   - `local_verification_run_url`
   - `local_verification_artifact_name=local-verification-<run_number>`
6. Keep `production-smoke-report-<run>`, `release-preflight-<run>`,
   `release-evidence-check-<run>`, and `project-status-<run>`.

This repository cannot finish Production Smoke until the cloud accounts, DNS,
and GitHub `production` environment values above exist.
