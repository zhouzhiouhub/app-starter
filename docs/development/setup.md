# Development Setup

## Requirements

- Node.js 20.18+
- pnpm 9+
- Docker for local PostgreSQL; Redis is optional until queue/cache work is enabled

## Install

```bash
pnpm install
```

## Local Services

```bash
docker compose -f infra/docker-compose.yml up -d
```

## Environment

Copy `.env.example` to `.env` and keep MVP feature flags disabled unless the
design document enters the matching phase:

```bash
COMMERCE_ENABLED=false
MULTI_LOCALE_ENABLED=false
```

Runtime boolean gates accept only `true`/`false`, `1`/`0`, `yes`/`no`, or
`on`/`off`; misspelled values fail instead of silently changing feature or
analytics gates.

MVP refresh-token replay protection is PostgreSQL-backed. Redis is not required
for local login or session tests until cache, queue, or high-frequency session
invalidations are enabled. Production smoke readiness still records `REDIS_URL`
because Redis is part of the production deployment topology for cache, queue,
and future session invalidation work.

In production, the API requires `DATABASE_URL` to be a PostgreSQL connection URL
whose host is not local, loopback, Docker-local, or a reserved placeholder. Local
development can still use `localhost`, but production startup fails before
Prisma connects if the database URL is unsafe. Database production mode is
detected from `NODE_ENV`, `APP_ENV`, or `VERCEL_ENV`.
Production smoke readiness also expects `REDIS_URL` to be a `rediss://` endpoint
outside local, private, Docker-local, or reserved placeholder hosts.
Production API CORS reads `WEB_URL` and `ADMIN_URL` as allowed browser origins;
both must be HTTPS origins without paths, query strings, fragments, embedded
credentials, local hosts, private hosts, or reserved placeholder hosts. CORS
production mode is detected from `NODE_ENV`, `APP_ENV`, or `VERCEL_ENV`.

Media uploads use local fallback URLs only outside production. In production,
the API requires the full R2 upload configuration and a safe explicit
`MEDIA_CDN_BASE_URL`; otherwise upload target or managed CDN URL creation fails
instead of returning `.local.invalid` placeholders. Media production mode is
detected from `NODE_ENV`, `APP_ENV`, or `VERCEL_ENV`.
Production R2 readiness validates the configuration before issuing presigned
URLs: `R2_ACCOUNT_ID` must be a DNS-safe label, `R2_BUCKET` must be 3 to 63
characters using lowercase letters, numbers, dots, or hyphens, without adjacent
dot/hyphen pairs or IP address format, and R2 credentials plus `R2_REGION` must
not contain whitespace or control characters.

For storefront ISR, set the same secret in the API and Web runtimes. The API
uses `STOREFRONT_REVALIDATE_URL` to call the Web app after publish or rollback:

```bash
STOREFRONT_REVALIDATE_SECRET=local-revalidate-secret
STOREFRONT_REVALIDATE_URL=http://localhost:3000/api/revalidate
STOREFRONT_REVALIDATE_TIMEOUT_MS=5000
```

`STOREFRONT_REVALIDATE_SECRET` must be a non-empty value up to 1024 characters
without control characters. Production smoke readiness treats oversized or
control-character secrets as unsafe instead of configured.

`STOREFRONT_REVALIDATE_URL` can be the full Web revalidation route. If it is
set to the Web origin only, the API normalizes it to `/api/revalidate`.
Explicit revalidation URLs with any other path are rejected before publish.
In production, both the explicit revalidation URL and the `WEB_URL` fallback
must resolve to an HTTPS endpoint outside local, private, Docker-local, or
reserved placeholder hosts. Revalidation production mode is detected from
`NODE_ENV`, `APP_ENV`, or `VERCEL_ENV`.
`STOREFRONT_REVALIDATE_TIMEOUT_MS` accepts integer values from 1 to 30000. Empty,
invalid, fractional, or longer values fall back to 5000 ms.

