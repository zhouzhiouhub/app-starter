import {
  defaultAdminUrl,
  defaultApiUrl,
  defaultEmail,
  defaultLocale,
  defaultMarket,
  defaultPassword,
  defaultTenantSlug,
  defaultWebUrl,
  retryAttemptsRange,
  retryDelayMsRange,
} from "./publish-smoke-config-defaults.mjs";
import {
  normalizeAdminOrigin,
  normalizeApiBaseUrl,
  normalizeSmokeBoolean,
  normalizeSmokeLocale,
  normalizeSmokeMarket,
  normalizeSmokePositiveInt,
  normalizeSmokeSlug,
  normalizeWebOrigin,
} from "./publish-smoke-config-normalizers.mjs";
import { normalizeSmokeReportPath } from "./smoke-report-path-config.mjs";

export * from "./publish-smoke-config-normalizers.mjs";
export { printHelp } from "./publish-smoke-help.mjs";
export { normalizeSmokeReportPath } from "./smoke-report-path-config.mjs";

export function readConfig() {
  const requireAdminApp = readBooleanEnv("SMOKE_REQUIRE_ADMIN_APP", false);

  return {
    adminUrl: readAdminUrlConfig(requireAdminApp),
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
    tenantSlug: readEnv("SMOKE_TENANT_SLUG", defaultTenantSlug),
    webUrl: normalizeWebOrigin(readEnv("WEB_URL", defaultWebUrl)),
  };
}

function createSmokeSlug() {
  return `smoke-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function readAdminUrlConfig(requireAdminApp) {
  const value = readEnv("ADMIN_URL", defaultAdminUrl);

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
