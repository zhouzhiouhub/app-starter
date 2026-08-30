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
    /Page Builder Visual Artifact: complete \(5\/5 files, 12\/12 screenshots\)/,
  );
  assert.match(markdown, /## Readiness Checklist/);
  assert.match(markdown, /Production Smoke report: ready/);
  assert.doesNotMatch(
    markdown,
    /Production Smoke report: ready; detail:/u,
  );
  assert.match(
    markdown,
    / {2}- Detail: Report path: artifacts\/production-smoke\/smoke-report\.json/,
  );
  assert.match(markdown, /Page Builder Visual evidence: ready/);
  assert.match(
    markdown,
    / {2}- Detail: 6\/6 components, 12\/12 viewports, artifact complete/,
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
  assert.match(markdown, /Artifact files: 5\/5/);
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
    createBlockedProjectStatus(),
  );

  assert.match(markdown, /Status: blocked/);
  assert.match(markdown, /Mode: failure review draft/);
  assert.match(markdown, /failed evidence review only/);
  assert.match(markdown, /Project Status: needs-evidence \(1 blockers, 4 next actions\)/);
  assert.match(
    markdown,
    /Project Completion: not-ready \(implemented local MVP scope, needs-evidence evidence\)/,
  );
  assert.match(markdown, /## Project Next Actions/);
  assert.match(markdown, / {2}- Reference source: `docs\/visual\/page-builder-references`/);
  assert.match(markdown, /- Page Builder Visual: hero-banner\.desktop/);
  assert.match(markdown, /- \.\.\. and 1 more project next actions/);
  assert.doesNotMatch(markdown, /- Page Builder Visual: rich-text\.desktop/);
  assert.match(markdown, /Page Builder Visual: Visual acceptance pending/);
  assert.match(markdown, /Page Builder Visual evidence: needs-evidence/);
  assert.doesNotMatch(
    markdown,
    /Page Builder Visual evidence: needs-evidence; detail:/u,
  );
  assert.match(
    markdown,
    / {2}- Detail: 0\/6 components, 0\/12 viewports, artifact invalid/,
  );
  assert.match(
    markdown,
    / {2}- Action: Attach real visual evidence\./,
  );
  assert.match(
    markdown,
    / {2}- Bundle: `pnpm visual:artifact-bundle -- --artifact-dir reports\/visual\/page-builder-fixture`/,
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

function createBlockedProjectStatus() {
  return {
    completionSummary: {
      localMvpScope: "implemented",
      releaseDecision: "not-ready",
      releaseEvidenceStatus: "needs-evidence",
      summary:
        "MVP implementation is in release verification; final completion still requires retained production smoke and Page Builder visual acceptance evidence.",
    },
    nextActionCount: 4,
    nextActions: [
      createVisualNextAction("Visual acceptance pending", [
        ["Reference source", "docs/visual/page-builder-references"],
      ]),
      createVisualNextAction("hero-banner.desktop", [
        ["Capture", "pnpm visual:capture:fixture -- --write-manifest"],
      ]),
      createVisualNextAction("hero-banner.mobile", []),
      createVisualNextAction("rich-text.desktop", []),
    ],
    releaseGate: {
      blockerCount: 1,
      smoke: {
        path: "artifacts/production-smoke/smoke-report.json",
        status: "ready",
        summaryStatus: "passed",
      },
      visual: {
        acceptedComponentCount: 0,
        acceptedViewportCount: 0,
        artifactStatus: "invalid",
        componentCount: 6,
        pendingComponentCount: 2,
        pendingTaskCount: 0,
        pendingViewportCount: 2,
        status: "needs-evidence",
        viewportCount: 12,
      },
    },
    releaseReady: false,
    status: "needs-evidence",
  };
}

function createVisualNextAction(label, steps) {
  return {
    action: "Attach real visual evidence.",
    area: "Page Builder Visual",
    label,
    steps: steps.map(([stepLabel, value]) => ({ label: stepLabel, value })),
  };
}
