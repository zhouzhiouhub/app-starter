import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseNotesMarkdown,
  readReleaseNotesCliConfig,
} from "./release-notes.mjs";
import {
  createInvalidArtifactCheck,
  createReadySmokeSource,
} from "./release-notes-test-fixtures.mjs";
import { formatProjectCompletionChecklist } from "./release-notes-project-completion-report.mjs";

test("release notes include the project completion checklist", () => {
  const markdown = createReleaseNotesMarkdown(
    createReleaseNotesConfig(),
    createBlockedReleaseArtifact(),
    createBlockedProjectStatus(),
  );

  assert.match(markdown, /## Project Completion Checklist/);
  assert.match(markdown, /Complete: 2\/4/);
  assert.match(markdown, /Needs evidence: 2\/4/);
  assert.match(markdown, /Local MVP implementation scope: complete/);
  assert.match(markdown, /Production Smoke release evidence: complete/);
  assert.match(
    markdown,
    /Page Builder visual acceptance evidence: needs-evidence/,
  );
  assert.match(markdown, /Next: Attach real visual evidence\./);
  assert.match(markdown, /Next steps:/);
  assert.match(
    markdown,
    /Reference report: `pnpm visual:references:check`/,
  );
});

test("project completion checklist formatter skips legacy project status", () => {
  assert.deepEqual(formatProjectCompletionChecklist({}), []);
});

function createReleaseNotesConfig() {
  return readReleaseNotesCliConfig([
    "--allow-blocked",
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

function createBlockedReleaseArtifact() {
  return {
    blockerCount: 1,
    blockers: [
      {
        action: "Attach real visual evidence.",
        area: "Page Builder Visual",
        label: "Visual acceptance pending",
      },
    ],
    generatedAt: "2026-08-28T00:00:00.000Z",
    readinessChecklist: {
      items: [
        {
          action: "Attach real visual evidence.",
          label: "Page Builder Visual evidence",
          status: "needs-evidence",
        },
      ],
      releaseReady: false,
    },
    releaseReady: false,
    smoke: createReadySmoke(),
    status: "blocked",
    visual: createPendingVisual(),
  };
}

function createReadySmoke() {
  return {
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
  };
}

function createPendingVisual() {
  return {
    acceptedComponentCount: 0,
    acceptedViewportCount: 0,
    artifactCheck: createInvalidArtifactCheck(),
    checklist: {
      pendingTaskCount: 2,
      pendingViewportCount: 2,
    },
    componentCount: 6,
    issues: [],
    manifestPath: "docs/development/page-builder-visual-acceptance.json",
    pendingComponents: ["hero-banner"],
    pendingViewports: ["hero-banner.desktop", "hero-banner.mobile"],
    status: "needs-evidence",
    viewportCount: 12,
  };
}

function createBlockedProjectStatus() {
  return {
    completionChecklist: {
      completeCount: 2,
      itemCount: 4,
      items: [
        createCompletionItem("Local MVP implementation scope", "complete"),
        createCompletionItem("Production Smoke release evidence", "complete"),
        createCompletionItem(
          "Page Builder visual acceptance evidence",
          "needs-evidence",
          "Attach real visual evidence.",
          [
            {
              label: "Reference report",
              value:
                "pnpm visual:references:check",
            },
          ],
        ),
        createCompletionItem(
          "Page Builder visual artifact bundle",
          "needs-evidence",
          "Refresh retained fixture evidence.",
        ),
      ],
      needsEvidenceCount: 2,
    },
    nextActionCount: 1,
    nextActions: [],
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
        artifactCheck: createInvalidArtifactCheckSummary(),
        artifactStatus: "invalid",
        componentCount: 6,
        pendingComponentCount: 1,
        pendingTaskCount: 2,
        pendingViewportCount: 2,
        status: "needs-evidence",
        viewportCount: 12,
      },
    },
    releaseReady: false,
    status: "needs-evidence",
  };
}

function createInvalidArtifactCheckSummary() {
  const check = createInvalidArtifactCheck();

  return {
    artifactDir: check.artifactDir,
    expectedScreenshotCount: check.expectedScreenshotCount,
    presentRequiredFileCount: check.presentRequiredFileCount,
    presentScreenshotCount: check.presentScreenshotCount,
    requiredFileCount: check.requiredFileCount,
    status: check.status,
  };
}

function createCompletionItem(label, status, nextAction = null, nextSteps = []) {
  return {
    evidence: `${label} is ${status}.`,
    label,
    nextAction,
    nextSteps,
    status,
  };
}
