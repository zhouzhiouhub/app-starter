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
  normalizeStorefrontHost,
  normalizeWebOrigin,
} from "./publish-smoke-config-normalizers.mjs";
import { normalizeSmokeReportPath } from "./smoke-report-path-config.mjs";

const smokeAdminEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const smokeAdminPasswordMinLength = 8;
const smokeAdminPasswordMaxLength = 128;
const smokeTenantSlugPattern = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

export * from "./publish-smoke-config-normalizers.mjs";
export { printHelp } from "./publish-smoke-help.mjs";
export { normalizeSmokeReportPath } from "./smoke-report-path-config.mjs";

export function readConfig() {
  const requireAdminApp = readBooleanEnv("SMOKE_REQUIRE_ADMIN_APP", false);
  const email = readEnv(
    "SMOKE_ADMIN_EMAIL",
    readEnv("SEED_ADMIN_EMAIL", defaultEmail),
  );
  const password = readEnv(
    "SMOKE_ADMIN_PASSWORD",
    readEnv("SEED_ADMIN_PASSWORD", defaultPassword),
  );
  const tenantSlug = readEnv("SMOKE_TENANT_SLUG", defaultTenantSlug);

  assertSmokeLoginConfig({ email, password, tenantSlug });
  assertProductionSmokeCredentials({ email, password });

  return {
    adminUrl: readAdminUrlConfig(requireAdminApp),
    apiBaseUrl: normalizeApiBaseUrl(readEnv("API_URL", defaultApiUrl)),
    email,
    expectedMediaCdnHost: readOptionalUrlHostEnv("MEDIA_CDN_BASE_URL"),
    expectedMediaCdnPathPrefix: readOptionalUrlPathPrefixEnv(
      "MEDIA_CDN_BASE_URL",
    ),
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
    storefrontHost: readOptionalStorefrontHostEnv("SMOKE_STOREFRONT_HOST"),
    tenantSlug,
    webUrl: normalizeWebOrigin(readEnv("WEB_URL", defaultWebUrl)),
  };
}

export function isProductionSmokeEnvironment(env = process.env) {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}

function assertSmokeLoginConfig({ email, password, tenantSlug }) {
  if (
    email.length > 254 ||
    !smokeAdminEmailPattern.test(email) ||
    hasControlCharacter(email)
  ) {
    throw new Error("SMOKE_ADMIN_EMAIL must be a valid email address.");
  }

  if (
    password.length < smokeAdminPasswordMinLength ||
    password.length > smokeAdminPasswordMaxLength ||
    hasControlCharacter(password)
  ) {
    throw new Error(
      "SMOKE_ADMIN_PASSWORD must be 8 to 128 characters and cannot contain control characters.",
    );
  }

  if (!smokeTenantSlugPattern.test(tenantSlug)) {
    throw new Error(
      "SMOKE_TENANT_SLUG must be 1 to 100 lowercase letters, numbers, or hyphens, and cannot start or end with a hyphen.",
    );
  }
}

function assertProductionSmokeCredentials({ email, password }) {
  if (!isProductionSmokeEnvironment()) {
    return;
  }

  if (email.trim().toLowerCase() === defaultEmail) {
    throw new Error(
      "SMOKE_ADMIN_EMAIL must not use the documented local default in production smoke.",
    );
  }

  if (password === defaultPassword) {
    throw new Error(
      "SMOKE_ADMIN_PASSWORD must not use the documented local default in production smoke.",
    );
  }
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);

    return codePoint <= 0x1f || codePoint === 0x7f;
  });
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

function readOptionalStorefrontHostEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    return null;
  }

  return normalizeStorefrontHost(value);
}

function readOptionalUrlHostEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname || null;
  } catch {
    return null;
  }
}

function readOptionalUrlPathPrefixEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    return null;
  }

  try {
    return normalizeUrlPathPrefix(new URL(value).pathname);
  } catch {
    return null;
  }
}

function normalizeUrlPathPrefix(pathname) {
  return pathname.replace(/\/+$/, "");
}
