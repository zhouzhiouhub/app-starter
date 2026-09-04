# Infra

Local infrastructure starts with PostgreSQL and Redis:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Production deployment remains split by boundary:

- `apps/web`: Vercel storefront with ISR.
- `apps/admin`: static hosting for the Vite build output.
- `services/api`: independent Node.js service.
- Database: managed PostgreSQL, migrated with committed Prisma migrations.
- Cache and queues: managed Redis over TLS.
- Media: Cloudflare R2 private bucket plus public CDN origin.

## Production Runbook

Tick the operator list in
[`docs/development/production-env-checklist.md`](../docs/development/production-env-checklist.md)
before filling GitHub `production` secrets. This runbook covers the MVP release
path only. Commerce, checkout, payment,
order fulfillment, and non-default Locale publishing must stay disabled until a
later phase is explicitly approved in the design document.

### 1. Prepare Release Inputs

- Pick the source commit and release tag. Use the same commit for Web, Admin,
  API, Page Builder Visual, Production Smoke, and release notes.
- Confirm CI passed on the release commit:
  `pnpm install --frozen-lockfile`, `pnpm run check:file-size`,
  `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
- Keep `COMMERCE_ENABLED=false` and `MULTI_LOCALE_ENABLED=false` in API, Web,
  Admin build, and smoke runner environments.
- Configure `WEB_URL`, `ADMIN_URL`, and `API_URL` as production HTTPS origins.
  `API_URL` may be either the API origin or the exact `/api/v1` base.
- Configure production `DATABASE_URL`, `REDIS_URL`, JWT keys,
  `PREVIEW_TOKEN_SECRET`, `STOREFRONT_REVALIDATE_SECRET`,
  `STOREFRONT_REVALIDATE_URL`, R2 variables, CDN URL, analytics gates, and the
  non-default smoke admin credentials described in `.env.example`.

### 2. Production Environment Matrix

The `Production Smoke` workflow maps protected GitHub environment values into
the same runtime variables used by the API, Web, Admin, and smoke runner.

| Runtime variable                | GitHub source                                             | Applies to                              | Smoke evidence                                        |
| ------------------------------- | --------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `APP_ENV`                       | `production`                                              | API, Web, smoke runner                  | production-mode config diagnostics                    |
| `API_URL`                       | `${{ secrets.PRODUCTION_API_URL }}`                       | Smoke runner, Admin build fallback      | API health, admin API, publish, rollback              |
| `WEB_URL`                       | `${{ secrets.PRODUCTION_WEB_URL }}`                       | Web, smoke runner, Admin build fallback | storefront HTML, robots, sitemap, ISR fallback        |
| `ADMIN_URL`                     | `${{ secrets.PRODUCTION_ADMIN_URL }}`                     | Smoke runner                            | Admin shell, module scripts, stylesheets              |
| `DATABASE_URL`                  | `${{ secrets.PRODUCTION_DATABASE_URL }}`                  | API                                     | production PostgreSQL readiness and Prisma migrations |
| `REDIS_URL`                     | `${{ secrets.PRODUCTION_REDIS_URL }}`                     | API                                     | production TLS Redis readiness                        |
| `JWT_PRIVATE_KEY`               | `${{ secrets.PRODUCTION_JWT_PRIVATE_KEY }}`               | API                                     | RS256 signing diagnostics                             |
| `JWT_PUBLIC_KEY`                | `${{ secrets.PRODUCTION_JWT_PUBLIC_KEY }}`                | API                                     | RS256 verification diagnostics                        |
| `PREVIEW_TOKEN_SECRET`          | `${{ secrets.PRODUCTION_PREVIEW_TOKEN_SECRET }}`          | API                                     | preview token readiness                               |
| `PREVIEW_TOKEN_PREVIOUS_SECRET` | `${{ secrets.PRODUCTION_PREVIEW_TOKEN_PREVIOUS_SECRET }}` | API                                     | preview token rotation diagnostics                    |
| `STOREFRONT_REVALIDATE_SECRET`  | `${{ secrets.PRODUCTION_STOREFRONT_REVALIDATE_SECRET }}`  | API and Web                             | publish and rollback ISR revalidation                 |
| `STOREFRONT_REVALIDATE_URL`     | `${{ secrets.PRODUCTION_STOREFRONT_REVALIDATE_URL }}`     | API                                     | deployed Web `/api/revalidate` endpoint               |
| `R2_ACCOUNT_ID`                 | `${{ secrets.PRODUCTION_R2_ACCOUNT_ID }}`                 | API                                     | R2 presigned upload diagnostics                       |
| `R2_ACCESS_KEY_ID`              | `${{ secrets.PRODUCTION_R2_ACCESS_KEY_ID }}`              | API                                     | R2 presigned upload diagnostics                       |
| `R2_SECRET_ACCESS_KEY`          | `${{ secrets.PRODUCTION_R2_SECRET_ACCESS_KEY }}`          | API                                     | R2 presigned upload diagnostics                       |
| `R2_BUCKET`                     | `${{ secrets.PRODUCTION_R2_BUCKET }}`                     | API                                     | R2 object key and upload target checks                |
| `R2_REGION`                     | `${{ vars.PRODUCTION_R2_REGION }}`                        | API                                     | R2 endpoint diagnostics                               |
| `MEDIA_CDN_BASE_URL`            | `${{ vars.PRODUCTION_MEDIA_CDN_BASE_URL }}`               | API and Web                             | CDN URL safety and media delivery traceability        |
| `MEDIA_EXTERNAL_URL_HOSTS`      | `${{ vars.PRODUCTION_MEDIA_EXTERNAL_URL_HOSTS }}`         | API                                     | external media allowlist diagnostics                  |
| `ANALYTICS_ENABLED`             | `${{ vars.PRODUCTION_ANALYTICS_ENABLED }}`                | Web                                     | analytics runtime gate diagnostics                    |
| `ANALYTICS_CONSENT_GRANTED`     | `${{ vars.PRODUCTION_ANALYTICS_CONSENT_GRANTED }}`        | Web                                     | consent gate diagnostics                              |
| `GTM_CONTAINER_ID`              | `${{ vars.PRODUCTION_GTM_CONTAINER_ID }}`                 | Web                                     | GTM provider diagnostics                              |
| `GA4_MEASUREMENT_ID`            | `${{ vars.PRODUCTION_GA4_MEASUREMENT_ID }}`               | Web                                     | GA4 provider diagnostics                              |
| `CLARITY_PROJECT_ID`            | `${{ vars.PRODUCTION_CLARITY_PROJECT_ID }}`               | Web                                     | Clarity provider diagnostics                          |
| `COMMERCE_ENABLED`              | `"false"`                                                 | API, Web, smoke runner                  | disabled Commerce contract                            |
| `MULTI_LOCALE_ENABLED`          | `"false"`                                                 | API, Web, smoke runner                  | disabled non-default Locale contract                  |
| `STRIPE_SECRET_KEY`             | `${{ secrets.PRODUCTION_STRIPE_SECRET_KEY }}`             | API                                     | optional Phase 2 Stripe secret format diagnostics     |
| `STRIPE_WEBHOOK_SECRET`         | `${{ secrets.PRODUCTION_STRIPE_WEBHOOK_SECRET }}`         | API                                     | optional Phase 2 webhook secret format diagnostics    |
| `SMOKE_ADMIN_EMAIL`             | `${{ secrets.PRODUCTION_SMOKE_ADMIN_EMAIL }}`             | Smoke runner                            | login and audit scoped checks                         |
| `SMOKE_ADMIN_PASSWORD`          | `${{ secrets.PRODUCTION_SMOKE_ADMIN_PASSWORD }}`          | Smoke runner                            | login and audit scoped checks                         |
| `SMOKE_REQUIRE_ADMIN_APP`       | `${{ inputs.require_admin_app }}`                         | Smoke runner                            | Admin static hosting gate                             |
| `SMOKE_REQUIRE_R2_UPLOAD`       | `${{ inputs.require_r2_upload }}`                         | Smoke runner                            | real R2 upload and CDN gate                           |
| `SMOKE_REQUIRE_REVALIDATION`    | `${{ inputs.require_revalidation }}`                      | Smoke runner                            | ISR revalidation gate                                 |
| `SMOKE_STOREFRONT_HOST`         | `${{ inputs.storefront_host }}`                           | Smoke runner                            | storefront canonical host override diagnostics        |
| `SMOKE_REPORT_PATH`             | `${{ inputs.report_path }}`                               | Smoke runner                            | archived `smoke-report.v3` JSON                       |

If the Admin static host cannot proxy `/api/v1` or infer the storefront origin,
set `VITE_API_URL` and `VITE_WEB_URL` at Admin build time to the same production
HTTPS values used by `API_URL` and `WEB_URL`.

### 3. Deploy Services

1. Run database migrations against the production PostgreSQL instance:

   ```bash
   pnpm --filter @app-starter/api exec prisma migrate deploy --schema prisma/schema.prisma
   ```

2. Seed only the tenant, site, roles, smoke admin, and MVP starter pages:

   ```bash
   pnpm --filter @app-starter/api run prisma:seed
   ```

3. Deploy `services/api` as an independent Node.js service with:

   ```bash
   pnpm --filter @app-starter/api build
   pnpm --filter @app-starter/api start
   ```

4. Deploy `apps/web` to Vercel with production `API_URL`, `WEB_URL`, and
   `STOREFRONT_REVALIDATE_SECRET`. In the Vercel project, set **Root Directory**
   to `apps/web` (Settings → General). This repo is a pnpm monorepo; leaving the
   root directory empty deploys the workspace root and Vercel returns platform
   `404 NOT_FOUND` for `https://<project>.vercel.app/`. After changing the root
   directory, redeploy the production `master` or `main` branch. The Next.js
   install/build commands live in `apps/web/vercel.json`.
