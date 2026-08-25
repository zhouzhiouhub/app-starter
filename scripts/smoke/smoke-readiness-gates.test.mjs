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
        "Set ADMIN_URL to the deployed Admin HTTPS origin and SMOKE_REQUIRE_ADMIN_APP=true so smoke verifies the Admin shell, module script, modulepreload chunks, and stylesheet assets from the same origin.",
      ],
      [
        "media.r2",
        "Set SMOKE_REQUIRE_R2_UPLOAD=true after configuring R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_REGION, and production MEDIA_CDN_BASE_URL so smoke proves presigned URL creation, actual PUT upload, and CDN delivery.",
      ],
      [
        "revalidation",
        "Set SMOKE_REQUIRE_REVALIDATION=true, configure STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes, and set STOREFRONT_REVALIDATE_URL to the deployed storefront /api/revalidate endpoint.",
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
        "Set SMOKE_REQUIRE_R2_UPLOAD=true after configuring R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_REGION, and production MEDIA_CDN_BASE_URL so smoke proves presigned URL creation, actual PUT upload, and CDN delivery.",
      ],
      [
        "media.cdn",
        "Replace placeholder MEDIA_CDN_BASE_URL hosts with the real production HTTPS CDN host.",
      ],
    ],
  );
});

test("smoke readiness reports file-like CDN base path blockers", () => {
  const environment = createReadyEnvironment();
  environment.media.cdnProductionReady = false;
  environment.media.cdnUrlIssue = "file-path";

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "media.cdn",
      issue: "file-path",
      message:
        "MEDIA_CDN_BASE_URL must be a production HTTPS CDN origin or directory prefix.",
    },
  ]);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Replace file-like MEDIA_CDN_BASE_URL paths with the CDN origin or a directory prefix such as /media.",
      area: "media.cdn",
    },
  ]);
  assert.equal(readiness.productionReady, false);
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
