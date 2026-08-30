import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import {
  createSmokeReportArchiveEntry,
  readSmokeReportArtifact,
} from "./smoke-report-archive.mjs";
import { createSmokeReportReviewMarkdown } from "./smoke-report-markdown.mjs";
import {
  createSmokeReportMarkdownCompanionCheck,
  readSmokeReportMarkdownCompanionPath,
} from "./smoke-report-markdown-companion.mjs";
import { createProductionReadySmokeReport } from "./smoke-report-test-fixtures.mjs";
import {
  recordSmokeCheck,
  refreshSmokeReportSummary,
} from "./smoke-report.mjs";

const archiveRoot = `tmp/smoke-report-markdown-companion-${process.pid}`;

test("smoke archive reads complete companion Markdown evidence", async () => {
  const reportPath = `${archiveRoot}/complete/smoke-report.json`;
  const markdownPath = readSmokeReportMarkdownCompanionPath(reportPath);

  await rm(archiveRoot, { force: true, recursive: true });
  await mkdir(`${archiveRoot}/complete`, { recursive: true });

  try {
    const report = createReport(reportPath);
    await writeSmokeReport(reportPath, report);
    await writeSmokeMarkdown(markdownPath, reportPath, report);

    const artifact = await readSmokeReportArtifact(reportPath);

    assert.equal(artifact.markdown.path, markdownPath);
    assert.equal(artifact.markdown.status, "complete");
    assert.equal(artifact.markdown.issueCount, 0);
  } finally {
    await rm(archiveRoot, { force: true, recursive: true });
  }
});

test("smoke archive records missing companion Markdown evidence", async () => {
  const reportPath = `${archiveRoot}/missing/smoke-report.json`;

  await rm(archiveRoot, { force: true, recursive: true });
  await mkdir(`${archiveRoot}/missing`, { recursive: true });

  try {
    await writeSmokeReport(reportPath, createReport(reportPath));

    const artifact = await readSmokeReportArtifact(reportPath);

    assert.equal(artifact.markdown.status, "missing");
    assert.equal(artifact.markdown.issueCount, 1);
    assert.match(
      artifact.markdown.issues[0].message,
      /pnpm smoke:report -- --markdown-output .*smoke-report\.md .*smoke-report\.json/u,
    );
  } finally {
    await rm(archiveRoot, { force: true, recursive: true });
  }
});

test("smoke companion Markdown check catches metadata drift", () => {
  const reportPath = `${archiveRoot}/drift/smoke-report.json`;
  const markdownPath = readSmokeReportMarkdownCompanionPath(reportPath);
  const report = createReport(reportPath);
  const check = createSmokeReportMarkdownCompanionCheck({
    content: [
      "# Production Smoke Report",
      "",
      `Archive: \`${reportPath}\``,
      "Status: `failed`",
      "",
      "## Metadata",
    ].join("\n"),
    path: markdownPath,
    report,
    reportPath,
  });

  assert.equal(check.status, "invalid");
  assert.equal(
    check.issues.some(
      (issue) => issue.code === "smoke_report_markdown_status_mismatch",
    ),
    true,
  );
  assert.equal(
    check.issues.some(
      (issue) => issue.code === "smoke_report_markdown_section_missing",
    ),
    true,
  );
});

async function writeSmokeReport(reportPath, report) {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function writeSmokeMarkdown(markdownPath, reportPath, report) {
  const artifact = createSmokeReportArchiveEntry({
    mtimeMs: 0,
    path: reportPath,
    report,
  });

  await writeFile(markdownPath, createSmokeReportReviewMarkdown(artifact));
}

function createReport(reportPath) {
  const report = createProductionReadySmokeReport({
    reportPath,
    slug: "markdown-smoke",
  });

  recordSmokeCheck(report, "api.health");
  report.finishedAt = "2026-08-30T00:00:00.000Z";
  report.pageId = "page-1";
  report.status = "passed";
  report.storefrontRequestUrl = "https://store.brand.com/en/markdown-smoke";
  report.storefrontUrl = "https://store.brand.com/en/markdown-smoke";
  refreshSmokeReportSummary(report);

  return report;
}
