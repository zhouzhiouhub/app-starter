import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";
import {
  createReadyConfig,
  createReadyEnvironment,
} from "./smoke-readiness-test-fixtures.mjs";

test("smoke readiness requires a production preview token secret", () => {
  const environment = createReadyEnvironment();
  environment.preview.secretConfigured = false;
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "preview.secret",
      issue: "missing-secret",
      message: "Configure PREVIEW_TOKEN_SECRET before production smoke.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set PREVIEW_TOKEN_SECRET in the API runtime before production smoke.",
      area: "preview.secret",
    },
  ]);
});

test("smoke readiness requires MVP feature flags explicitly disabled", () => {
  const environment = createReadyEnvironment();
  environment.featureFlags = {
    flags: {
      COMMERCE_ENABLED: {
        issue: "enabled",
        productionReady: false,
      },
      MULTI_LOCALE_ENABLED: {
        issue: "missing-env",
        productionReady: false,
      },
    },
    productionReady: false,
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(
    readiness.blockers.map((blocker) => [
      blocker.area,
      blocker.issue,
      blocker.variable,
    ]),
    [
      ["feature-flags.commerce", "enabled", "COMMERCE_ENABLED"],
      [
        "feature-flags.multi-locale",
        "missing-env",
        "MULTI_LOCALE_ENABLED",
      ],
    ],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set COMMERCE_ENABLED=false in the API runtime before production smoke.",
      area: "feature-flags.commerce",
    },
    {
      action:
        "Set MULTI_LOCALE_ENABLED=false in the API runtime before production smoke.",
      area: "feature-flags.multi-locale",
    },
  ]);
});

test("smoke readiness requires coherent analytics config when enabled", () => {
  const environment = createReadyEnvironment();
  environment.analytics = {
    consent: {
      issue: null,
      value: false,
    },
    enabled: {
      issue: null,
      value: true,
    },
    invalidProviders: ["GTM_CONTAINER_ID"],
    productionReady: false,
    providerConfigured: false,
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(
    readiness.blockers.map((blocker) => [
      blocker.area,
      blocker.issue,
      blocker.variable ?? null,
    ]),
    [
      ["analytics.consent", "missing-consent", "ANALYTICS_CONSENT_GRANTED"],
      ["analytics.provider", "missing-provider", null],
      ["analytics.provider", "invalid-provider", "GTM_CONTAINER_ID"],
    ],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Keep ANALYTICS_CONSENT_GRANTED=false until a consent mechanism or CMP grants analytics consent.",
      area: "analytics.consent",
    },
    {
      action:
        "Set a valid GTM_CONTAINER_ID, GA4_MEASUREMENT_ID, or CLARITY_PROJECT_ID, or set ANALYTICS_ENABLED=false.",
      area: "analytics.provider",
    },
  ]);
});

test("smoke readiness requires a production database URL", () => {
  const environment = createReadyEnvironment();
  environment.database = {
    host: "localhost",
    productionReady: false,
    urlIssue: "local-host",
    variable: "DATABASE_URL",
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "database.url",
      host: "localhost",
      issue: "local-host",
      message: "DATABASE_URL must be a production PostgreSQL connection URL.",
      variable: "DATABASE_URL",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set DATABASE_URL to a production PostgreSQL connection URL outside local or placeholder hosts.",
      area: "database.url",
    },
  ]);
});

test("smoke readiness requires a production Redis URL", () => {
  const environment = createReadyEnvironment();
  environment.redis = {
    host: "localhost",
    productionReady: false,
    urlIssue: "local-host",
    variable: "REDIS_URL",
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "cache.redis",
      host: "localhost",
      issue: "local-host",
      message: "REDIS_URL must point to a production TLS Redis endpoint.",
      variable: "REDIS_URL",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set REDIS_URL to a production rediss:// Redis endpoint outside local or placeholder hosts.",
      area: "cache.redis",
    },
  ]);
});

test("smoke readiness requires production JWT keys", () => {
  const environment = createReadyEnvironment();
  environment.identity = {
    jwt: {
      privateKey: {
        issue: "invalid-pem",
        valid: false,
      },
      productionReady: false,
      publicKey: {
        valid: false,
      },
    },
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(
    readiness.blockers.map((blocker) => [
      blocker.area,
      blocker.issue,
      blocker.variable,
    ]),
    [
      ["identity.jwt.private", "invalid-pem", "JWT_PRIVATE_KEY"],
      ["identity.jwt.public", "missing-key", "JWT_PUBLIC_KEY"],
    ],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set JWT_PRIVATE_KEY to a production PEM key in the API runtime.",
      area: "identity.jwt.private",
    },
    {
      action:
        "Set JWT_PUBLIC_KEY to a production PEM key in the API runtime.",
      area: "identity.jwt.public",
    },
  ]);
});
