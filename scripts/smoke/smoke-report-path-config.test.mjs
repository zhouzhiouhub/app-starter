import assert from "node:assert/strict";
import test from "node:test";
import { readConfig } from "./publish-smoke-config.mjs";
import { normalizeSmokeReportPath } from "./smoke-report-path-config.mjs";
import { withEnv } from "./smoke-test-env.mjs";

test("smoke report path config validates report output paths", () => {
  assert.equal(
    normalizeSmokeReportPath(" tmp\\smoke-report.json "),
    "tmp/smoke-report.json",
  );
  assert.equal(
    normalizeSmokeReportPath("reports/2026-08-20/smoke.JSON"),
    "reports/2026-08-20/smoke.JSON",
  );
  assert.equal(
    normalizeSmokeReportPath(".tmp/publish/smoke-report.json"),
    ".tmp/publish/smoke-report.json",
  );
  assert.throws(
    () => normalizeSmokeReportPath("package.json"),
    /SMOKE_REPORT_PATH must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
  assert.throws(
    () => normalizeSmokeReportPath("tmp/../package.json"),
    /SMOKE_REPORT_PATH must use safe path segments without traversal/,
  );
  assert.throws(
    () => normalizeSmokeReportPath("tmp/smoke-report.txt"),
    /SMOKE_REPORT_PATH must end with .json/,
  );
  assert.throws(
    () => normalizeSmokeReportPath("C:\\tmp\\smoke-report.json"),
    /SMOKE_REPORT_PATH must be a relative JSON report path/,
  );
  assert.throws(
    () => normalizeSmokeReportPath("/tmp/smoke-report.json"),
    /SMOKE_REPORT_PATH must be a relative JSON report path/,
  );
});

test("smoke report path config rejects unsafe environment values", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REPORT_PATH: "../smoke-report.json",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REPORT_PATH must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REPORT_PATH: "tmp/smoke report.json",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REPORT_PATH must use safe path segments without traversal/,
      );
    },
  );
});
