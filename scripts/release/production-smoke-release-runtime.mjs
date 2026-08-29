import {
  retryAttemptsRange,
  retryDelayMsRange,
} from "../smoke/publish-smoke-config-defaults.mjs";
import {
  normalizeSmokeBoolean,
  normalizeSmokeLocale,
  normalizeSmokeMarket,
  normalizeSmokePositiveInt,
  normalizeSmokeSlug,
} from "../smoke/publish-smoke-config-normalizers.mjs";
import {
  normalizeSmokeAdminEmail,
  normalizeSmokeAdminPassword,
  normalizeSmokeTenantSlug,
} from "../smoke/publish-smoke-login-config.mjs";
import { normalizeSafeStorefrontHost } from "../smoke/storefront-host-validation.mjs";

const smokeBooleanInputNames = [
  "SMOKE_REQUIRE_ADMIN_APP",
  "SMOKE_REQUIRE_R2_UPLOAD",
  "SMOKE_REQUIRE_REVALIDATION",
];
const smokeTextInputNormalizers = [
  ["SMOKE_LOCALE", normalizeSmokeLocale],
  ["SMOKE_MARKET", normalizeSmokeMarket],
  ["SMOKE_PAGE_SLUG", normalizeSmokeSlug],
  ["SMOKE_TENANT_SLUG", normalizeSmokeTenantSlug],
  ["SMOKE_ADMIN_EMAIL", normalizeSmokeAdminEmail],
  ["SMOKE_ADMIN_PASSWORD", normalizeSmokeAdminPassword],
];
const smokePositiveIntInputNormalizers = [
  ["SMOKE_RETRY_ATTEMPTS", retryAttemptsRange],
  ["SMOKE_RETRY_DELAY_MS", retryDelayMsRange],
];

export function validateProductionSmokeRuntimeInputs(env) {
  validateOptionalStorefrontHost(env);
  validateSmokeBooleanInputs(env);
  validateSmokeTextInputs(env);
  validateSmokePositiveIntInputs(env);
}

function validateOptionalStorefrontHost(env) {
  const value = readOptionalSmokeInput(env, "SMOKE_STOREFRONT_HOST");

  if (!value) {
    return;
  }

  normalizeSafeStorefrontHost(value);
}

function validateSmokeBooleanInputs(env) {
  for (const name of smokeBooleanInputNames) {
    const value = readOptionalSmokeInput(env, name);

    if (value) {
      normalizeSmokeBoolean(value, name);
    }
  }
}

function validateSmokeTextInputs(env) {
  for (const [name, normalize] of smokeTextInputNormalizers) {
    const value = readOptionalSmokeInput(env, name);

    if (value) {
      normalize(value);
    }
  }
}

function validateSmokePositiveIntInputs(env) {
  for (const [name, range] of smokePositiveIntInputNormalizers) {
    const value = readOptionalSmokeInput(env, name);

    if (value) {
      normalizeSmokePositiveInt(value, name, range);
    }
  }
}

function readOptionalSmokeInput(env, name) {
  if (!Object.hasOwn(env, name) || typeof env[name] !== "string") {
    return null;
  }

  const trimmed = env[name].trim();
  return trimmed ? trimmed : null;
}
