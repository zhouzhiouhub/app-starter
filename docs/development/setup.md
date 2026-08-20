# Development Setup

## Requirements

- Node.js 20.18+
- pnpm 9+
- Docker for local PostgreSQL and Redis

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

For storefront ISR, set the same secret in the API and Web runtimes. The API
uses `STOREFRONT_REVALIDATE_URL` to call the Web app after publish or rollback:

```bash
STOREFRONT_REVALIDATE_SECRET=local-revalidate-secret
STOREFRONT_REVALIDATE_URL=http://localhost:3000/api/revalidate
STOREFRONT_REVALIDATE_TIMEOUT_MS=5000
```

`STOREFRONT_REVALIDATE_URL` can be the full Web revalidation route. If it is
set to the Web origin only, the API normalizes it to `/api/revalidate`.

Preview links use a short-lived token. Local development can leave
`PREVIEW_TOKEN_SECRET` empty, which uses a non-production fallback. Production
must set an explicit secret:

```bash
PREVIEW_TOKEN_SECRET=
PREVIEW_TOKEN_PREVIOUS_SECRET=
PREVIEW_TOKEN_TTL_SECONDS=3600
```

To rotate the Preview Token secret, deploy the new value in
`PREVIEW_TOKEN_SECRET` and keep the old value in
`PREVIEW_TOKEN_PREVIOUS_SECRET` for longer than `PREVIEW_TOKEN_TTL_SECONDS`.
New preview links are signed with the current secret; existing unexpired links
can still be verified with the previous secret during the rotation window.

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
environment variables.

After sign-in, open `http://localhost:5173/pages` to list and create pages.
The editor at `/pages/:id` loads the draft schema, can save a draft, and can
publish to the storefront. The Preview action saves the draft, creates a
short-lived token, and opens the Web app at `/preview?token=...`.
Open `http://localhost:5173/settings` to manage the default site name and
domain, and to inspect the MVP default market, locale, currency, and feature
flags.
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
Boolean smoke flags accept only `true`/`false`, `1`/`0`, `yes`/`no`, or
`on`/`off`; misspelled values fail instead of silently disabling a check.

The script logs in with `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` (falling
back to the seeded admin), verifies the MVP disabled feature flags
(`COMMERCE_ENABLED=false` and `MULTI_LOCALE_ENABLED=false`), saves a draft,
creates a Preview Token, checks the public preview API and Web `/preview`
route, publishes a unique page through the Admin API, publishes a rollback
candidate, rolls back to the first published version, verifies
`preview_token.created`, `page.published`, and `page.rolled_back` audit logs,
checks `GET /api/v1/public/pages/:slug`, then checks the media upload target,
media confirmation, media list filters, storefront HTML, `robots.txt`,
`sitemap.xml`, and 404/noindex
behavior. Set `SMOKE_REQUIRE_R2_UPLOAD=true` in production if the deployment
must fail unless the upload target is a Cloudflare R2 presigned URL, the test
object can be uploaded with PUT, and `MEDIA_CDN_BASE_URL` produces a non-local
CDN URL.
The smoke admin account must include `audit:read`; rerun the seed after pulling
role changes if the audit log check returns 403.
Set `SMOKE_REPORT_PATH=tmp/smoke-report.json` to write a machine-readable report
with the checked slug, page ID, storefront URL, media environment diagnostics,
revalidation environment diagnostics, and passed/failed check list. If the smoke
run fails, the report records the
failed check name and error message so production R2 / CDN, ISR, and SEO
failures can be triaged from the JSON artifact. Media check details include the
presigned URL host, CDN host, upload URL/R2 key match status, CDN/R2 key match
status, upload target metadata, and whether a real object upload was required,
but never include the signed upload URL itself. Publish revalidation details
include a `diagnosis` field for triggered, missing secret, missing URL, HTTP
request failure, and network or timeout-style failures. Revalidation environment
diagnostics record only non-secret readiness metadata: whether a secret is
configured, the URL source, endpoint host/path, URL safety, and whether the
smoke run requires revalidation. Preview smoke HTTP errors redact preview token
paths and sensitive query parameters before they are written to the report.

By default the script requires `meta.revalidation.triggered=true`, so keep
`STOREFRONT_REVALIDATE_SECRET` configured in both API and Web. To test only the
publish and storefront read path while wiring revalidation, run:

```bash
SMOKE_REQUIRE_REVALIDATION=false pnpm smoke:publish
```
