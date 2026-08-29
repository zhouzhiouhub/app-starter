import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseNotesMarkdown,
  readReleaseNotesCliConfig,
} from "./release-notes.mjs";
import {
  createCompleteArtifactCheck,
  createInvalidArtifactCheck,
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
  assert.match(markdown, /Production smoke artifact: `production-smoke-report-123`/);
  assert.match(
    markdown,
    /Production smoke source: https:\/\/github\.com\/zhouzhiouhub\/app-starter\/actions\/runs\/123456789 \(0123456, run 123456789\)/,
  );
  assert.match(markdown, /Combined release artifact: `release-evidence-check-123`/);
  assert.match(markdown, /Project status artifact: `project-status-123`/);
  assert.match(
    markdown,
    /Project status source: `artifacts\/release\/project-status\.json`/,
  );
  assert.match(markdown, /Page Builder Visual: accepted \(6\/6 components, 12\/12 viewports\)/);
  assert.match(
    markdown,
    /Page Builder Visual Artifact: complete \(3\/3 files, 12\/12 screenshots\)/,
  );
  assert.match(markdown, /## Readiness Checklist/);
  assert.match(
    markdown,
    /Production Smoke report: ready; detail: Report path: artifacts\/production-smoke\/smoke-report\.json/,
  );
  assert.match(
    markdown,
    /Page Builder Visual evidence: ready; detail: 6\/6 components, 12\/12 viewports, artifact complete/,
  );
  assert.match(markdown, /Release notes record: ready to generate/);
  assert.match(
    markdown,
    /Manifest: `docs\/development\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(markdown, /Artifact check: complete/);
  assert.match(markdown, /Artifact dir: `reports\/visual\/page-builder-fixture`/);
  assert.match(markdown, /Artifact files: 3\/3/);
  assert.match(markdown, /Artifact screenshots: 12\/12/);
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

test("release notes require ready evidence unless explicitly allowed", () => {
  const artifact = {
    blockerCount: 1,
    blockers: [
      {
        action: "Attach design references.",
        area: "Page Builder Visual",
        label: "Visual acceptance pending",
      },
    ],
    generatedAt: "2026-08-28T00:00:00.000Z",
    readinessChecklist: createBlockedReadinessChecklist(),
    releaseReady: false,
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
    status: "blocked",
    visual: {
      acceptedComponentCount: 0,
      acceptedViewportCount: 0,
      artifactCheck: createInvalidArtifactCheck(),
      componentCount: 6,
      errorCount: 0,
      issueCount: 1,
      issues: [
        {
          code: "record_needs_evidence",
          component: "hero-banner",
          message: "hero-banner is needs-evidence.",
          severity: "warning",
          viewport: null,
        },
      ],
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      pendingComponents: ["hero-banner", "rich-text"],
      pendingViewports: ["hero-banner.desktop", "hero-banner.mobile"],
      status: "needs-evidence",
      viewportCount: 12,
      warningCount: 1,
    },
  };

  assert.throws(
    () => createReleaseNotesMarkdown(createReleaseNotesConfig(), artifact),
    /Release notes require a ready release-evidence-check\.v1 artifact/,
  );

  const markdown = createReleaseNotesMarkdown(
    { ...createReleaseNotesConfig(), allowBlocked: true },
    artifact,
  );

  assert.match(markdown, /Status: blocked/);
  assert.match(markdown, /Mode: failure review draft/);
  assert.match(markdown, /failed evidence review only/);
  assert.match(markdown, /Page Builder Visual: Visual acceptance pending/);
  assert.match(
    markdown,
    /Page Builder Visual evidence: needs-evidence; detail: 0\/6 components, 0\/12 viewports, artifact invalid/,
  );
  assert.match(
    markdown,
    /bundle: pnpm visual:artifact-bundle -- --artifact-dir reports\/visual\/page-builder-fixture/,
  );
  assert.match(markdown, /Pending components: hero-banner, rich-text/);
  assert.match(
    markdown,
    /Pending viewports: hero-banner\.desktop, hero-banner\.mobile/,
  );
  assert.match(
    markdown,
    /Visual issue: hero-banner: record_needs_evidence \(warning\) - hero-banner is needs-evidence\./,
  );
  assert.match(
    markdown,
    /Artifact issue: unknown: missing_artifact_file \(error\) - capture report is missing\./,
  );
});

test("release notes command is exposed in package, CI, and release docs", async () => {
  const [packageJson, ciWorkflow, releaseChecklist] = await Promise.all([
    readText("package.json"),
    readText(".github/workflows/ci.yml"),
    readText("docs/development/release-checklist.md"),
  ]);

  assert.match(
    packageJson,
    /"release:notes": "node scripts\/release-notes\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm release:notes -- --help/);
  assert.match(releaseChecklist, /pnpm release:notes/);
  assert.match(
    releaseChecklist,
    /--project-status artifacts\/release\/project-status\.json/,
  );
  assert.match(
    releaseChecklist,
    /--project-status-artifact project-status-<run_number>/,
  );
});

function createRequiredArgs() {
  return [
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
        detail: "6/6 components, 12/12 viewports, artifact complete",
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

function createBlockedReadinessChecklist() {
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
        action: "Attach real visual evidence.",
        bundleCommand:
          "pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture",
        detail: "0/6 components, 0/12 viewports, artifact invalid",
        label: "Page Builder Visual evidence",
        status: "needs-evidence",
      },
      {
        action: "Wait until release evidence is ready.",
        detail: null,
        label: "Release notes record",
        status: "waiting for evidence",
      },
    ],
    releaseReady: false,
  };
}

async function readText(path) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
}
