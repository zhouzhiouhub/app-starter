import { posix, win32 } from "node:path";

const defaultApiUrl = "http://localhost:4000";
const defaultWebUrl = "http://localhost:3000";
const defaultLocale = "en-US";
const defaultMarket = "us";
const defaultEmail = "admin@example.com";
const defaultPassword = "ChangeMe123!";
const defaultTenantSlug = "default";
const retryAttemptsRange = { max: 60, min: 1 };
const retryDelayMsRange = { max: 60000, min: 1 };
const localeCodePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const marketCodePattern = /^[a-z][a-z0-9-]{1,15}$/;
const pageSlugPattern = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;
const reportPathSegmentPattern = /^[A-Za-z0-9._-]+$/;
const reportPathRoots = new Set([".tmp", "artifacts", "reports", "tmp"]);

export function readConfig() {
  return {
    apiBaseUrl: normalizeApiBaseUrl(readEnv("API_URL", defaultApiUrl)),
    email: readEnv(
      "SMOKE_ADMIN_EMAIL",
      readEnv("SEED_ADMIN_EMAIL", defaultEmail),
    ),
    locale: normalizeSmokeLocale(readEnv("SMOKE_LOCALE", defaultLocale)),
    market: normalizeSmokeMarket(readEnv("SMOKE_MARKET", defaultMarket)),
    password: readEnv(
      "SMOKE_ADMIN_PASSWORD",
      readEnv("SEED_ADMIN_PASSWORD", defaultPassword),
    ),
    requireR2Upload: readBooleanEnv("SMOKE_REQUIRE_R2_UPLOAD", false),
    requireRevalidation: readBooleanEnv("SMOKE_REQUIRE_REVALIDATION", true),
    retryAttempts: readPositiveIntEnv(
      "SMOKE_RETRY_ATTEMPTS",
      8,
      retryAttemptsRange,
    ),
    retryDelayMs: readPositiveIntEnv(
      "SMOKE_RETRY_DELAY_MS",
      1000,
      retryDelayMsRange,
    ),
    reportPath: readSmokeReportPathEnv("SMOKE_REPORT_PATH"),
    slug: normalizeSmokeSlug(readEnv("SMOKE_PAGE_SLUG", createSmokeSlug())),
    tenantSlug: readEnv("SMOKE_TENANT_SLUG", defaultTenantSlug),
    webUrl: normalizeWebOrigin(readEnv("WEB_URL", defaultWebUrl)),
  };
}

export function normalizeApiBaseUrl(value) {
  const url = readSmokeUrl(value, "API_URL");
  const pathname = trimTrailingSlashes(url.pathname);

  if (pathname && pathname !== "/api/v1") {
    throw new Error("API_URL must be an origin URL or an /api/v1 base URL.");
  }

  return `${url.origin}/api/v1`;
}

export function normalizeWebOrigin(value) {
  const url = readSmokeUrl(value, "WEB_URL");
  const pathname = trimTrailingSlashes(url.pathname);

  if (pathname) {
    throw new Error("WEB_URL must be a storefront origin without a path.");
  }

  return url.origin;
}

export function normalizeSmokeLocale(value) {
  const locale = value.trim();

  if (!localeCodePattern.test(locale)) {
    throw new Error("SMOKE_LOCALE must look like en-US.");
  }

  return locale;
}

export function normalizeSmokeMarket(value) {
  const market = value.trim();

  if (!marketCodePattern.test(market)) {
    throw new Error("SMOKE_MARKET must be a lowercase market code.");
  }

  return market;
}

export function normalizeSmokeSlug(value) {
  const slug = value.trim();

  if (slug.length > 255 || !pageSlugPattern.test(slug)) {
    throw new Error(
      "SMOKE_PAGE_SLUG must use lowercase letters, numbers, hyphens, or slashes.",
    );
  }

  return slug;
}

export function normalizeSmokeBoolean(value, name) {
  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

export function normalizeSmokePositiveInt(value, name, range) {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${name} must be a positive integer.`);
  }

  const number = Number(normalized);

  if (
    !Number.isSafeInteger(number) ||
    number < range.min ||
    number > range.max
  ) {
    throw new Error(`${name} must be between ${range.min} and ${range.max}.`);
  }

  return number;
}

export function normalizeSmokeReportPath(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("SMOKE_REPORT_PATH must not be empty.");
  }

  if (
    trimmed.includes("\0") ||
    posix.isAbsolute(trimmed) ||
    win32.isAbsolute(trimmed)
  ) {
    throw new Error("SMOKE_REPORT_PATH must be a relative JSON report path.");
  }

  const normalized = trimmed.replace(/\\/g, "/");
  const segments = normalized.split("/");

  if (segments.length < 2 || !reportPathRoots.has(segments[0])) {
    throw new Error(
      "SMOKE_REPORT_PATH must be under tmp/, reports/, artifacts/, or .tmp/.",
    );
  }

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        !reportPathSegmentPattern.test(segment),
    )
  ) {
    throw new Error(
      "SMOKE_REPORT_PATH must use safe path segments without traversal.",
    );
  }

  if (!segments.at(-1).toLowerCase().endsWith(".json")) {
    throw new Error("SMOKE_REPORT_PATH must end with .json.");
  }

  return normalized;
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
  SMOKE_PAGE_SLUG                 Optional fixed lowercase page slug.
  SMOKE_LOCALE                    Locale code. Default: ${defaultLocale}
  SMOKE_MARKET                    Market code. Default: ${defaultMarket}
  SMOKE_REQUIRE_R2_UPLOAD         Require R2 presigned URL, actual PUT upload, and production CDN URL. true/false. Default: false
  SMOKE_REQUIRE_REVALIDATION      Require meta.revalidation.triggered. true/false. Default: true
  SMOKE_RETRY_ATTEMPTS            Storefront fetch attempts. 1-60. Default: 8
  SMOKE_RETRY_DELAY_MS            Delay between attempts in ms. 1-60000. Default: 1000
  SMOKE_REPORT_PATH               Optional relative JSON report path under tmp/, reports/, artifacts/, or .tmp/.
`);
}

function readSmokeUrl(value, name) {
  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${name} must be an absolute http(s) URL.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use http or https.`);
  }

  if (url.username || url.password) {
    throw new Error(`${name} must not include embedded credentials.`);
  }

  if (url.search || url.hash) {
    throw new Error(`${name} must not include query strings or fragments.`);
  }

  return url;
}

function trimTrailingSlashes(pathname) {
  return pathname.replace(/\/+$/, "");
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

function readBooleanEnv(name, fallback) {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  return normalizeSmokeBoolean(value, name);
}

function readPositiveIntEnv(name, fallback, range) {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  return normalizeSmokePositiveInt(value, name, range);
}

function readSmokeReportPathEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    return null;
  }

  return normalizeSmokeReportPath(value);
}
