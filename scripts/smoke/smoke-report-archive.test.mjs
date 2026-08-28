import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import {
  createSmokeReportArchiveEntry,
  discoverSmokeReportArtifacts,
  normalizeSmokeReportArchiveRoot,
  parseSmokeReportArtifact,
  readSmokeReportArtifact,
} from "./smoke-report-archive.mjs";
import { createProductionReadySmokeReport } from "./smoke-report-test-fixtures.mjs";
import {
  refreshSmokeReportSummary,
  recordSmokeCheck,
} from "./smoke-report.mjs";

const archiveRoot = `tmp/smoke-report-archive-test-${process.pid}`;

test("smoke report archive discovers v3 reports by newest finish time", async () => {
  await rm(archiveRoot, { force: true, recursive: true });
  await mkdir(`${archiveRoot}/nested`, { recursive: true });

  try {
    await writeFile(`${archiveRoot}/notes.json`, '{"kind":"not-smoke"}');
    await writeFile(`${archiveRoot}/broken.json`, "{");
    await writeReport(`${archiveRoot}/old.json`, {
      finishedAt: "2026-08-20T00:00:00.000Z",
      slug: "old-smoke",
    });
    await writeReport(`${archiveRoot}/nested/latest.json`, {
      finishedAt: "2026-08-21T00:00:00.000Z",
      slug: "latest-smoke",
    });

    const artifacts = await discoverSmokeReportArtifacts({
      roots: [archiveRoot],
    });

    assert.equal(artifacts.length, 2);
    assert.equal(artifacts[0].path, `${archiveRoot}/nested/latest.json`);
    assert.equal(artifacts[0].report.slug, "latest-smoke");
    assert.equal(artifacts[0].summary.status, "passed");
    assert.equal(artifacts[1].path, `${archiveRoot}/old.json`);
  } finally {
    await rm(archiveRoot, { force: true, recursive: true });
  }
});

test("smoke report archive reads an explicit safe report path", async () => {
  const reportPath = `${archiveRoot}/single.json`;

  await rm(archiveRoot, { force: true, recursive: true });
  await mkdir(archiveRoot, { recursive: true });

  try {
    await writeReport(reportPath, {
      finishedAt: "2026-08-22T00:00:00.000Z",
      slug: "single-smoke",
    });

    const artifact = await readSmokeReportArtifact(reportPath);

    assert.equal(artifact.path, reportPath);
    assert.equal(artifact.report.slug, "single-smoke");
    assert.equal(artifact.finishedAt, "2026-08-22T00:00:00.000Z");
  } finally {
    await rm(archiveRoot, { force: true, recursive: true });
  }
});

test("smoke report archive rejects unsafe explicit paths and roots", async () => {
  await assert.rejects(
    () => readSmokeReportArtifact("../smoke-report.json"),
    /SMOKE_REPORT_PATH must be under/,
  );
  assert.throws(
    () => normalizeSmokeReportArchiveRoot("../reports"),
    /SMOKE_REPORT_PATH must be under/,
  );
});

test("smoke report archive rejects non-v3 artifacts", () => {
  assert.throws(
    () => parseSmokeReportArtifact('{"schemaVersion":"smoke-report.v2"}'),
    /smoke-report\.v3/,
  );
});

test("smoke report archive entries recompute summary from checks", () => {
  const report = createReport({
    finishedAt: "2026-08-23T00:00:00.000Z",
    slug: "summary-smoke",
  });

  report.summary = { status: "stale" };

  const artifact = createSmokeReportArchiveEntry({
    mtimeMs: 0,
    path: "reports/summary.json",
    report,
  });

  assert.equal(artifact.summary.status, "passed");
  assert.equal(artifact.summary.checkCount, 1);
});

async function writeReport(path, input) {
  await writeFile(path, `${JSON.stringify(createReport(input), null, 2)}\n`);
}

function createReport(input) {
  const report = createProductionReadySmokeReport({
    reportPath: input.path ?? "reports/production/smoke-report.json",
    slug: input.slug,
  });

  recordSmokeCheck(report, "api.health");
  report.finishedAt = input.finishedAt;
  report.pageId = "page-1";
  report.status = "passed";
  report.storefrontRequestUrl = `https://store.brand.com/en/${input.slug}`;
  report.storefrontUrl = `https://store.brand.com/en/${input.slug}`;
  refreshSmokeReportSummary(report);

  return report;
}
