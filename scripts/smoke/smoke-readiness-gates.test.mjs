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

test("smoke readiness reports unsafe deployment and environment blockers", () => {
  const readiness = createSmokeProductionReadiness(
    {
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
      media: {
        cdnConfigured: true,
        cdnProductionReady: false,
        cdnUrlIssue: "placeholder-host",
        r2: {
          configured: false,
          missingRequired: ["R2_SECRET_ACCESS_KEY"],
        },
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
