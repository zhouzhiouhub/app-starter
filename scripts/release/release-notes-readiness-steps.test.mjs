import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseNotesMarkdown,
  readReleaseNotesCliConfig,
} from "./release-notes.mjs";
import { createReleaseNotesHandoffSteps } from "./release-notes-handoff-steps.mjs";
import {
  createCompleteArtifactCheck,
  createReadySmokeSource,
} from "./release-notes-test-fixtures.mjs";

test("release notes render release record handoff steps", () => {
  const markdown = createReleaseNotesMarkdown(
    createReleaseNotesConfig(),
    createReadyReleaseArtifact(),
  );

  assert.match(markdown, /Release notes record: ready to generate/);
  assert.match(markdown, / {2}- Steps:/);
  assert.match(
    markdown,
    / {4}- Command: `pnpm release:notes -- --release-tag <tag> --workflow-run-url <url> --output docs\/releases\/<tag>\.md`/,
  );
  assert.match(
    markdown,
    / {4}- Evidence args: `--smoke-artifact production-smoke-report-<run_number>/,
  );
  assert.match(
    markdown,
    /--project-status artifacts\/release\/project-status\.json/,
  );
  assert.match(markdown, /--local-verification-run-url <main-ci-run-url>/);
  assert.match(
    markdown,
    /--local-verification-artifact local-verification-<run_number>/,
  );
  assert.match(markdown, / {4}- Local verification args:/);
  assert.match(markdown, / {4}- Project and visual args:/);
  assert.match(
    markdown,
    / {4}- Review args: `--storefront-url <url> --rollback-target <target>`/,
  );
  assert.match(markdown, / {4}- Keep artifact: `release-notes-<run_number>`/);
  assert.match(markdown, / {4}- Formal mode: `Run without --allow-blocked/);
});

function createReleaseNotesConfig() {
  return readReleaseNotesCliConfig([
    "--release-tag",
    "v0.1.0",
    "--workflow-run-url",
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
    "--local-verification-run-url",
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456788",
    "--local-verification-artifact",
    "local-verification-122",
    "--smoke-artifact",
    "production-smoke-report-123",
    "--preflight-artifact",
    "release-preflight-123",
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
  ]);
}

function createReadyReleaseArtifact() {
  return {
    blockerCount: 0,
    blockers: [],
    generatedAt: "2026-08-28T00:00:00.000Z",
    readinessChecklist: {
      itemCount: 3,
      items: [
        {
          action: null,
          detail: "Report path: artifacts/production-smoke/smoke-report.json",
          label: "Production Smoke report",
          status: "ready",
        },
        {
          action: null,
          detail:
            "6/6 components, 12/12 viewports, artifact complete (reports/visual/page-builder-fixture, 6/6 files, 12/12 screenshots)",
          label: "Page Builder Visual evidence",
          status: "ready",
        },
        {
          action:
            "Run pnpm release:notes with release tag and evidence names.",
          detail: null,
          label: "Release notes record",
          status: "ready to generate",
          steps: createReleaseNotesHandoffSteps(),
        },
      ],
      releaseReady: true,
    },
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
      artifactCheck: createCompleteArtifactCheck(),
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
