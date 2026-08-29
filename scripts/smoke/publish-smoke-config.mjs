import {
  defaultAdminUrl,
  defaultApiUrl,
  defaultLocale,
  defaultMarket,
  defaultWebUrl,
  retryAttemptsRange,
  retryDelayMsRange,
} from "./publish-smoke-config-defaults.mjs";
import { readCdnDiagnostics } from "./environment-diagnostics-media-cdn.mjs";
import { readSmokeLoginConfig } from "./publish-smoke-login-config.mjs";
import { readSmokeSourceMetadata } from "./smoke-source-metadata.mjs";
import {
  normalizeAdminOrigin,
  normalizeApiBaseUrl,
  normalizeSmokeBoolean,
  normalizeSmokeLocale,
  normalizeSmokeMarket,
  normalizeSmokePositiveInt,
  normalizeSmokeSlug,
  normalizeStorefrontHost,
  normalizeWebOrigin,
} from "./publish-smoke-config-normalizers.mjs";
import { normalizeSmokeReportPath } from "./smoke-report-path-config.mjs";

export * from "./publish-smoke-config-normalizers.mjs";
export { isProductionSmokeEnvironment } from "./publish-smoke-login-config.mjs";
export { printHelp } from "./publish-smoke-help.mjs";
export { normalizeSmokeReportPath } from "./smoke-report-path-config.mjs";

export function readConfig() {
  const requireAdminApp = readBooleanEnv("SMOKE_REQUIRE_ADMIN_APP", false);
  const { email, password, tenantSlug } = readSmokeLoginConfig(process.env);

  const expectedMediaCdn = readOptionalExpectedMediaCdnBaseUrl(
    "MEDIA_CDN_BASE_URL",
  );

  return {
    adminUrl: readAdminUrlConfig(requireAdminApp),
    apiBaseUrl: normalizeApiBaseUrl(readUrlEnv("API_URL", defaultApiUrl)),
    email,
    expectedMediaCdnHost: expectedMediaCdn?.hostname ?? null,
    expectedMediaCdnPathPrefix: expectedMediaCdn
      ? normalizeUrlPathPrefix(expectedMediaCdn.pathname)
      : null,
    fallbackLocale: defaultLocale,
    fallbackMarket: defaultMarket,
    locale: normalizeSmokeLocale(readEnv("SMOKE_LOCALE", defaultLocale)),
    market: normalizeSmokeMarket(readEnv("SMOKE_MARKET", defaultMarket)),
    password,
    requireAdminApp,
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
    source: readSmokeSourceMetadata(process.env),
    storefrontHost: readOptionalStorefrontHostEnv("SMOKE_STOREFRONT_HOST"),
    tenantSlug,
    webUrl: normalizeWebOrigin(readUrlEnv("WEB_URL", defaultWebUrl)),
  };
}

function createSmokeSlug() {
  return `smoke-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function readAdminUrlConfig(requireAdminApp) {
  const value = readUrlEnv("ADMIN_URL", defaultAdminUrl);

  if (requireAdminApp) {
    return normalizeAdminOrigin(value);
  }

  try {
    return normalizeAdminOrigin(value);
  } catch {
    return null;
  }
}

function readEnv(name, fallback) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function readUrlEnv(name, fallback) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value : fallback;
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

function readOptionalStorefrontHostEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    return null;
  }

  return normalizeStorefrontHost(value);
}

function readOptionalExpectedMediaCdnBaseUrl(name) {
  const value = readUrlEnv(name, null);

  if (!value) {
    return null;
  }

  if (!readCdnDiagnostics(value).safe) {
    return null;
  }

  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

function normalizeUrlPathPrefix(pathname) {
  return pathname.replace(/\/+$/, "");
}
