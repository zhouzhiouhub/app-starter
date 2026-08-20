import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSmokeReportWritable,
  completeSmokeReport,
  createSmokeReport,
  createSmokeReportSummary,
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
} from "./smoke-report.mjs";

test("smoke report keeps top-level summary current", () => {
  const report = createSmokeReport(
    {
      adminUrl: "https://admin.brand.com",
      apiBaseUrl: "https://api.brand.com/api/v1",
      environmentDiagnostics: {
        deployment: {
          admin: { productionReady: true },
          api: { productionReady: true },
          web: { productionReady: true },
        },
        media: {
          cdnConfigured: true,
          cdnProductionReady: true,
          r2: { configured: true, missingRequired: [] },
        },
        revalidation: {
          secretConfigured: true,
          urlConfigured: true,
          urlSafe: true,
          usesWebUrlFallback: false,
        },
      },
      locale: "en-US",
      market: "us",
      requireAdminApp: true,
      requireR2Upload: true,
      requireRevalidation: true,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://store.brand.com",
    },
    "Smoke Page",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  assert.deepEqual(report.summary, {
    blockerCount: 0,
    checkCount: 0,
    failedCheckCount: 0,
    failedChecks: [],
    passedCheckCount: 0,
    productionReady: true,
    status: "running",
    warningCount: 0,
  });

  recordSmokeCheck(report, "auth.login");

  assert.equal(report.summary.checkCount, 1);
  assert.equal(report.summary.passedCheckCount, 1);
  assert.equal(report.summary.failedCheckCount, 0);

  recordSmokeCheckFailure(report, "page.publish", new Error("failed"));

  assert.deepEqual(report.summary.failedChecks, ["page.publish"]);
  assert.equal(report.summary.checkCount, 2);
  assert.equal(report.summary.failedCheckCount, 1);
  assert.equal(report.summary.status, "running");

  failSmokeReport(report, new Error("failed"));

  assert.equal(report.summary.status, "failed");
});

test("smoke report summarizes completed pass status", () => {
  const report = createSmokeReport(
    {
      apiBaseUrl: "https://api.example.com/api/v1",
      locale: "en-US",
      market: "us",
      requireR2Upload: false,
      requireRevalidation: false,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://web.example.com",
    },
    "Smoke Page",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  recordSmokeCheck(report, "page.publish");
  completeSmokeReport(report, {
    pageId: "page_1",
    storefrontUrl: "https://web.example.com/en/smoke-page",
  });

  assert.equal(report.summary.status, "passed");
  assert.equal(report.summary.checkCount, 1);
  assert.equal(report.summary.passedCheckCount, 1);
});

test("smoke report counts failed checks even when names are missing", () => {
  const report = createSmokeReport(
    {
      apiBaseUrl: "https://api.example.com/api/v1",
      locale: "en-US",
      market: "us",
      requireR2Upload: false,
      requireRevalidation: false,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://web.example.com",
    },
    "Smoke Page",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  report.checks.push(
    {
      failedAt: "2026-08-20T00:00:01.000Z",
      status: "failed",
    },
    {
      failedAt: "2026-08-20T00:00:02.000Z",
      name: "media.confirm",
      status: "failed",
    },
  );
  report.summary = createSmokeReportSummary(report);

  assert.equal(report.summary.failedCheckCount, 2);
  assert.deepEqual(report.summary.failedChecks, [
    "unnamed-check-1",
    "media.confirm",
  ]);
  assert.doesNotThrow(() => assertSmokeReportWritable(report));
});
