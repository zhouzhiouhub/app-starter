import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSmokeReportWritable,
  completeSmokeReport,
  createSmokeReportSummary,
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
} from "./smoke-report.mjs";
import {
  createProductionReadySmokeReport,
  createTestSmokeReport,
} from "./smoke-report-test-fixtures.mjs";

test("smoke report keeps top-level summary current", () => {
  const report = createProductionReadySmokeReport();

  assert.deepEqual(report.summary, {
    blockerCount: 0,
    checkCount: 0,
    failedCheckCount: 0,
    failedCheckDetails: [],
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

  assert.deepEqual(report.summary.failedCheckDetails, [
    {
      details: {},
      message: "failed",
      name: "page.publish",
    },
  ]);
  assert.deepEqual(report.summary.failedChecks, ["page.publish"]);
  assert.equal(report.summary.checkCount, 2);
  assert.equal(report.summary.failedCheckCount, 1);
  assert.equal(report.summary.status, "running");

  failSmokeReport(report, new Error("failed"));

  assert.equal(report.summary.status, "failed");
});

test("smoke report summarizes completed pass status", () => {
  const report = createTestSmokeReport({ requireRevalidation: false });

  recordSmokeCheck(report, "page.publish");
  completeSmokeReport(report, {
    pageId: "page_1",
    storefrontRequestUrl:
      "http://localhost:3000/en/smoke-page?preview_token=payload.signature",
    storefrontUrl:
      "https://web.example.com/en/smoke-page#access_token=fragment-token",
  });

  assert.equal(
    report.storefrontRequestUrl,
    "http://localhost:3000/en/smoke-page?preview_token=[redacted]",
  );
  assert.equal(
    report.storefrontUrl,
    "https://web.example.com/en/smoke-page#access_token=[redacted]",
  );
  assert.equal(JSON.stringify(report).includes("payload.signature"), false);
  assert.equal(JSON.stringify(report).includes("fragment-token"), false);
  assert.equal(report.summary.status, "passed");
  assert.equal(report.summary.checkCount, 1);
  assert.equal(report.summary.passedCheckCount, 1);
});

test("smoke report counts failed checks even when names are missing", () => {
  const report = createTestSmokeReport({ requireRevalidation: false });

  report.checks.push(
    {
      error: { message: "Unnamed check failed." },
      failedAt: "2026-08-20T00:00:01.000Z",
      status: "failed",
    },
    {
      error: { message: "Media confirm failed." },
      failedAt: "2026-08-20T00:00:02.000Z",
      name: "media.confirm",
      status: "failed",
    },
  );
  report.summary = createSmokeReportSummary(report);

  assert.equal(report.summary.failedCheckCount, 2);
  assert.deepEqual(report.summary.failedCheckDetails, [
    {
      details: {},
      message: "Unnamed check failed.",
      name: "unnamed-check-1",
    },
    {
      details: {},
      message: "Media confirm failed.",
      name: "media.confirm",
    },
  ]);
  assert.deepEqual(report.summary.failedChecks, [
    "unnamed-check-1",
    "media.confirm",
  ]);
  failSmokeReport(report, new Error("Smoke failed."));
  assert.doesNotThrow(() => assertSmokeReportWritable(report));
});