Admin JWTs use an RS256 key pair. Local development can leave both values empty,
which makes the API generate an ephemeral non-production key pair. Production
is detected from `NODE_ENV`, `APP_ENV`, or `VERCEL_ENV`, and must set both values
to a matching PEM key pair. Setting only one value, using invalid PEM, or
combining keys from different pairs makes the API reject the configuration
instead of silently issuing broken tokens:

```bash
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
```

Preview links use a short-lived token. Local development can leave
`PREVIEW_TOKEN_SECRET` empty, which uses a non-production fallback. Production
is detected from `NODE_ENV`, `APP_ENV`, or `VERCEL_ENV`, and must set an
explicit secret:

```bash
PREVIEW_TOKEN_SECRET=
PREVIEW_TOKEN_PREVIOUS_SECRET=
PREVIEW_TOKEN_TTL_SECONDS=3600
```

Production `PREVIEW_TOKEN_SECRET` must be 32 to 1024 characters and must not
contain control characters. If `PREVIEW_TOKEN_PREVIOUS_SECRET` is configured
for rotation, it must satisfy the same boundary. The API rejects unsafe
production preview-token secrets, and smoke readiness reports them as blockers.

To rotate the Preview Token secret, deploy the new value in
`PREVIEW_TOKEN_SECRET` and keep the old value in
`PREVIEW_TOKEN_PREVIOUS_SECRET` for longer than `PREVIEW_TOKEN_TTL_SECONDS`.
New preview links are signed with the current secret; existing unexpired links
can still be verified with the previous secret during the rotation window.
`PREVIEW_TOKEN_TTL_SECONDS` accepts values from 1 to 3600 seconds. Invalid or
longer values fall back to 3600 seconds so preview links stay short lived.

Analytics provider IDs can be configured through environment variables, but the
Web app only loads GTM, GA4, or Clarity when both runtime gates are explicit:

```bash
ANALYTICS_ENABLED=false
ANALYTICS_CONSENT_GRANTED=false
GTM_CONTAINER_ID=
GA4_MEASUREMENT_ID=
CLARITY_PROJECT_ID=
```

## Run

```bash
pnpm --filter @app-starter/api exec prisma db push --schema prisma/schema.prisma
pnpm --filter @app-starter/api run prisma:seed
pnpm dev
```

Local development may continue to use `prisma db push` while the schema is
changing quickly. Production deploys must use the committed Prisma migration
files under `services/api/prisma/migrations` and run `prisma migrate deploy`.
Production smoke readiness treats a missing migrations directory, a missing
`migration_lock.toml`, or an empty migrations directory as a blocker even when
`DATABASE_URL` itself is production-safe.

`prisma:seed` creates the default tenant, site, seed admin, and published Home,
Privacy Policy, Terms of Service, and 404 starter pages. It keeps already
published starter pages intact and creates any missing MVP pages.

Page write APIs use an `IdempotencyRecord` table, and Preview Token issuance plus
page publish/rollback use an append-only `AuditLog` table. The audit log endpoint
(`GET /api/v1/audit-logs`) is admin-only, scoped to the current tenant, and
requires `audit:read`. After pulling schema changes, run `prisma db push` again
in local development so repeated publish/create requests can be safely
deduplicated and sensitive page actions can be audited. After pulling role or
scope changes, run `pnpm --filter @app-starter/api run prisma:seed` again and
sign in with a fresh Admin session.

Admin page, localization, and commerce management APIs require a Bearer access
token from `POST /api/v1/auth/login`. Public storefront routes stay unauthenticated.

Sign in at the Admin page (`http://localhost:5173/login` or the LAN equivalent).
Do not open `/api/v1/auth/login` in the browser address bar; that path is a
POST API. A GET to it returns a usage hint, and the Vite dev server redirects
that GET to `/login`.

