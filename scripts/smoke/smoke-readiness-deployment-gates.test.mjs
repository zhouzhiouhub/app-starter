import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";
import {
  createReadyConfig,
  createReadyEnvironment,
} from "./smoke-readiness-test-fixtures.mjs";

test("smoke readiness reports unsafe deployment and environment blockers", () => {
  const readiness = createSmokeProductionReadiness(
    {
      analytics: {
        productionReady: true,
      },
      database: {
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
      identity: {
        jwt: {
          productionReady: true,
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
      preview: {
        secretConfigured: false,
      },
      redis: {
        productionReady: true,
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
      action:
        "Replace local or private WEB_URL hosts with the deployed public HTTPS storefront origin.",
      area: "deployment.web",
    },
  ]);
});
