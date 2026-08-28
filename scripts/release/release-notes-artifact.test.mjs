import assert from "node:assert/strict";
import test from "node:test";
import { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact.mjs";

test("release notes validates release evidence artifact shape", () => {
  const artifact = createReadyReleaseArtifact();

  assert.doesNotThrow(() => assertReleaseEvidenceCheckArtifact(artifact));
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        smoke: { ...artifact.smoke, summary: null },
      }),
    /smoke\.summary must be an object/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          acceptedViewportCount: artifact.visual.viewportCount + 1,
        },
      }),
    /visual\.acceptedViewportCount must not exceed visual\.viewportCount/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        blockers: [null],
      }),
    /blockers must contain objects/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: { ...artifact.visual, pendingComponents: ["hero-banner", 42] },
      }),
    /visual\.pendingComponents must be a string array/,
  );
});

test("release notes validates ready release evidence consistency", () => {
  const artifact = createReadyReleaseArtifact();

  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        blockers: [
          {
            action: "Fix smoke evidence.",
            area: "Production Smoke",
            label: "Blocked",
          },
        ],
        blockerCount: 1,
      }),
    /ready evidence must have no blockers/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        smoke: {
          ...artifact.smoke,
          summary: { ...artifact.smoke.summary, failedCheckCount: 1 },
        },
      }),
    /ready smoke must have productionReady true and zero failed checks/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          acceptedViewportCount: artifact.visual.viewportCount - 1,
        },
      }),
    /accepted visual evidence must have full counts, no pending evidence, and no issues/,
  );
});

test("release notes validates subfield count consistency", () => {
  const artifact = createReadyReleaseArtifact();

  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        smoke: { ...artifact.smoke, status: "blocked" },
      }),
    /smoke\.status must match smoke\.releaseReady/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          issueCount: 0,
          issues: [createVisualIssue()],
        },
      }),
    /visual\.issueCount must cover serialized visual issues/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          issues: [],
          pendingComponents: ["hero-banner"],
        },
      }),
    /accepted visual evidence must have full counts, no pending evidence, and no issues/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        blockerCount: 0,
        releaseReady: false,
        status: "blocked",
        blockers: [
          {
            action: "Fix smoke evidence.",
            area: "Production Smoke",
            label: "Blocked",
          },
        ],
      }),
    /blockerCount must cover serialized blockers/,
  );
});

function createReadyReleaseArtifact() {
  return {
    blockerCount: 0,
    blockers: [],
    generatedAt: "2026-08-28T00:00:00.000Z",
    releaseReady: true,
    schemaVersion: "release-evidence-check.v1",
    smoke: {
      path: "artifacts/production-smoke/smoke-report.json",
      releaseReady: true,
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

function createVisualIssue() {
  return {
    code: "record_needs_evidence",
    component: "hero-banner",
    message: "hero-banner is needs-evidence.",
    severity: "error",
    viewport: null,
  };
}