In local development the Admin app calls `/api/v1` on its own origin. Vite
proxies those requests to the API on port 4000, so the browser does not POST
login to the Vite server itself.

For Admin production builds, set `VITE_API_URL` and `VITE_WEB_URL` when the
Admin static origin cannot proxy `/api/v1` or infer the storefront origin. If
they are empty, the build falls back to the shared `API_URL` and `WEB_URL`
environment variables. Production absolute Admin API and Web URL values must be
HTTPS URLs outside local, private, Docker-local, or reserved placeholder hosts;
the relative `/api/v1` base remains valid when the Admin origin proxies API
requests.
Admin production builds do not synthesize storefront links from the current
Admin browser hostname; configure a safe `VITE_WEB_URL` / `WEB_URL` or a safe
site domain before using Preview or View on site links.
When `SMOKE_REQUIRE_ADMIN_APP=true`, production smoke also verifies the Admin
shell, module entry script, modulepreload chunks, and declared stylesheet assets
from the same Admin origin.

For Web production deployments, `VERCEL_ENV=production` or `APP_ENV=production`
requires `API_URL` / `NEXT_PUBLIC_API_URL` and `WEB_URL` / `NEXT_PUBLIC_WEB_URL`
to resolve to production HTTPS URLs outside local, private, placeholder, or
documentation hosts. Local development can still use localhost fallbacks.
Storefront page, robots, sitemap, and 404 smoke requests use manual redirects;
a production 30x response is reported with a redacted `Location` so deployment
rewrites, storefront host routing, and `WEB_URL` can be fixed before launch.
For local Page Builder visual sign-off, set
`ENABLE_VISUAL_ACCEPTANCE_FIXTURE=true` before starting the Web app, then open
`/visual-acceptance?viewport=desktop` and
`/visual-acceptance?viewport=mobile` to capture full-page evidence
screenshots. Add `&component=hero-banner`, `rich-text`, `image-gallery`,
`cta-bar`, `faq`, or `spec-table` to isolate one MVP section, or run
`pnpm visual:capture` against the running fixture server. Use
`pnpm visual:capture:fixture` to build Web, start the gated fixture server,
refresh every component screenshot path in the visual acceptance manifest, and
stop the server. Keep this flag disabled in production and public preview
environments.

After sign-in, open `http://localhost:5173/pages` to list and create pages.
The editor at `/pages/:id` loads the draft schema, can save a draft, and can
publish to the storefront. The Preview action saves the draft, creates a
short-lived token, and opens the Web app at `/preview?token=...`.
Open `http://localhost:5173/settings` to manage the default site name and
domain, and to inspect the MVP default market, locale, currency, and feature
flags.
Open `http://localhost:5173/localization` to inspect the default Market /
Locale data, save, paginate, and filter default Locale Translation entries, see
repeated key updates, review missing default Translation keys from page schemas,
the non-default Translation fallback probe, the multi-locale write-disabled
state, the current Translation empty state, bulk import/export preview reports,
and the reserved execution contracts.
Open `http://localhost:5173/audit-logs` to review tenant-scoped Preview Token,
publish, and rollback audit logs. The Page Builder toolbar also has an Audit
logs action that opens this page filtered to the current page target.

Default local ports:

- Web: http://localhost:3000
- Admin: http://localhost:5173
- API: http://localhost:4000/api/v1/health

Admin Vite is bound to `0.0.0.0`, so you can open it from a LAN IP such as
`http://192.168.0.200:5173`. In development, Admin calls `/api/v1` on the same
origin and Vite proxies those requests to `http://127.0.0.1:4000`. Wait until
the API logs `Nest application successfully started` before signing in.

## Publish Smoke Test

After API and Web are running, verify the publishing path with:

```bash
pnpm smoke:publish
```

