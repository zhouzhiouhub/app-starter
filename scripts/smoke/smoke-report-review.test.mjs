import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeReportArchiveEntry } from "./smoke-report-archive.mjs";
import {
  formatSmokeReportArchiveIndex,
  formatSmokeReportFailureActions,
  formatSmokeReportReview,
} from "./smoke-report-review.mjs";
import { createProductionReadySmokeReport } from "./smoke-report-test-fixtures.mjs";
import {
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
} from "./smoke-report.mjs";

test("smoke report review highlights archived failure traceability", () => {
  const report = createProductionReadySmokeReport({
    reportPath: "reports/production/smoke-report.json",
    requireAdminApp: true,
    requireR2Upload: true,
  });

  recordSmokeCheck(report, "admin.app");
  recordSmokeCheckFailure(
    report,
    "media.upload-target",
    new Error("Media upload target is not a secure R2 URL."),
    {
      mediaUploadTarget: {
        isR2UploadUrl: false,
      },
    },
  );
  recordSmokeCheckFailure(
    report,
    "page.publish",
    new Error("Storefront revalidation failed with token=payload.signature"),
    {
      revalidation: {
        diagnosis: "revalidation-secret-mismatch",
      },
    },
  );
  failSmokeReport(report, new Error("Smoke failed token=payload.signature"));
  report.finishedAt = "2026-08-24T00:00:00.000Z";

  const lines = formatSmokeReportReview(
    createSmokeReportArchiveEntry({
      mtimeMs: 0,
      path: "reports/production/smoke-report.json",
      report,
    }),
  );

  assert.equal(
    lines[0],
    "Smoke report archive: reports/production/smoke-report.json",
  );
  assert.equal(
    lines.some((line) => line.includes("R2/CDN: failed")),
    true,
  );
  assert.equal(
    lines.some((line) => line.includes("Admin static app: passed")),
    true,
  );
  assert.equal(
    lines.some((line) => line.includes("Publish flow: failed")),
    true,
  );
  assert.equal(lines.join("\n").includes("payload.signature"), false);
  assert.equal(
    lines.includes(
      "    - Make STOREFRONT_REVALIDATE_SECRET match between API and Web runtimes.",
    ),
    true,
  );
});

test("smoke report review notes unproven optional production gates", () => {
  const report = createProductionReadySmokeReport({
    requireAdminApp: false,
    requireR2Upload: false,
  });

  recordSmokeCheck(report, "media.upload-target");
  recordSmokeCheck(report, "page.preview");

  const lines = formatSmokeReportReview(
    createSmokeReportArchiveEntry({
      mtimeMs: 0,
      path: "tmp/smoke-report.json",
      report,
    }),
  );

  assert.equal(
    lines.some((line) => line.includes("set SMOKE_REQUIRE_R2_UPLOAD=true")),
    true,
  );
  assert.equal(
    lines.some((line) => line.includes("set SMOKE_REQUIRE_ADMIN_APP=true")),
    true,
  );
});

test("smoke report archive index summarizes recent reports", () => {
  const readyReport = createProductionReadySmokeReport();
  const failedReport = createProductionReadySmokeReport();

  recordSmokeCheck(readyReport, "api.health");
  readyReport.status = "passed";
  readyReport.finishedAt = "2026-08-25T00:00:00.000Z";
  recordSmokeCheckFailure(failedReport, "api.health", new Error("boom"));
  failSmokeReport(failedReport, new Error("boom"));

  const lines = formatSmokeReportArchiveIndex([
    createSmokeReportArchiveEntry({
      mtimeMs: 0,
      path: "reports/ready.json",
      report: readyReport,
    }),
    createSmokeReportArchiveEntry({
      mtimeMs: 0,
      path: "reports/failed.json",
      report: failedReport,
    }),
  ]);

  assert.equal(lines[0], "Smoke report archive:");
  assert.match(lines[1], /reports\/ready\.json \| passed \| 1\/1 checks/);
  assert.match(lines[2], /reports\/failed\.json \| failed \| 0\/1 checks/);
});

test("smoke report failure actions can be read for integrations", () => {
  const report = createProductionReadySmokeReport();

  recordSmokeCheckFailure(
    report,
    "media.upload-target",
    new Error("bad upload target"),
    {
      mediaUploadTarget: {
        isR2UploadUrl: false,
      },
    },
  );

  assert.deepEqual(formatSmokeReportFailureActions(report), [
    "Configure R2 upload variables so /media/upload-url returns a Cloudflare R2 presigned PUT URL.",
  ]);
});
