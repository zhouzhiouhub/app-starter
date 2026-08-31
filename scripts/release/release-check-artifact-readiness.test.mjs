import assert from "node:assert/strict";
import test from "node:test";
import { createReleaseEvidenceCheckArtifact } from "./release-check.mjs";

test("release check artifact includes ready checklist tasks", () => {
  const artifact = createReleaseEvidenceCheckArtifact(createReadyCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(artifact.readinessChecklist.releaseReady, true);
  assert.equal(artifact.readinessChecklist.itemCount, 3);
  assert.deepEqual(readChecklistStatuses(artifact), [
    "Production Smoke report:ready",
    "Page Builder Visual evidence:ready",
    "Release notes record:ready to generate",
  ]);
  const releaseNotesItem = artifact.readinessChecklist.items.find(
    (item) => item.label === "Release notes record",
  );
  const visualItem = artifact.readinessChecklist.items.find(
    (item) => item.label === "Page Builder Visual evidence",
  );

  assert.equal(
    visualItem?.detail,
    "6/6 components, 12/12 viewports, artifact complete (reports/visual/page-builder-fixture, 0 issues, 6/6 files, 12/12 screenshots, references ready (0 missing, 0 updates))",
  );
  assert.deepEqual(
    releaseNotesItem.steps.map((step) => step.label),
    [
      "Command",
      "Evidence args",
      "Local verification args",
      "Project and visual args",
      "Review args",
      "Input evidence",
      "Output",
      "Keep artifact",
      "Formal mode",
    ],
  );
  assert.match(releaseNotesItem.steps[1].value, /--release-artifact/);
  assert.match(
    releaseNotesItem.steps[2].value,
    /--local-verification-artifact local-verification-<run_number>/,
  );
  assert.doesNotMatch(releaseNotesItem.steps[1].value, /\.\.\./);
  assert.doesNotMatch(releaseNotesItem.steps[2].value, /\.\.\./);
  assert.doesNotMatch(releaseNotesItem.steps[3].value, /\.\.\./);
});

test("release check artifact includes blocked checklist actions", () => {
  const artifact = createReleaseEvidenceCheckArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });
  const visualItem = artifact.readinessChecklist.items.find(
    (item) => item.label === "Page Builder Visual evidence",
  );

  assert.equal(artifact.readinessChecklist.releaseReady, false);
  assert.equal(visualItem?.status, "needs-evidence");
  assert.equal(
    visualItem?.detail,
    "0/6 components, 0/12 viewports, artifact invalid (reports/visual/page-builder-fixture, 1 issues, 5/6 files, 0/12 screenshots, references invalid (12 missing, 0 updates))",
  );
  assert.match(visualItem?.action, /pnpm visual:acceptance -- --checklist/);
  assert.equal(
    visualItem?.bundleCommand,
    "pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture",
  );
});

function readChecklistStatuses(artifact) {
  return artifact.readinessChecklist.items.map(
    (item) => `${item.label}:${item.status}`,
  );
}

function createReadyCheck() {
  return {
    blockers: [],
    releaseReady: true,
    smoke: createSmokeCheck({ releaseReady: true }),
    visual: createVisualCheck({ status: "accepted" }),
    visualArtifact: createCompleteVisualArtifact(),
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  };
}

function createBlockedCheck() {
  return {
    blockers: [
      {
        action: "Run the Production Smoke workflow.",
        area: "Production Smoke",
        label: "Production smoke artifact missing",
      },
      {
        action: "Run pnpm visual:acceptance -- --checklist.",
        area: "Page Builder Visual",
        label: "Visual acceptance pending",
      },
    ],
    releaseReady: false,
    smoke: createSmokeCheck({ releaseReady: false }),
    visual: createVisualCheck({ status: "needs-evidence" }),
    visualArtifact: createInvalidVisualArtifact(),
    visualArtifactDir: "reports/visual/page-builder-fixture",
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  };
}

function createSmokeCheck(input) {
  return {
    groups: [],
    path: input.releaseReady
      ? "artifacts/production-smoke/smoke-report.json"
      : null,
    releaseReady: input.releaseReady,
    source: input.releaseReady
      ? {
          commitSha: "0123456789abcdef0123456789abcdef01234567",
          repository: "zhouzhiouhub/app-starter",
          runId: "123456789",
          runNumber: "123",
          workflow: "Production Smoke",
          workflowRunUrl:
            "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
        }
      : {
          commitSha: null,
          repository: null,
          runId: null,
          runNumber: null,
          workflow: null,
          workflowRunUrl: null,
        },
    summary: {
      checkCount: input.releaseReady ? 3 : 0,
      failedCheckCount: input.releaseReady ? 0 : 1,
      productionReady: input.releaseReady,
      status: input.releaseReady ? "passed" : "missing",
    },
  };
}

function createVisualCheck(input) {
  const accepted = input.status === "accepted";

  return {
    acceptedComponentCount: accepted ? 6 : 0,
    acceptedViewportCount: accepted ? 12 : 0,
    componentCount: 6,
    errorCount: accepted ? 0 : 6,
    issues: [],
    records: [],
    status: input.status,
    viewportCount: 12,
    warningCount: 0,
  };
}

function createCompleteVisualArtifact() {
  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 0,
    issues: [],
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    referenceImport: createReferenceImportSummary(true),
    requiredFileCount: 6,
    status: "complete",
  };
}

function createInvalidVisualArtifact() {
  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 1,
    issues: [],
    presentRequiredFileCount: 5,
    presentScreenshotCount: 0,
    referenceImport: createReferenceImportSummary(false),
    requiredFileCount: 6,
    status: "invalid",
  };
}

function createReferenceImportSummary(complete) {
  return {
    complete,
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    missingCount: complete ? 0 : 12,
    missingReferences: complete ? [] : ["docs/visual/page-builder-references/hero-banner-desktop.png"],
    sourceDir: "docs/visual/page-builder-references",
    sourceDirStatus: "ready",
    status: complete ? "ready" : "invalid",
    updated: false,
    updateCount: 0,
  };
}
