import assert from "node:assert/strict";
import test from "node:test";
import { formatSmokeReportSummary } from "./smoke-report-cli.mjs";

test("smoke report CLI normalizes failure detail messages", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      checkCount: 1,
      failedCheckCount: 1,
      failedCheckDetails: [
        {
          details: {},
          message: `Audit log missing.\nAuthorization Bearer a.b.c ${"x".repeat(400)}`,
          name: "audit.logs",
        },
      ],
      failedChecks: ["audit.logs"],
      passedCheckCount: 0,
      productionReady: true,
      status: "failed",
    },
  });
  const failureDetailLine = lines.find((line) =>
    line.startsWith("    - audit.logs:"),
  );

  assert.equal(lines.join("\n").includes("a.b.c"), false);
  assert.doesNotMatch(failureDetailLine ?? "", /[\r\n]/);
  assert.match(failureDetailLine ?? "", /\.\.\.$/);
  assert.equal((failureDetailLine?.length ?? 0) <= 260, true);
});

test("smoke report CLI normalizes summary metadata and caps output lines", () => {
  const failedChecks = Array.from(
    { length: 12 },
    (_, index) =>
      `api.health.${index}.token=payload.signature.${"x".repeat(120)}`,
  );
  const lines = formatSmokeReportSummary({
    schemaVersion: `smoke-report.v3.${"v".repeat(
      240,
    )}\nAuthorization Bearer a.b.c`,
    summary: {
      blockerCount: 0,
      checkCount: 12,
      failedCheckCount: 12,
      failedChecks,
      passedCheckCount: 0,
      productionReady: true,
      status: `failed.${"s".repeat(240)}\nAuthorization Bearer a.b.c`,
      warningCount: 0,
    },
  });
  const headerLine = lines[0]?.slice(1) ?? "";
  const statusLine = lines[1] ?? "";
  const failedChecksLine =
    lines.find((line) => line.includes("Failed checks:")) ?? "";

  assert.equal(lines.join("\n").includes("payload.signature"), false);
  assert.equal(lines.join("\n").includes("a.b.c"), false);
  assert.doesNotMatch(headerLine, /[\r\n]/);
  assert.doesNotMatch(statusLine, /[\r\n]/);
  assert.match(headerLine, /\.\.\.\):$/);
  assert.match(statusLine, /\.\.\.$/);
  assert.match(failedChecksLine, /\.\.\.$/);
  assert.equal(headerLine.length <= 120, true);
  assert.equal(statusLine.length <= 120, true);
  assert.equal(failedChecksLine.length <= 360, true);
});
