import { normalizeSmokeBoolean } from "../smoke/publish-smoke-config-normalizers.mjs";
import { normalizeSafeStorefrontHost } from "../smoke/storefront-host-validation.mjs";

const smokeBooleanInputNames = [
  "SMOKE_REQUIRE_ADMIN_APP",
  "SMOKE_REQUIRE_R2_UPLOAD",
  "SMOKE_REQUIRE_REVALIDATION",
];

export function validateProductionSmokeRuntimeInputs(env) {
  validateOptionalStorefrontHost(env);
  validateSmokeBooleanInputs(env);
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

function readOptionalSmokeInput(env, name) {
  if (!Object.hasOwn(env, name) || typeof env[name] !== "string") {
    return null;
  }

  const trimmed = env[name].trim();
  return trimmed ? trimmed : null;
}
