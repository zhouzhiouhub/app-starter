const isolatedSmokeEnvKeys = [
  "ADMIN_URL",
  "API_URL",
  "APP_ENV",
  "NODE_ENV",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
  "SMOKE_ADMIN_EMAIL",
  "SMOKE_ADMIN_PASSWORD",
  "SMOKE_LOCALE",
  "SMOKE_MARKET",
  "SMOKE_PAGE_SLUG",
  "SMOKE_REPORT_PATH",
  "SMOKE_REQUIRE_ADMIN_APP",
  "SMOKE_REQUIRE_R2_UPLOAD",
  "SMOKE_REQUIRE_REVALIDATION",
  "SMOKE_RETRY_ATTEMPTS",
  "SMOKE_RETRY_DELAY_MS",
  "SMOKE_STOREFRONT_HOST",
  "SMOKE_TENANT_SLUG",
  "VERCEL_ENV",
  "WEB_URL",
];

export async function withEnv(values, fn) {
  const keys = new Set([...isolatedSmokeEnvKeys, ...Object.keys(values)]);
  const previous = Object.fromEntries(
    [...keys].map((key) => [key, process.env[key]]),
  );

  for (const key of keys) {
    if (
      Object.hasOwn(values, key) &&
      values[key] !== null &&
      values[key] !== undefined
    ) {
      process.env[key] = values[key];
    } else {
      delete process.env[key];
    }
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