`API_URL` must be an `http` or `https` origin, or the exact `/api/v1` base URL.
`WEB_URL` must be the storefront origin. The smoke runner rejects embedded
credentials, query strings, fragments, unsupported protocols, and unexpected
paths before it sends login or publish requests. It also validates
`SMOKE_PAGE_SLUG`, `SMOKE_LOCALE`, and `SMOKE_MARKET` before creating the smoke
page so invalid schema context fails before any publish request is sent.
The login smoke request uses manual redirects so a 30x response is reported
instead of following a wrong API proxy, old domain, or hosted login page with
the admin credentials.
Boolean smoke flags accept only `true`/`false`, `1`/`0`, `yes`/`no`, or
`on`/`off`; misspelled values fail instead of silently disabling a check.
Retry settings are also validated: `SMOKE_RETRY_ATTEMPTS` must be 1-60 and
`SMOKE_RETRY_DELAY_MS` must be 1-60000 milliseconds.
`SMOKE_REPORT_PATH` must be a relative `.json` path under `tmp/`, `reports/`,
`artifacts/`, or `.tmp/` so report writes cannot target source or system paths.
Production readiness requires this path so every production smoke run leaves a
machine-readable artifact.

Review archived smoke reports with:

```bash
pnpm smoke:report
pnpm smoke:report -- --list --limit=10
pnpm smoke:report -- reports/production/smoke-report.json
pnpm smoke:release-check -- artifacts/production-smoke/smoke-report.json
pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete
pnpm release:preflight
pnpm release:check -- --checklist --smoke-report artifacts/production-smoke/smoke-report.json
pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json
pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture
pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --json
pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --output artifacts/release/release-check.json
pnpm project:status
pnpm project:status -- --json
pnpm release:notes -- --release-tag v0.1.0 --workflow-run-url https://github.com/zhouzhiouhub/app-starter/actions/runs/123 --smoke-artifact production-smoke-report-123 --release-artifact release-evidence-check-123 --visual-artifact page-builder-visual-fixture-123 --storefront-url https://store.brand.com --rollback-target main@abcdef1 --output docs/releases/v0.1.0.md
```

The review command scans the same safe archive roots, recomputes the report
summary from the stored checks, and highlights R2 / CDN, Admin static app, and
publish-flow traceability before showing failed check details and suggested
fixes. The release-check command exits non-zero unless the archived report
has a valid chronological start/finish timeline and proves the required
production gates, including R2 upload, Admin static app, publish/rollback, SEO,
and ISR revalidation. Production release evidence must also include
`config.source.commitSha`, `config.source.repository`, `config.source.runId`,
and `config.source.workflowRunUrl` so the smoke report can be traced back to a
specific GitHub Actions run.

`project:status` is an informational wrapper around the same release gate. It
prints the MVP phase, locally completed milestones, release readiness, and the
configured local verification commands, and the next concrete actions without
changing the pass/fail criteria.

After the Page Builder visual manifest has accepted real design evidence,
`release:check` verifies both evidence streams together: production smoke must
be release-ready and Page Builder visual acceptance must be fully accepted. Use
`--checklist` to print the remaining Production Smoke, visual acceptance, and
release notes tasks. Use `--json` for machine-readable stdout or `--output` to
write the combined `release-evidence-check.v1` artifact under a safe archive
path; new artifacts also include a structured `readinessChecklist` with the
same release tasks plus `smoke.source` metadata for CI artifacts and release
records.
When the release uses a downloaded Page Builder Visual artifact, add
`--visual-artifact-dir reports/visual/page-builder-fixture`; the combined gate
then verifies the artifact-local manifest, capture report, acceptance report,
and all 12 PNG screenshots, and writes the result under
`visual.artifactCheck`.
After that artifact is ready, `release:notes` writes the final Markdown release
record, including the readiness checklist and any recorded
`visual.artifactCheck` summary plus the production smoke source run, and refuses
blocked evidence unless `--allow-blocked` is used for a failure review draft.
When the artifact records `smoke.source.workflowRunUrl`, the CLI
`--workflow-run-url` must match it so release records cannot point at a
different GitHub Actions run. When it records `smoke.source.runNumber`,
`--smoke-artifact` must match `production-smoke-report-<runNumber>` for the
same reason.

