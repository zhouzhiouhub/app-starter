import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";
import {
  createReadyConfig,
  createReadyEnvironment,
} from "./smoke-readiness-test-fixtures.mjs";

test("smoke readiness passes when every production gate is proven", () => {
  const readiness = createSmokeProductionReadiness(
    createReadyEnvironment(),
    createReadyConfig(),
  );

  assert.deepEqual(readiness, {
    blockers: [],
    nextActions: [],
    productionReady: true,
    warnings: [],
  });
});

test("smoke readiness marks omitted production gates as blockers", () => {
  const readiness = createSmokeProductionReadiness(createReadyEnvironment(), {
    ...createReadyConfig(),
    requireAdminApp: false,
    requireR2Upload: false,
    requireRevalidation: false,
  });

  assert.deepEqual(
    readiness.blockers.map((blocker) => [blocker.area, blocker.issue]),
    [
      ["deployment.admin", "admin-smoke-not-required"],
      ["media.r2", "r2-upload-smoke-not-required"],
      ["revalidation", "revalidation-smoke-not-required"],
    ],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(
    readiness.nextActions.map((item) => [item.area, item.action]),
    [
      [
        "deployment.admin",
        "Set ADMIN_URL to the deployed Admin origin and SMOKE_REQUIRE_ADMIN_APP=true.",
      ],
      [
        "media.r2",
        "Configure R2 credentials and set SMOKE_REQUIRE_R2_UPLOAD=true.",
      ],
      [
        "revalidation",
        "Keep SMOKE_REQUIRE_REVALIDATION=true and configure storefront revalidation.",
      ],
    ],
  );
});

test("smoke readiness requires an archived report path", () => {
  const readiness = createSmokeProductionReadiness(createReadyEnvironment(), {
    ...createReadyConfig(),
    reportPath: null,
  });

  assert.deepEqual(readiness.blockers, [
    {
      area: "report.path",
      issue: "report-path-not-configured",
      message:
        "Set SMOKE_REPORT_PATH to archive a machine-readable production smoke report.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set SMOKE_REPORT_PATH to a relative JSON path under tmp/, reports/, artifacts/, or .tmp/.",
      area: "report.path",
    },
  ]);
});

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

test("smoke readiness reports unsafe deployment and environment blockers", () => {
  const readiness = createSmokeProductionReadiness(
    {
      analytics: {
        productionReady: true,
      },
      deployment: {
        admin: {
          host: "localhost",
          path: "",
          productionReady: false,
          urlIssue: "local-host",
          variable: "ADMIN_URL",
        },
        api: {
          host: "api.example.com",
          path: "/api/v1",
          productionReady: false,
          urlIssue: "placeholder-host",
          variable: "API_URL",
        },
        web: {
          host: "store.brand.com",
          path: "",
          productionReady: true,
          urlIssue: null,
          variable: "WEB_URL",
        },
      },
      featureFlags: {
        productionReady: true,
      },
      media: {
        cdnConfigured: true,
        cdnProductionReady: false,
        cdnUrlIssue: "placeholder-host",
        r2: {
          configured: false,
          missingRequired: ["R2_SECRET_ACCESS_KEY"],
        },
      },
      preview: {
        secretConfigured: false,
      },
      revalidation: {
        secretConfigured: false,
        urlConfigured: true,
        urlIssue: "embedded-credentials",
        urlSafe: false,
        usesWebUrlFallback: false,
      },
    },
    createReadyConfig(),
  );

  assert.deepEqual(
    readiness.blockers.map((blocker) => [blocker.area, blocker.issue]),
    [
      ["deployment.api", "placeholder-host"],
      ["deployment.admin", "local-host"],
      ["media.r2", "missing-required-env"],
      ["media.cdn", "placeholder-host"],
      ["preview.secret", "missing-secret"],
      ["revalidation.secret", "missing-secret"],
      ["revalidation.url", "embedded-credentials"],
    ],
  );
  assert.deepEqual(readiness.blockers[2].missingRequired, [
    "R2_SECRET_ACCESS_KEY",
  ]);
  assert.deepEqual(
    readiness.nextActions.map((item) => item.area),
    [
      "deployment.api",
      "deployment.admin",
      "media.r2",
      "media.cdn",
      "preview.secret",
      "revalidation.secret",
      "revalidation.url",
    ],
  );
  assert.equal(
    readiness.nextActions[2].action,
    "Set missing R2 variables: R2_SECRET_ACCESS_KEY.",
  );
});

test("smoke readiness reports unsafe storefront deployment blockers", () => {
  const environment = createReadyEnvironment();
  environment.deployment.web = {
    host: "localhost",
    path: "",
    productionReady: false,
    urlIssue: "local-host",
    variable: "WEB_URL",
  };

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(
    readiness.blockers.map((blocker) => [blocker.area, blocker.issue]),
    [["deployment.web", "local-host"]],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action: "Set WEB_URL to the deployed storefront HTTPS origin.",
      area: "deployment.web",
    },
  ]);
});
