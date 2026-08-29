import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { runReleaseNotesCli } from "../release-notes.mjs";
import { createReadySmokeSource } from "./release-notes-test-fixtures.mjs";

test("release notes CLI writes a Markdown release record", async () => {
  const root = `tmp/release-notes-test-${process.pid}-${Date.now()}`;
  const projectStatusPath = `${root}/project-status.json`;
  const releaseCheckPath = `${root}/release-check.json`;
  const outputPath = `${root}/v0.1.0.md`;
  const stdout = [];

  await rm(root, { force: true, recursive: true });
  mkdirSync(root, { recursive: true });
  writeFileSync(releaseCheckPath, `${JSON.stringify(createReadyArtifact())}\n`);
  writeFileSync(
    projectStatusPath,
    `${JSON.stringify(createReadyProjectStatus())}\n`,
  );

  try {
    const exitCode = await runReleaseNotesCli(
      [
        "--release-tag",
        "v0.1.0",
        "--workflow-run-url",
        "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
        "--smoke-artifact",
        "production-smoke-report-123",
        "--preflight-artifact",
        "release-preflight-123",
        "--release-artifact",
        "release-evidence-check-123",
        "--project-status",
        projectStatusPath,
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
    assert.match(
      markdown,
      /Production smoke preflight artifact: `release-preflight-123`/,
    );
    assert.match(markdown, /Project status artifact: `project-status-123`/);
    assert.match(
      markdown,
      /Project Status: release-ready \(0 blockers, 1 next actions\)/,
    );
    assert.match(
      markdown,
      /Project Completion: ready-to-release \(implemented local MVP scope, ready evidence\)/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("release notes CLI help documents blocked draft next actions", async () => {
  const stdout = [];
  const exitCode = await runReleaseNotesCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });
  const help = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.match(help, /--allow-blocked/);
  assert.match(help, /Project Next Actions/);
  assert.match(help, /project-status\.v1/);
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

function createReadyProjectStatus() {
  return {
    completedMilestones: ["MVP release evidence tooling is wired."],
    completionSummary: {
      localMvpScope: "implemented",
      releaseDecision: "ready-to-release",
      releaseEvidenceStatus: "ready",
      summary:
        "MVP implementation and retained release evidence are ready for release notes.",
    },
    generatedAt: "2026-08-28T00:00:00.000Z",
    localVerification: {
      commandCount: 1,
      commands: [
        {
          command: "pnpm build",
          label: "Build",
          status: "configured",
        },
      ],
      source: "CI verify job and local package scripts",
    },
    nextActionCount: 1,
    nextActionLimit: 1,
    nextActions: [
      {
        action: "Run pnpm release:notes.",
        area: "Release Notes",
        label: "Generate release record",
      },
    ],
    phase: "MVP release verification",
    releaseGate: {
      blockerCount: 0,
      smoke: {
        blockerCount: 0,
        path: "artifacts/production-smoke/smoke-report.json",
        status: "ready",
        summaryStatus: "passed",
      },
      visual: {
        acceptedComponentCount: 6,
        acceptedViewportCount: 12,
        artifactStatus: null,
        componentCount: 6,
        pendingComponentCount: 0,
        pendingTaskCount: 0,
        pendingViewportCount: 0,
        status: "accepted",
        viewportCount: 12,
      },
    },
    releaseReady: true,
    schemaVersion: "project-status.v1",
    status: "release-ready",
    truncatedNextActionCount: 0,
  };
}
