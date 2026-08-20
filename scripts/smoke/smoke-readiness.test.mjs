import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";

test("smoke readiness passes when every production gate is proven", () => {
  const readiness = createSmokeProductionReadiness(
    createReadyEnvironment(),
    createReadyConfig(),
  );

  assert.deepEqual(readiness, {
    blockers: [],
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
});

test("smoke readiness warns when revalidation uses WEB_URL fallback", () => {
  const environment = createReadyEnvironment();
  environment.revalidation.usesWebUrlFallback = true;

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.warnings, [
    {
      area: "revalidation.url",
      issue: "uses-web-url-fallback",
      message:
        "STOREFRONT_REVALIDATE_URL is not set; smoke will derive /api/revalidate from WEB_URL.",
    },
  ]);
  assert.equal(readiness.productionReady, true);
});

function createReadyConfig() {
  return {
    requireAdminApp: true,
    requireR2Upload: true,
    requireRevalidation: true,
  };
}

function createReadyEnvironment() {
  return {
    deployment: {
      admin: {
        productionReady: true,
      },
      api: {
        productionReady: true,
      },
      web: {
        productionReady: true,
      },
    },
    media: {
      cdnConfigured: true,
      cdnProductionReady: true,
      r2: {
        configured: true,
        missingRequired: [],
      },
    },
    revalidation: {
      secretConfigured: true,
      urlConfigured: true,
      urlSafe: true,
      usesWebUrlFallback: false,
    },
  };
}
