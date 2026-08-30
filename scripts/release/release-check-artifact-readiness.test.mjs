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
