import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseNotesMarkdown,
  readReleaseNotesCliConfig,
} from "./release-notes.mjs";
import {
  createCompleteArtifactCheck,
  createReadySmokeSource,
} from "./release-notes-test-fixtures.mjs";

test("release notes render required evidence and gate status", () => {
  const markdown = createReleaseNotesMarkdown(
    createReleaseNotesConfig(),
    createReadyReleaseArtifact(),
  );

  assert.match(markdown, /^# Release v0\.1\.0/m);
  assert.match(markdown, /Status: ready/);
  assert.match(markdown, /Mode: release sign-off/);
  assert.doesNotMatch(markdown, /failed evidence review only/);
  assert.match(
    markdown,
    /Production smoke artifact: `production-smoke-report-123`/,
  );
  assert.match(
    markdown,
    /Local verification run: https:\/\/github\.com\/zhouzhiouhub\/app-starter\/actions\/runs\/123456788/,
  );
  assert.match(
    markdown,
    /Local verification artifact: `local-verification-122`/,
  );
  assert.match(
    markdown,
    /Production smoke preflight artifact: `release-preflight-123`/,
  );
  assert.match(
    markdown,
    /Production smoke source: https:\/\/github\.com\/zhouzhiouhub\/app-starter\/actions\/runs\/123456789 \(0123456, run 123456789\)/,
  );
  assert.match(
    markdown,
    /Combined release artifact: `release-evidence-check-123`/,
  );
  assert.match(markdown, /Project status artifact: `project-status-123`/);
  assert.match(
    markdown,
    /Project status source: `artifacts\/release\/project-status\.json`/,
  );
  assert.match(
    markdown,
    /Page Builder Visual: accepted \(6\/6 components, 12\/12 viewports\)/,
  );
  assert.match(
    markdown,
    /Page Builder Visual Artifact: complete \(reports\/visual\/page-builder-fixture, 0 issues, 6\/6 files, 12\/12 screenshots, references ready, 0 missing, 12\/12 required source references available\)/,
  );
  assert.match(markdown, /## Readiness Checklist/);
  assert.match(markdown, /Production Smoke report: ready/);
  assert.doesNotMatch(markdown, /Production Smoke report: ready; detail:/u);
  assert.match(
    markdown,
    / {2}- Detail: Report path: artifacts\/production-smoke\/smoke-report\.json/,
  );
  assert.match(markdown, /Page Builder Visual evidence: ready/);
  assert.match(
    markdown,
    / {2}- Detail: 6\/6 components, 12\/12 viewports, artifact complete \(reports\/visual\/page-builder-fixture, 0 issues, 6\/6 files, 12\/12 screenshots, references ready \(0 missing, 0 updates, 12\/12 required source references available\)\)/,
  );
  assert.match(markdown, /Release notes record: ready to generate/);
  assert.match(
    markdown,
    /Manifest: `docs\/development\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(markdown, /Artifact check: complete/);
  assert.match(
    markdown,
    /Artifact dir: `reports\/visual\/page-builder-fixture`/,
  );
  assert.match(markdown, /Artifact issue count: 0/);
  assert.match(markdown, /Artifact files: 6\/6/);
  assert.match(markdown, /Artifact screenshots: 12\/12/);
  assert.match(markdown, /Reference import: ready/);
  assert.match(markdown, /Reference missing: 0/);
  assert.match(markdown, /Required source references: 12\/12 available \(12 ready\)/);
  assert.doesNotMatch(markdown, /### Missing Production Smoke Evidence/);
  assert.doesNotMatch(markdown, /### Missing Visual References/);
  assert.match(markdown, /Artifact issues: none/);
  assert.match(markdown, /Pending components: none/);
  assert.match(markdown, /Pending viewports: none/);
  assert.match(markdown, /Visual issues: none/);
  assert.match(markdown, /Rollback target: `main@abcdef1`/);
  assert.match(markdown, /- None/);
});

function createReadyReleaseArtifact() {
  return {
    blockerCount: 0,
    blockers: [],
    generatedAt: "2026-08-28T00:00:00.000Z",
    readinessChecklist: createReadyReadinessChecklist(),
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
      traceability: [
        {
          action: "R2/CDN traceability passed.",
          label: "R2/CDN",
          status: "passed",
        },
      ],
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

function createRequiredArgs() {
  return [
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
  ];
}

function createReleaseNotesConfig() {
  return readReleaseNotesCliConfig(createRequiredArgs());
}

function createReadyReadinessChecklist() {
  return {
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
          "6/6 components, 12/12 viewports, artifact complete (reports/visual/page-builder-fixture, 0 issues, 6/6 files, 12/12 screenshots, references ready (0 missing, 0 updates, 12/12 required source references available))",
        label: "Page Builder Visual evidence",
        status: "ready",
      },
      {
        action: "Run pnpm release:notes with release tag and evidence names.",
        detail: null,
        label: "Release notes record",
        status: "ready to generate",
      },
    ],
    releaseReady: true,
  };
}
