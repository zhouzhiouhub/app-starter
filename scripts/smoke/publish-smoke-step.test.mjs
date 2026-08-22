import assert from "node:assert/strict";
import test from "node:test";
import { runSmokeStep } from "./publish-smoke-step.mjs";
import { createTestSmokeReport } from "./smoke-report-test-fixtures.mjs";

test("publish smoke step records successful checks with details", async () => {
  const report = createTestSmokeReport();
  const result = await runSmokeStep(
    report,
    "page.preview",
    async () => ({ id: "page-1" }),
    (page) => ({ pageId: page.id }),
  );

  assert.deepEqual(result, { id: "page-1" });
  assert.equal(report.checks[0].name, "page.preview");
  assert.equal(report.checks[0].status, "passed");
  assert.deepEqual(report.checks[0].details, { pageId: "page-1" });
});

test("publish smoke step records failures before rethrowing", async () => {
  const report = createTestSmokeReport();

  await assert.rejects(
    () =>
      runSmokeStep(report, "page.publish", async () => {
        throw new Error("publish failed");
      }),
    /publish failed/,
  );

  assert.equal(report.checks[0].name, "page.publish");
  assert.equal(report.checks[0].status, "failed");
  assert.equal(report.checks[0].error.message, "publish failed");
});
