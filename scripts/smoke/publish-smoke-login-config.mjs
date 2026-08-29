import {
  defaultEmail,
  defaultPassword,
  defaultTenantSlug,
} from "./publish-smoke-config-defaults.mjs";

const smokeAdminEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const smokeAdminPasswordMinLength = 8;
const smokeAdminPasswordMaxLength = 128;
const smokeTenantSlugPattern = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

export function readSmokeLoginConfig(env = process.env) {
  const email = readEnv(
    env,
    "SMOKE_ADMIN_EMAIL",
    readEnv(env, "SEED_ADMIN_EMAIL", defaultEmail),
  );
  const password = readEnv(
    env,
    "SMOKE_ADMIN_PASSWORD",
    readEnv(env, "SEED_ADMIN_PASSWORD", defaultPassword),
  );
  const tenantSlug = readEnv(env, "SMOKE_TENANT_SLUG", defaultTenantSlug);

  assertSmokeLoginConfig({ email, password, tenantSlug });
  assertProductionSmokeCredentials({ email, password }, env);

  return { email, password, tenantSlug };
}

export function assertSmokeLoginConfig({ email, password, tenantSlug }) {
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

export function assertProductionSmokeCredentials(
  { email, password },
  env = process.env,
) {
  if (!isProductionSmokeEnvironment(env)) {
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

export function isProductionSmokeEnvironment(env = process.env) {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}

function readEnv(env, name, fallback) {
  const value = env[name]?.trim();
  return value ? value : fallback;
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);

    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
