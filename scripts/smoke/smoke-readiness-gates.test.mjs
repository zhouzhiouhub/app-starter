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

test("smoke readiness reports CDN blockers even when R2 upload smoke is omitted", () => {
  const environment = createReadyEnvironment();
  environment.media.cdnProductionReady = false;
  environment.media.cdnUrlIssue = "placeholder-host";

  const readiness = createSmokeProductionReadiness(environment, {
    ...createReadyConfig(),
    requireR2Upload: false,
  });

  assert.deepEqual(
    readiness.blockers.map((blocker) => [blocker.area, blocker.issue]),
    [
      ["media.r2", "r2-upload-smoke-not-required"],
      ["media.cdn", "placeholder-host"],
    ],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(
    readiness.nextActions.map((item) => [item.area, item.action]),
    [
      [
        "media.r2",
        "Configure R2 credentials and set SMOKE_REQUIRE_R2_UPLOAD=true.",
      ],
      [
        "media.cdn",
        "Replace placeholder MEDIA_CDN_BASE_URL hosts with the real production HTTPS CDN host.",
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
        "Set SMOKE_REPORT_PATH to archive a JSON report under tmp/, reports/, artifacts/, or .tmp/.",
      area: "report.path",
    },
  ]);
});

test("smoke readiness validates archived report paths", () => {
  const readiness = createSmokeProductionReadiness(createReadyEnvironment(), {
    ...createReadyConfig(),
    reportPath: "C:\\tmp\\smoke-report.txt",
  });

  assert.deepEqual(readiness.blockers, [
    {
      area: "report.path",
      issue: "absolute-or-null-path",
      message: "SMOKE_REPORT_PATH must be a safe relative JSON report path.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Use a relative SMOKE_REPORT_PATH under tmp/, reports/, artifacts/, or .tmp/; do not use absolute paths or null bytes.",
      area: "report.path",
    },
  ]);
});
