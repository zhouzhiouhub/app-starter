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

test("release notes require ready evidence unless explicitly allowed", () => {
  const artifact = createBlockedVisualReleaseArtifact();

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
  assert.match(
    markdown,
    /Project Status: needs-evidence \(1 blockers, 4 next actions\)/,
  );
  assert.match(
    markdown,
    /Project Completion: not-ready \(implemented local MVP scope, needs-evidence evidence\)/,
  );
  assert.match(markdown, /## Project Next Actions/);
  assert.match(
    markdown,
    / {2}- Reference source: `docs\/visual\/page-builder-references`/,
  );
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
    / {2}- Detail: 0\/6 components, 0\/12 viewports, artifact invalid \(reports\/visual\/page-builder-fixture, 1 issues, 5\/6 files, 0\/12 screenshots, references invalid \(12 missing, 0 updates, 0\/12 required source references available\)\)/,
  );
  assert.match(markdown, / {2}- Action: Attach real visual evidence\./);
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
  assert.match(markdown, /Reference import: invalid/);
  assert.match(markdown, /Reference missing: 12/);
  assert.match(markdown, /Required source references: 0\/12 available \(12 missing\)/);
  assert.match(markdown, /### Missing Visual References/);
  assert.match(markdown, /Source dir: `docs\/visual\/page-builder-references`/);
  assert.match(markdown, /Missing files: 12/);
  assert.match(
    markdown,
    /Reference missing files: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    markdown,
    /- `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.doesNotMatch(markdown, /### Missing Production Smoke Evidence/);
});

test("release notes failure drafts include missing smoke evidence", () => {
  const artifact = {
    ...createReadyReleaseArtifact(),
    blockerCount: 1,
    blockers: [
      {
        action:
          "Run pnpm smoke:request, validate with pnpm smoke:dispatch -- --inputs-json artifacts/production-smoke/production-smoke-dispatch-inputs.json --require-complete, then run the Production Smoke workflow.",
        area: "Production Smoke",
        label: "Production smoke artifact missing",
      },
    ],
    readinessChecklist: createMissingSmokeReadinessChecklist(),
    releaseReady: false,
    smoke: {
      ...createReadyReleaseArtifact().smoke,
      markdown: {
        issueCount: 1,
        issues: [
          {
            code: "smoke_report_markdown_missing",
            message: "Smoke report Markdown is missing.",
            severity: "error",
          },
        ],
        path: "artifacts/production-smoke/smoke-report.md",
        status: "missing",
      },
      releaseReady: false,
      status: "blocked",
      summary: {
        checkCount: 0,
        failedCheckCount: 0,
        productionReady: false,
        status: "missing",
      },
    },
    status: "blocked",
  };

  const markdown = createReleaseNotesMarkdown(
    { ...createReleaseNotesConfig(), allowBlocked: true },
    artifact,
  );

  assert.match(markdown, /### Missing Production Smoke Evidence/);
  assert.match(
    markdown,
    /Workflow: `GitHub Actions Production Smoke against the production environment`/,
  );
  assert.match(
    markdown,
    /Smoke report JSON: `artifacts\/production-smoke\/smoke-report\.json`/,
  );
  assert.match(
    markdown,
    /Markdown companion: `missing` \(`artifacts\/production-smoke\/smoke-report\.md`\)/,
  );
  assert.match(
    markdown,
    /Release evidence artifact: `release-evidence-check-<run_number>`/,
  );
  assert.doesNotMatch(markdown, /### Missing Visual References/);
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

function createBlockedVisualReleaseArtifact() {
  return {
    ...createReadyReleaseArtifact(),
    blockerCount: 1,
    blockers: [
      {
        action: "Attach design references.",
        area: "Page Builder Visual",
        label: "Visual acceptance pending",
      },
    ],
    readinessChecklist: createBlockedVisualReadinessChecklist(),
    releaseReady: false,
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

function createBlockedVisualReadinessChecklist() {
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
        detail:
          "0/6 components, 0/12 viewports, artifact invalid (reports/visual/page-builder-fixture, 1 issues, 5/6 files, 0/12 screenshots, references invalid (12 missing, 0 updates, 0/12 required source references available))",
        label: "Page Builder Visual evidence",
        status: "needs-evidence",
      },
      createBlockedReleaseNotesChecklistItem(),
    ],
    releaseReady: false,
  };
}

function createMissingSmokeReadinessChecklist() {
  return {
    itemCount: 3,
    items: [
      {
        action:
          "Run pnpm smoke:request, validate with pnpm smoke:dispatch -- --inputs-json artifacts/production-smoke/production-smoke-dispatch-inputs.json --require-complete, then run the Production Smoke workflow.",
        detail: "Report path: artifacts/production-smoke/smoke-report.json",
        label: "Production Smoke report",
        status: "blocked",
      },
      {
        action: null,
        detail:
          "6/6 components, 12/12 viewports, artifact complete (reports/visual/page-builder-fixture, 0 issues, 6/6 files, 12/12 screenshots, references ready (0 missing, 0 updates, 12/12 required source references available))",
        label: "Page Builder Visual evidence",
        status: "ready",
      },
      createBlockedReleaseNotesChecklistItem(),
    ],
    releaseReady: false,
  };
}

function createBlockedReleaseNotesChecklistItem() {
  return {
    action: "Wait until release evidence is ready.",
    detail: null,
    label: "Release notes record",
    status: "waiting for evidence",
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