5. Build and deploy `apps/admin/dist` to static hosting:

   ```bash
   pnpm --filter @app-starter/admin build
   ```

6. Confirm Cloudflare R2 upload credentials are configured, the bucket is not
   public by default, and `MEDIA_CDN_BASE_URL` is the production CDN origin or
   directory prefix.

### 4. Capture Visual Evidence

Run the `Page Builder Visual` workflow first and retain the
`page-builder-visual-fixture-<run_number>` artifact. If final sign-off is in
scope, attach real Desktop and Mobile design PNGs under
`docs/visual/page-builder-references/`, import them, measure the diff, and
verify the manifest with:

```bash
pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete
pnpm visual:measure -- --write --require-complete
pnpm visual:acceptance -- --require-accepted
```

### 5. Run Production Smoke

Trigger the `Production Smoke` GitHub Actions workflow from the protected
`production` environment.

- Keep `require_admin_app=true`, `require_r2_upload=true`, and
  `require_revalidation=true` for release evidence.
- Provide `visual_artifact_name` and `visual_artifact_run_id` when Page Builder
  visual evidence is part of the release review.
- Provide `release_tag`, `rollback_target`, `visual_artifact_name`, and
  `visual_artifact_run_id` together when the same workflow should generate
  release notes with the generated preflight artifact name.
