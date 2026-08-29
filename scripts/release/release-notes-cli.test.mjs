import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { runReleaseNotesCli } from "../release-notes.mjs";
import { createReadySmokeSource } from "./release-notes-test-fixtures.mjs";

test("release notes CLI writes a Markdown release record", async () => {
  const root = `tmp/release-notes-test-${process.pid}-${Date.now()}`;
  const releaseCheckPath = `${root}/release-check.json`;
  const outputPath = `${root}/v0.1.0.md`;
  const stdout = [];

  await rm(root, { force: true, recursive: true });
  mkdirSync(root, { recursive: true });
  writeFileSync(releaseCheckPath, `${JSON.stringify(createReadyArtifact())}\n`);

  try {
    const exitCode = await runReleaseNotesCli(
      [
        "--release-tag",
        "v0.1.0",
        "--workflow-run-url",
        "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
        "--smoke-artifact",
        "production-smoke-report-123",
        "--release-artifact",
        "release-evidence-check-123",
        "--project-status-artifact",
        "project-status-123",
        "--visual-artifact",
        "page-builder-visual-fixture-123",
        "--storefront-url",
        "https://store.brand.com",
        "--rollback-target",
        "main@abcdef1",
        "--release-check",
        releaseCheckPath,
        "--output",
        outputPath,
      ],
      { stdout: (line) => stdout.push(line) },
    );

    assert.equal(exitCode, 0);
    assert.deepEqual(stdout, [`Release notes written: ${outputPath}`]);
    const markdown = await readFile(outputPath, "utf8");

    assert.match(markdown, /^# Release v0\.1\.0/m);
    assert.match(markdown, /Production smoke source:/);
    assert.match(markdown, /Project status artifact: `project-status-123`/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

function createReadyArtifact() {
  return {
    blockerCount: 0,
    blockers: [],
    generatedAt: "2026-08-28T00:00:00.000Z",
    releaseReady: true,
    schemaVersion: "release-evidence-check.v1",
    smoke: {
      path: "artifacts/production-smoke/smoke-report.json",
      releaseReady: true,
      source: createReadySmokeSource(),
      status: "ready",
      summary: {
        checkCount: 42,
        failedCheckCount: 0,
        productionReady: true,
        status: "passed",
      },
      traceability: [],
    },
    status: "ready",
    visual: {
      acceptedComponentCount: 6,
      acceptedViewportCount: 12,
      componentCount: 6,
      errorCount: 0,
      issueCount: 0,
      issues: [],
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      pendingComponents: [],
      pendingViewports: [],
      status: "accepted",
      viewportCount: 12,
      warningCount: 0,
    },
  };
}
