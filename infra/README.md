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

This runbook covers the MVP release path only. Commerce, checkout, payment,
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

### 2. Deploy Services

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
   `STOREFRONT_REVALIDATE_SECRET`.
5. Build and deploy `apps/admin/dist` to static hosting:

   ```bash
   pnpm --filter @app-starter/admin build
   ```

6. Confirm Cloudflare R2 upload credentials are configured, the bucket is not
   public by default, and `MEDIA_CDN_BASE_URL` is the production CDN origin or
   directory prefix.

### 3. Capture Visual Evidence

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

### 4. Run Production Smoke

Trigger the `Production Smoke` GitHub Actions workflow from the protected
`production` environment.

- Keep `require_admin_app=true`, `require_r2_upload=true`, and
  `require_revalidation=true` for release evidence.
- Provide `visual_artifact_name` and `visual_artifact_run_id` when Page Builder
  visual evidence is part of the release review.
- Provide `release_tag`, `rollback_target`, `visual_artifact_name`, and
  `visual_artifact_run_id` together when the same workflow should generate
  release notes.
- Leave `allow_blocked_release_notes=false` for formal release sign-off. Use it
  only for failure review drafts.

The workflow must upload:

- `production-smoke-report-<run_number>` with `smoke-report.json` and
  `smoke-report.md`.
- `release-evidence-check-<run_number>` with `release-check.json` and
  `release-check.md`.
- `project-status-<run_number>` with `project-status.json` and
  `project-status.md`.
- `release-notes-<run_number>` when release note inputs were provided.

### 5. Review Gates

Before marking the release ready, the archived evidence must pass:

```bash
pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json
pnpm smoke:release-check -- artifacts/production-smoke/smoke-report.json
pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture
pnpm release:handoff -- --require-ready --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture
pnpm release:notes -- --release-tag v0.1.0 --workflow-run-url https://github.com/zhouzhiouhub/app-starter/actions/runs/123 --smoke-artifact production-smoke-report-123 --release-artifact release-evidence-check-123 --project-status artifacts/release/project-status.json --project-status-artifact project-status-123 --visual-artifact page-builder-visual-fixture-123 --storefront-url https://store.brand.com --rollback-target main@abcdef1 --output docs/releases/v0.1.0.md
```

`release:check` and `release:handoff -- --require-ready` must stay blocked until
Production Smoke is release-ready and Page Builder visual evidence is accepted.

### 6. Rollback

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
