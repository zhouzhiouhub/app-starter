import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSmokeReportWritable,
  completeSmokeReport,
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
  smokeReportSchemaVersion,
} from "./smoke-report.mjs";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";
import {
  createProductionReadySmokeReport,
  createTestSmokeReport,
} from "./smoke-report-test-fixtures.mjs";

test("smoke report schema version marks the summary contract", () => {
  assert.equal(smokeReportSchemaVersion, "smoke-report.v3");
});

test("smoke report includes deployment diagnostics for effective smoke URLs", () => {
  const report = createTestSmokeReport({
    adminUrl: "https://admin.brand.com",
    apiBaseUrl: "https://api.brand.com/api/v1",
    requireAdminApp: true,
    storefrontHost: "Store.Brand.com:443",
    webUrl: "https://store.brand.com",
  });

  assert.equal(report.config.adminUrl, "https://admin.brand.com");
  assert.equal(report.config.requireAdminApp, true);
  assert.equal(report.config.storefrontHost, "store.brand.com");
  assert.equal(report.environment.deployment.admin.host, "admin.brand.com");
  assert.equal(report.environment.deployment.admin.productionReady, true);
  assert.equal(report.environment.deployment.api.host, "api.brand.com");
  assert.equal(report.environment.deployment.api.path, "/api/v1");
  assert.equal(report.environment.deployment.api.productionReady, true);
  assert.equal(report.environment.deployment.web.host, "store.brand.com");
  assert.equal(report.environment.deployment.web.productionReady, true);
});

test("smoke report ignores unsafe direct storefront host overrides", () => {
  const report = createTestSmokeReport({
    storefrontHost: "https://store.brand.com",
  });

  assert.equal(report.config.storefrontHost, null);
});

test("smoke report includes production readiness summary", () => {
  const report = createProductionReadySmokeReport();

  assert.deepEqual(report.productionReadiness, {
    blockers: [],
    nextActions: [],
    productionReady: true,
    warnings: [],
  });
});

test("smoke report helpers capture pass and failure state without secrets", () => {
  const report = createTestSmokeReport(
    {
      environmentDiagnostics: createSmokeEnvironmentDiagnostics({}),
      password: "ChangeMe123!",
      requireR2Upload: true,
      requireRevalidation: false,
    },
    { now: "2026-08-19T00:00:00.000Z" },
  );

  recordSmokeCheck(report, "api.health");
  completeSmokeReport(report, {
    pageId: "page-1",
    storefrontUrl: "https://web.example.com/en/smoke-page",
  });

  assert.equal(report.status, "passed");
  assert.equal(report.startedAt, "2026-08-19T00:00:00.000Z");
  assert.equal(report.pageId, "page-1");
  assert.equal(report.checks[0].name, "api.health");
  assert.equal(report.environment.media.cdnHost, "cdn.local.invalid");
  assert.equal("password" in report.config, false);

  recordSmokeCheckFailure(
    report,
    "media.upload-target",
    new Error("R2 failed"),
  );
  failSmokeReport(report, new Error("boom"));
  assert.equal(report.status, "failed");
  assert.equal(report.checks[1].name, "media.upload-target");
  assert.equal(report.checks[1].status, "failed");
  assert.equal(report.checks[1].error.message, "R2 failed");
  assert.equal(report.error.message, "boom");
});

test("smoke report validates required fields before writing", () => {
  const report = createTestSmokeReport();

  assert.doesNotThrow(() => assertSmokeReportWritable(report));
  assert.throws(
    () =>
      assertSmokeReportWritable({
        checks: [],
        schemaVersion: smokeReportSchemaVersion,
      }),
    /config, error, environment, finishedAt, pageId, productionReadiness, slug, startedAt, status, storefrontRequestUrl, storefrontUrl, summary, title/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: {},
      }),
    /checks must be an array/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: [{ name: "api.health", status: "skipped" }],
      }),
    /check at index 0 must have status passed or failed/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: ["api.health"],
      }),
    /check at index 0 must have status passed or failed/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: [{ name: "api.health", status: "passed" }],
      }),
    /passed check at index 0 must include passedAt/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: [
          {
            name: "api.health",
            passedAt: "2026-08-20",
            status: "passed",
          },
        ],
      }),
    /passed check at index 0 must include passedAt/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: [{ name: "api.health", status: "failed" }],
      }),
    /failed check at index 0 must include failedAt/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: [
          {
            failedAt: "2026-08-20T00:00:00.000Z",
            name: "api.health",
            status: "failed",
          },
        ],
      }),
    /failed check at index 0 must include an error message/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        productionReadiness: [],
      }),
    /productionReadiness must be an object/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        summary: [],
      }),
    /summary must be an object/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        summary: {
          ...report.summary,
          checkCount: 99,
        },
      }),
    /summary is stale/,
  );
});
