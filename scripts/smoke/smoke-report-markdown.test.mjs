import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import {
  readSmokeReportCliConfig,
  runSmokeReportCli,
} from "../smoke-report.mjs";
import { createSmokeReportArchiveEntry } from "./smoke-report-archive.mjs";
import {
  createSmokeReportArchiveIndexMarkdown,
  createSmokeReportReviewMarkdown,
} from "./smoke-report-markdown.mjs";
import { createProductionReadySmokeReport } from "./smoke-report-test-fixtures.mjs";
import {
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
} from "./smoke-report.mjs";

test("smoke report Markdown summarizes archived failure review", () => {
  const artifact = createFailedArchiveEntry();
  const markdown = createSmokeReportReviewMarkdown(artifact);

  assert.match(markdown, /^# Production Smoke Report/m);
  assert.match(markdown, /Archive: `artifacts\/production-smoke\/smoke-report\.json`/);
  assert.match(markdown, /Status: `failed`/);
  assert.match(markdown, /Smoke passed: no/);
  assert.match(markdown, /Production gates: blocked/);
  assert.match(markdown, /Failed checks: media\.upload-target, page\.publish/);
  assert.match(markdown, /R2\/CDN: failed/);
  assert.match(markdown, /Publish flow: failed/);
  assert.match(
    markdown,
    /Make STOREFRONT_REVALIDATE_SECRET match between API and Web runtimes/,
  );
  assert.equal(markdown.includes("payload.signature"), false);
});

test("smoke report Markdown renders archive indexes", () => {
  const markdown = createSmokeReportArchiveIndexMarkdown([
    createFailedArchiveEntry("reports/smoke/failed.json"),
    createReadyArchiveEntry("reports/smoke/ready.json"),
  ]);

  assert.match(markdown, /^# Production Smoke Archive/m);
  assert.match(markdown, /reports\/smoke\/failed\.json: failed/);
  assert.match(markdown, /reports\/smoke\/ready\.json: passed/);
});

test("smoke report CLI writes a Markdown review", async () => {
  const outputRoot = `tmp/smoke-report-markdown-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/smoke-report-review.md`;
  const stdout = [];

  try {
    const exitCode = await runSmokeReportCli(
      [
        "--markdown-output",
        outputPath,
        "artifacts/production-smoke/smoke-report.json",
      ],
      {
        readReportArtifact: async () => createFailedArchiveEntry(),
        stdout: (line) => stdout.push(line),
      },
    );
    const markdown = await readFile(outputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(markdown, /# Production Smoke Report/);
    assert.match(markdown, /media\.upload-target/);
    assert.match(stdout.join("\n"), /Smoke report Markdown written/);
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

test("smoke report CLI config parses Markdown output safely", () => {
  assert.deepEqual(
    readSmokeReportCliConfig([
      "--",
      "--list",
      "--limit=10",
      "--markdown-output",
      "artifacts/production-smoke/smoke-report.md",
    ]),
    {
      limit: 10,
      list: true,
      markdownOutputPath: "artifacts/production-smoke/smoke-report.md",
      reportPath: null,
    },
  );
  assert.throws(
    () =>
      readSmokeReportCliConfig([
        "--markdown-output",
        "artifacts/production-smoke/smoke-report.json",
      ]),
    /Smoke report Markdown must end with \.md/,
  );
});

function createFailedArchiveEntry(reportPath = "artifacts/production-smoke/smoke-report.json") {
  const report = createProductionReadySmokeReport({
    reportPath,
    requireAdminApp: true,
    requireR2Upload: true,
  });

  report.productionReadiness = {
    blockers: [
      {
        area: "media.r2",
        issue: "missing-required-env",
        message: "Configure all required R2 variables before production smoke.",
      },
    ],
    nextActions: [
      {
        action: "Configure R2 variables before production smoke.",
        area: "media.r2",
      },
    ],
    productionReady: false,
    warnings: [],
  };
  recordSmokeCheck(report, "admin.app");
  recordSmokeCheckFailure(
    report,
    "media.upload-target",
    new Error("Media upload target failed token=payload.signature"),
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

  return createSmokeReportArchiveEntry({
    mtimeMs: 0,
    path: reportPath,
    report,
  });
}

function createReadyArchiveEntry(reportPath) {
  const report = createProductionReadySmokeReport({ reportPath });

  recordSmokeCheck(report, "api.health");
  report.status = "passed";
  report.finishedAt = "2026-08-25T00:00:00.000Z";

  return createSmokeReportArchiveEntry({
    mtimeMs: 0,
    path: reportPath,
    report,
  });
}