The `Production Smoke` GitHub Actions workflow runs the same command set against
the protected `production` environment. It sets
`SMOKE_REPORT_PATH=artifacts/production-smoke/smoke-report.json`, requires R2
upload, Admin static hosting, and ISR revalidation by default, writes the review
and release-check commands to the job summary, records the source commit and
workflow run URL in both the smoke config and summary, and uploads the report as
`production-smoke-report-<run_number>`. It also runs the combined
`release:check -- --checklist` gate, prints the release readiness checklist, and
uploads `release-evidence-check-<run_number>` with the
`release-evidence-check.v1` JSON artifact. If `visual_artifact_name` and
`visual_artifact_run_id` are provided, it downloads that Page Builder Visual
artifact, including the artifact-local visual manifest and
`visual-capture-report.json`, to `reports/visual/page-builder-fixture` before
running `pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture`
and the combined gate with
`--visual-artifact-dir reports/visual/page-builder-fixture`. The workflow runs
`pnpm release:preflight` before smoke requests so a
partial visual artifact pair or partial release notes input set fails early.
When `release_tag`,
`rollback_target`, and `visual_artifact_name` are provided, it runs
`release:notes` and uploads `release-notes-<run_number>`. Keep
`allow_blocked_release_notes` disabled for a formal release; enable it only to
pass `--allow-blocked` and generate a failure review draft from blocked
evidence. Use
[`release-checklist.md`](./release-checklist.md) to attach the workflow run,
artifact, report review, and rollback target to release notes.