- Leave `allow_blocked_release_notes=false` for formal release sign-off. Use it
  only for failure review drafts.

The workflow must upload:

- `production-smoke-report-<run_number>` with `smoke-report.json` and
  `smoke-report.md`.
- `release-preflight-<run_number>` with `preflight.json` and `preflight.md`.
- `release-evidence-check-<run_number>` with `release-check.json` and
  `release-check.md`.
- `project-status-<run_number>` with `project-status.json` and
  `project-status.md`.
- `release-notes-<run_number>` when release note inputs were provided.

### 6. Review Gates

Before marking the release ready, the archived evidence must pass:

```bash
pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json
pnpm smoke:release-check -- artifacts/production-smoke/smoke-report.json
pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture
pnpm release:handoff -- --require-ready --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture
pnpm release:notes -- --release-tag v0.1.0 --workflow-run-url https://github.com/zhouzhiouhub/app-starter/actions/runs/123 --local-verification-run-url https://github.com/zhouzhiouhub/app-starter/actions/runs/122 --local-verification-artifact local-verification-122 --smoke-artifact production-smoke-report-123 --preflight-artifact release-preflight-123 --release-artifact release-evidence-check-123 --project-status artifacts/release/project-status.json --project-status-artifact project-status-123 --visual-artifact page-builder-visual-fixture-123 --storefront-url https://store.brand.com --rollback-target main@abcdef1 --output docs/releases/v0.1.0.md
```

`release:check` and `release:handoff -- --require-ready` must stay blocked until
Production Smoke is release-ready and Page Builder visual evidence is accepted.

### 7. Rollback

Keep rollback target values concrete, such as `main@abcdef1`, a release tag, or
the previous deployment identifier.

- Web: roll Vercel back to the previous production deployment and rerun the
  storefront and SEO smoke checks.
- Admin: redeploy the previous static `apps/admin/dist` artifact and rerun the
  Admin static app smoke checks.
- API: redeploy the previous Node.js build or container image. Do not run
  destructive database rollbacks; ship a forward migration or restoration plan
  if schema state must change.
- Published content: use the Page rollback API or Admin rollback action so the
  publish history and audit log remain append-only.
- Media: keep R2 objects immutable for the release window; rollback page
  schemas to references that are still retained.

After rollback, rerun Production Smoke and keep both the failed and fixed
workflow runs with the release record.
