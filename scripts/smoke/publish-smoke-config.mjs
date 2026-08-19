const defaultApiUrl = "http://localhost:4000";
const defaultWebUrl = "http://localhost:3000";
const defaultLocale = "en-US";
const defaultMarket = "us";
const defaultEmail = "admin@example.com";
const defaultPassword = "ChangeMe123!";
const defaultTenantSlug = "default";

export function readConfig() {
  return {
    apiBaseUrl: normalizeApiBaseUrl(readEnv("API_URL", defaultApiUrl)),
    email: readEnv(
      "SMOKE_ADMIN_EMAIL",
      readEnv("SEED_ADMIN_EMAIL", defaultEmail),
    ),
    locale: readEnv("SMOKE_LOCALE", defaultLocale),
    market: readEnv("SMOKE_MARKET", defaultMarket),
    password: readEnv(
      "SMOKE_ADMIN_PASSWORD",
      readEnv("SEED_ADMIN_PASSWORD", defaultPassword),
    ),
    requireR2Upload: readBooleanEnv("SMOKE_REQUIRE_R2_UPLOAD", false),
    requireRevalidation: readBooleanEnv("SMOKE_REQUIRE_REVALIDATION", true),
    retryAttempts: readPositiveIntEnv("SMOKE_RETRY_ATTEMPTS", 8),
    retryDelayMs: readPositiveIntEnv("SMOKE_RETRY_DELAY_MS", 1000),
    reportPath: readOptionalEnv("SMOKE_REPORT_PATH"),
    slug: readEnv("SMOKE_PAGE_SLUG", createSmokeSlug()),
    tenantSlug: readEnv("SMOKE_TENANT_SLUG", defaultTenantSlug),
    webUrl: normalizeOrigin(readEnv("WEB_URL", defaultWebUrl)),
  };
}

export function normalizeApiBaseUrl(value) {
  const origin = normalizeOrigin(value);

  if (origin.endsWith("/api/v1")) {
    return origin;
  }

  return `${origin}/api/v1`;
}

export function printHelp() {
  console.log(`Usage: pnpm smoke:publish

Publishes a unique smoke-test page through the Admin API, then verifies the
page editor draft save, Preview Token, public preview API, Web preview page,
publish API, rollback API, audit logs, public page API, media upload target,
media list filters, storefront HTML, robots.txt, sitemap.xml, 404 behavior, and MVP disabled feature flags.

Environment:
  API_URL                         API origin or /api/v1 base. Default: ${defaultApiUrl}
  WEB_URL                         Storefront origin. Default: ${defaultWebUrl}
  SMOKE_ADMIN_EMAIL               Admin email. Default: SEED_ADMIN_EMAIL or ${defaultEmail}
  SMOKE_ADMIN_PASSWORD            Admin password. Default: SEED_ADMIN_PASSWORD or ${defaultPassword}
  SMOKE_TENANT_SLUG               Tenant slug. Default: ${defaultTenantSlug}
  SMOKE_PAGE_SLUG                 Optional fixed page slug.
  SMOKE_REQUIRE_R2_UPLOAD         Require R2 presigned URL, actual PUT upload, and production CDN URL. Default: false
  SMOKE_REQUIRE_REVALIDATION      Require meta.revalidation.triggered. Default: true
  SMOKE_RETRY_ATTEMPTS            Storefront fetch attempts. Default: 8
  SMOKE_RETRY_DELAY_MS            Delay between attempts. Default: 1000
  SMOKE_REPORT_PATH               Optional JSON report output path.
`);
}

function normalizeOrigin(value) {
  return value.trim().replace(/\/+$/, "");
}

function createSmokeSlug() {
  return `smoke-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function readEnv(name, fallback) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function readOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readBooleanEnv(name, fallback) {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value);
}

function readPositiveIntEnv(name, fallback) {
  const value = Number(process.env[name]);

  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  return fallback;
}