The script logs in with `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` (falling
back to the seeded admin), verifies the MVP disabled feature flags
(`COMMERCE_ENABLED=false` and `MULTI_LOCALE_ENABLED=false`), checks the default
Market / Locale / Translation read placeholders, Products / Orders / Payments
empty placeholders, Product Variant / Price / Inventory subresource
placeholders with disabled Commerce metadata, Admin Product / Order / Payment
detail 404 placeholders with reserved details, the public product detail 404
placeholder, Commerce write, cart, checkout, and Webhook disabled details, and
the Stripe Webhook placeholder, saves a draft, creates a
Preview Token, checks the public preview API and Web `/preview` route,
publishes a unique page through the Admin API, publishes a rollback candidate,
rolls back to the first published version, verifies
`preview_token.created`, `page.published`, and `page.rolled_back` audit logs
with redacted and bounded audit error identifiers, checks
`GET /api/v1/public/pages/:slug`, the seeded Home, Privacy Policy, Terms of
Service, and 404 public page records, then checks the media upload target,
media confirmation, media list filters, seeded Home / Privacy Policy / Terms of
Service storefront HTML, canonical metadata, `robots.txt` host/sitemap
directives, `sitemap.xml`, and 404/noindex behavior. Set
`SMOKE_REQUIRE_R2_UPLOAD=true` in production if the deployment
must fail unless the upload target is a Cloudflare R2 presigned URL, the test
object can be uploaded with PUT, and `MEDIA_CDN_BASE_URL` produces an HTTPS CDN
URL on a non-local host without query strings or embedded credentials.
The production seed refuses the documented local admin defaults, so set
non-default `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running
`pnpm --filter @app-starter/api prisma:seed` against production. The seed admin
email must be valid, and the password must be 8 to 128 characters without
control characters. The seed also ensures the published MVP starter pages exist.
Production
smoke also rejects the documented local admin email or password, even when they
come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; set non-default
`SMOKE_ADMIN_EMAIL` and `SMOKE_ADMIN_PASSWORD` for production runs. Smoke login
configuration is validated before any request is sent: the email must be valid,
the password must be 8 to 128 characters without control characters, and
`SMOKE_TENANT_SLUG` must be a lowercase DNS-safe label without leading or
trailing hyphens. The smoke admin account must include `audit:read`; rerun the
seed after pulling role changes if the audit log check returns 403.
Set `SMOKE_REPORT_PATH=tmp/smoke-report.json` to write a machine-readable report
with the checked slug, page ID, storefront request URL, public storefront URL,
analytics diagnostics, feature flag diagnostics, database and Prisma migration
diagnostics, identity diagnostics, media environment
diagnostics, revalidation environment diagnostics, and passed/failed check list. If the smoke
run fails, the report records the failed check name, error message, and
structured failure details in `summary.failedCheckDetails` so production R2 /
CDN, ISR, and SEO failures can be triaged from the JSON artifact. Media check
details include the presigned URL host, CDN host, upload URL/R2 key match
status, CDN/R2 key match status, upload target metadata, and whether a real
object upload was required, but never include the signed upload URL itself.
Media environment diagnostics record R2 missing-variable names, non-secret
invalid-variable issue codes, and whether the CDN URL is HTTPS,
production-ready, and free of query strings or embedded credentials, but never
record R2 account IDs, access keys, secret keys, or bucket names. Publish and
rollback revalidation details include a `diagnosis` field for triggered,
missing secret, missing URL, HTTP request failure, and network or timeout-style
failures. Publish revalidation success logs print only a redacted, bounded path
summary. Analytics diagnostics
record whether the runtime gates are valid and whether an enabled analytics
setup has consent plus at least one valid provider. Feature flag diagnostics
record whether `COMMERCE_ENABLED` and `MULTI_LOCALE_ENABLED` are explicitly
configured and disabled. Stripe diagnostics treat `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` as optional while Commerce is disabled, but configured
values must use production-safe formats and must not be test keys, placeholder
values, whitespace-padded values, or control-character values; diagnostics
record only readiness metadata and issue codes, never secret values. Database
diagnostics record only non-secret
`DATABASE_URL` readiness metadata: whether it is configured, the database host,
URL safety, committed migration readiness, and whether it is production-ready.
Redis diagnostics record only non-secret `REDIS_URL` readiness metadata: whether it is configured, the Redis
host, TLS usage, URL safety, and whether it is production-ready. Identity
diagnostics record only whether JWT private and public keys are configured,
parse as PEM keys, and verify as a matching RS256 pair; key material is never
written to the report.
Revalidation environment diagnostics record only non-secret readiness metadata:
whether a secret is configured, the URL source, endpoint host/path, URL safety,
and whether the smoke run requires revalidation. Preview environment diagnostics
record only non-secret readiness metadata: whether `PREVIEW_TOKEN_SECRET` and a
rotation secret are configured, whether configured values are production-safe,
and any safety issue code. Smoke report details and failure messages
redact preview token paths, sensitive query parameters, JSON credential fields,
R2 signed URL parameters, and Bearer tokens before they are written to the
report or printed by the CLI. Failed check names, failure messages, structured
failure details, and production readiness blocker/action strings are also
normalized and bounded in the written report artifact so malformed diagnostics
cannot inflate CI artifacts with multi-line or oversized values. The CLI summary
and `pnpm smoke:report` archive review also normalize dynamic failure labels and
messages before printing them. API
HTTP, network, and upload failure messages are normalized and bounded before
they enter smoke failures. Revalidation diagnostics keep total `pathCount` and
`tagCount` values while bounding path/tag list fields to safe samples. Rollback
report details also bound version and title fields before they enter the smoke
report.

By default the script requires `meta.revalidation.triggered=true`, so keep
`STOREFRONT_REVALIDATE_SECRET` configured in both API and Web. To test only the
publish and storefront read path while wiring revalidation, run:

```bash
SMOKE_REQUIRE_REVALIDATION=false pnpm smoke:publish
```
