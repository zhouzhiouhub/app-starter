import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSmokeReportSummary,
  printSmokeReportSummary,
} from "./smoke-report-cli.mjs";

test("smoke report CLI formats a ready summary", () => {
  assert.deepEqual(
    formatSmokeReportSummary({
      schemaVersion: "smoke-report.v2",
      summary: {
        blockerCount: 0,
        checkCount: 12,
        failedCheckCount: 0,
        failedChecks: [],
        passedCheckCount: 12,
        productionReady: true,
        status: "passed",
        warningCount: 0,
      },
    }),
    [
      "\nSmoke report summary (smoke-report.v2):",
      "  Status: passed",
      "  Checks: 12/12 passed, 0 failed",
      "  Smoke passed: yes",
      "  Production gates: passed",
    ],
  );
});

test("smoke report CLI formats blockers and redacts failed checks", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v2",
    summary: {
      blockerCount: 2,
      checkCount: 7,
      failedCheckCount: 1,
      failedChecks: ["preview.token=payload.signature"],
      passedCheckCount: 6,
      productionReady: false,
      status: "failed",
      warningCount: 1,
    },
  });

  assert.deepEqual(lines, [
    "\nSmoke report summary (smoke-report.v2):",
    "  Status: failed",
    "  Checks: 6/7 passed, 1 failed",
    "  Smoke passed: no",
    "  Production gates: blocked",
    "  Readiness: 2 blockers, 1 warnings",
    "  Failed checks: preview.token=[redacted]",
  ]);
});

test("smoke report CLI separates smoke failures from production gates", () => {
  assert.deepEqual(
    formatSmokeReportSummary({
      schemaVersion: "smoke-report.v2",
      summary: {
        blockerCount: 0,
        checkCount: 3,
        failedCheckCount: 1,
        failedChecks: ["storefront.page"],
        passedCheckCount: 2,
        productionReady: true,
        status: "failed",
        warningCount: 0,
      },
    }),
    [
      "\nSmoke report summary (smoke-report.v2):",
      "  Status: failed",
      "  Checks: 2/3 passed, 1 failed",
      "  Smoke passed: no",
      "  Production gates: passed",
      "  Failed checks: storefront.page",
    ],
  );
});

test("smoke report CLI writes failed summaries to warning output", () => {
  const logLines = [];
  const warnLines = [];

  printSmokeReportSummary(
    {
      schemaVersion: "smoke-report.v2",
      summary: {
        checkCount: 1,
        failedCheckCount: 1,
        failedChecks: ["page.publish"],
        passedCheckCount: 0,
        productionReady: false,
        status: "failed",
      },
    },
    {
      log: (line) => logLines.push(line),
      warn: (line) => warnLines.push(line),
    },
  );

  assert.equal(logLines.length, 0);
  assert.equal(warnLines[0], "\nSmoke report summary (smoke-report.v2):");
});

test("smoke report CLI writes blocked production gates to warning output", () => {
  const logLines = [];
  const warnLines = [];

  printSmokeReportSummary(
    {
      schemaVersion: "smoke-report.v2",
      summary: {
        blockerCount: 1,
        checkCount: 3,
        failedCheckCount: 0,
        failedChecks: [],
        passedCheckCount: 3,
        productionReady: false,
        status: "passed",
      },
    },
    {
      log: (line) => logLines.push(line),
      warn: (line) => warnLines.push(line),
    },
  );

  assert.equal(logLines.length, 0);
  assert.equal(warnLines[0], "\nSmoke report summary (smoke-report.v2):");
});
