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
        "Set PREVIEW_TOKEN_SECRET to a 32-1024 character production signing secret in the API runtime.",
      area: "preview.secret",
    },
  ]);
});

test("smoke readiness blocks unsafe preview token secrets", () => {
  const environment = createReadyEnvironment();
  environment.preview = {
    previousSecretConfigured: true,
    previousSecretIssue: "control-character",
    previousSecretSafe: false,
    secretConfigured: true,
    secretIssue: "short-secret",
    secretSafe: false,
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
      ["preview.secret", "short-secret", "PREVIEW_TOKEN_SECRET"],
      [
        "preview.previous-secret",
        "control-character",
        "PREVIEW_TOKEN_PREVIOUS_SECRET",
      ],
    ],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set PREVIEW_TOKEN_SECRET to a 32-1024 character production signing secret; current value is too short.",
      area: "preview.secret",
    },
    {
      action:
        "Remove PREVIEW_TOKEN_PREVIOUS_SECRET unless rotating preview secrets; if rotating, remove control characters and keep it 32-1024 characters.",
      area: "preview.previous-secret",
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
        "Set COMMERCE_ENABLED=false in the API runtime before production smoke; MVP must not enable checkout, payment, or order creation flows.",
      area: "feature-flags.commerce",
    },
    {
      action:
        "Set MULTI_LOCALE_ENABLED=false explicitly in the API runtime; production smoke blocks missing MVP feature flag values.",
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
        "Configure at least one analytics provider ID: GTM_CONTAINER_ID, GA4_MEASUREMENT_ID, or CLARITY_PROJECT_ID; otherwise set ANALYTICS_ENABLED=false.",
      area: "analytics.provider",
    },
    {
      action:
        "Fix GTM_CONTAINER_ID to match GTM container ID such as GTM-XXXXXXX, or remove it and disable analytics.",
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
        "Replace local or private DATABASE_URL hosts with a managed production PostgreSQL hostname.",
      area: "database.url",
    },
  ]);
});

test("smoke readiness requires committed Prisma migrations", () => {
  const environment = createReadyEnvironment();
  environment.database = {
    configured: true,
    host: "db.brand-platform.com",
    migrations: {
      directory: "services/api/prisma/migrations",
      hasMigrationLock: false,
      issue: "missing-directory",
      migrationCount: 0,
      productionReady: false,
    },
    productionReady: false,
    urlIssue: null,
    urlSafe: true,
    variable: "DATABASE_URL",
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "database.migrations",
      directory: "services/api/prisma/migrations",
      hasMigrationLock: false,
      issue: "missing-directory",
      message: "Prisma migrations must be committed before production smoke.",
      migrationCount: 0,
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Create services/api/prisma/migrations with committed Prisma migration folders, then run prisma migrate deploy in production.",
      area: "database.migrations",
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
        "Replace local or private REDIS_URL hosts with a managed production Redis hostname.",
      area: "cache.redis",
    },
  ]);
});

test("smoke readiness blocks unsafe external media host allowlists", () => {
  const environment = createReadyEnvironment();
  environment.media.externalUrlHostIssues = [
    {
      host: "localhost",
      issue: "local-host",
    },
    {
      host: "cdn.example.com",
      issue: "placeholder-host",
    },
  ];
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "media.external-hosts",
      issue: "unsafe-hosts",
      issues: [
        {
          host: "localhost",
          issue: "local-host",
        },
        {
          host: "cdn.example.com",
          issue: "placeholder-host",
        },
      ],
      message:
        "MEDIA_EXTERNAL_URL_HOSTS must contain production-safe hostnames or HTTPS origins.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Fix MEDIA_EXTERNAL_URL_HOSTS: replace localhost with a public production media host; replace placeholder host cdn.example.com with the real production media host.",
      area: "media.external-hosts",
    },
  ]);
});

test("smoke readiness blocks unsafe R2 configuration values", () => {
  const environment = createReadyEnvironment();
  environment.media.r2 = {
    configured: false,
    issues: [
      {
        issue: "invalid-account-id",
        variable: "R2_ACCOUNT_ID",
      },
      {
        issue: "invalid-bucket",
        variable: "R2_BUCKET",
      },
    ],
    missingRequired: [],
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "media.r2",
      issue: "invalid-config",
      issues: [
        {
          issue: "invalid-account-id",
          variable: "R2_ACCOUNT_ID",
        },
        {
          issue: "invalid-bucket",
          variable: "R2_BUCKET",
        },
      ],
      message: "R2 upload configuration contains invalid production values.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Fix invalid R2 variables: R2_ACCOUNT_ID must be a DNS-safe account label up to 63 characters; R2_BUCKET must be 3-63 characters using lowercase letters, numbers, dots, or hyphens, without adjacent dot/hyphen pairs or IP address format.",
      area: "media.r2",
    },
  ]);
});
