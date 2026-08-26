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
