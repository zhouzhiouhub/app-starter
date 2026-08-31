import assert from "node:assert/strict";
import test from "node:test";
import { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact.mjs";
import { createReadySmokeSource } from "./release-notes-test-fixtures.mjs";

test("release notes validates visual checklist preview dimensions", () => {
  assert.doesNotThrow(() =>
    assertReleaseEvidenceCheckArtifact(
      createReleaseArtifactWithVisualTask({
        height: 1000,
        width: 1440,
      }),
    ),
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact(
        createReleaseArtifactWithVisualTask({
          height: 1000,
          width: "1440",
        }),
      ),
    /visual\.checklist\.pendingTasks\.expectedPreviewScreenshotSize\.width/,
  );
});

function createReleaseArtifactWithVisualTask(expectedPreviewScreenshotSize) {
  return {
    blockerCount: 1,
    blockers: [
      {
        action: "Attach visual evidence.",
        area: "Page Builder Visual",
        label: "Visual acceptance pending",
      },
    ],
    generatedAt: "2026-08-28T00:00:00.000Z",
    releaseReady: false,
    schemaVersion: "release-evidence-check.v1",
    smoke: createBlockedSmokeArtifact(),
    status: "blocked",
    visual: createPendingVisualArtifact(expectedPreviewScreenshotSize),
  };
}

function createBlockedSmokeArtifact() {
  return {
    path: null,
    releaseReady: false,
    source: createReadySmokeSource(),
    status: "blocked",
    summary: {
      checkCount: 0,
      failedCheckCount: 0,
      productionReady: false,
      status: "missing",
    },
    traceability: [],
  };
}

function createPendingVisualArtifact(expectedPreviewScreenshotSize) {
  return {
    acceptedComponentCount: 0,
    acceptedViewportCount: 0,
    checklist: {
      pendingTaskCount: 1,
      pendingTasks: [createVisualTask(expectedPreviewScreenshotSize)],
      pendingViewportCount: 1,
      readyViewportCount: 0,
      viewportCount: 12,
    },
    componentCount: 6,
    errorCount: 0,
    issueCount: 0,
    issues: [],
    manifestPath: "docs/development/page-builder-visual-acceptance.json",
    pendingComponents: ["hero-banner"],
    pendingViewports: ["hero-banner.desktop"],
    status: "needs-evidence",
    viewportCount: 12,
    warningCount: 0,
  };
}

function createVisualTask(expectedPreviewScreenshotSize) {
  return {
    commands: {
      capture: "pnpm visual:capture:fixture",
      importReference: "pnpm visual:references -- --write",
      measure: "pnpm visual:measure -- --write",
      verify: "pnpm visual:acceptance -- --require-accepted",
    },
    component: "hero-banner",
    designReference: null,
    expectedDesignReference:
      "docs/visual/page-builder-references/hero-banner-desktop.png",
    expectedPreviewScreenshot:
      "artifacts/visual/page-builder-visual-fixture-hero-banner-desktop.png",
    expectedPreviewScreenshotSize,
    missing: ["designReference"],
    missingCount: 1,
    previewScreenshot: null,
    status: "needs-evidence",
    viewport: "desktop",
  };
}
