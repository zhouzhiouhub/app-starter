import {
  defaultAdminUrl,
  defaultApiUrl,
  defaultEmail,
  defaultLocale,
  defaultMarket,
  defaultPassword,
  defaultTenantSlug,
  defaultWebUrl,
} from "./publish-smoke-config-defaults.mjs";

export function printHelp() {
  console.log(`Usage: pnpm smoke:publish

Publishes a unique smoke-test page through the Admin API, then verifies the
page editor draft save, Preview Token, public preview API, Web preview page,
publish API, rollback API, audit logs, public page API, media upload target,
media list filters, storefront HTML, robots.txt, sitemap.xml, 404 behavior, and MVP disabled feature flags.

Environment:
  ADMIN_URL                       Admin app origin. Default: ${defaultAdminUrl}
  API_URL                         API origin or /api/v1 base. Default: ${defaultApiUrl}
  WEB_URL                         Storefront origin. Default: ${defaultWebUrl}
  SMOKE_ADMIN_EMAIL               Admin email. Default: SEED_ADMIN_EMAIL or ${defaultEmail}
  SMOKE_ADMIN_PASSWORD            Admin password. Default: SEED_ADMIN_PASSWORD or ${defaultPassword}
  SMOKE_TENANT_SLUG               Tenant slug. Default: ${defaultTenantSlug}
  SMOKE_PAGE_SLUG                 Optional fixed lowercase page slug.
  SMOKE_LOCALE                    Locale code. Default: ${defaultLocale}
  SMOKE_MARKET                    Market code. Default: ${defaultMarket}
  SMOKE_REQUIRE_ADMIN_APP         Require Admin static app HTML at ADMIN_URL. true/false. Default: false
  SMOKE_REQUIRE_R2_UPLOAD         Require R2 presigned URL, actual PUT upload, and production CDN URL. true/false. Default: false
  SMOKE_REQUIRE_REVALIDATION      Require meta.revalidation.triggered. true/false. Default: true
  SMOKE_RETRY_ATTEMPTS            Storefront fetch attempts. 1-60. Default: 8
  SMOKE_RETRY_DELAY_MS            Delay between attempts in ms. 1-60000. Default: 1000
  SMOKE_REPORT_PATH               Optional for local runs; required for production readiness. Relative JSON path under tmp/, reports/, artifacts/, or .tmp/.
`);
}
