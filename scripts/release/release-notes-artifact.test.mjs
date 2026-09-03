import assert from "node:assert/strict";
import test from "node:test";
import { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact.mjs";
import {
  createReadyReleaseArtifact,
  createVisualIssue,
} from "./release-notes-test-fixtures.mjs";

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
        smoke: { ...artifact.smoke, source: null },
      }),
    /smoke\.source must be an object/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        smoke: {
          ...artifact.smoke,
          source: { ...artifact.smoke.source, commitSha: 42 },
        },
      }),
    /smoke\.source\.commitSha must be a string or null/,
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
        visual: {
          ...artifact.visual,
          failedMeasurementViewportCount: artifact.visual.viewportCount + 1,
        },
      }),
    /visual\.failedMeasurementViewportCount must not exceed visual\.viewportCount/,
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
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          checklist: {
            ...artifact.visual.checklist,
            pendingTaskCount: 1,
            pendingViewportCount: 1,
            pendingTasks: [null],
          },
        },
      }),
    /visual\.checklist\.pendingTasks must contain objects/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        readinessChecklist: {
          ...artifact.readinessChecklist,
          items: [null],
        },
      }),
    /readinessChecklist\.items must contain objects/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        readinessChecklist: {
          ...artifact.readinessChecklist,
          items: [
            {
              ...artifact.readinessChecklist.items[1],
              bundleCommand: 42,
            },
          ],
        },
      }),
    /readinessChecklist\.items\.bundleCommand must be a string or null/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        readinessChecklist: {
          ...artifact.readinessChecklist,
          items: [
            {
              ...artifact.readinessChecklist.items[2],
              steps: [{ label: "Command" }],
            },
          ],
        },
      }),
    /readinessChecklist\.items\.steps\.value must be a string/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          artifactCheck: {
            ...artifact.visual.artifactCheck,
            presentScreenshotCount:
              artifact.visual.artifactCheck.expectedScreenshotCount + 1,
          },
        },
      }),
    /visual\.artifactCheck\.presentScreenshotCount must not exceed/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          artifactCheck: {
            ...artifact.visual.artifactCheck,
            referenceImport: {
              ...artifact.visual.artifactCheck.referenceImport,
              missingCount: 1,
              missingReferences: [],
            },
          },
        },
      }),
    /complete referenceImport must have no missing references/,
  );

  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          artifactCheck: {
            ...artifact.visual.artifactCheck,
            referenceImport: {
              ...artifact.visual.artifactCheck.referenceImport,
              complete: false,
              missingCount: 0,
              missingReferences: ["docs/visual/page-builder-references/hero-banner.png"],
              status: "invalid",
            },
          },
        },
      }),
    /missingReferences\.length must not exceed missingCount/,
  );

  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          artifactCheck: {
            ...artifact.visual.artifactCheck,
            referenceImport: {
              ...artifact.visual.artifactCheck.referenceImport,
              requiredReferenceStatusCounts: {
                invalid: 0,
                missing: 0,
                ready: 11,
                updated: 0,
                wouldUpdate: 0,
              },
            },
          },
        },
      }),
    /requiredReferenceStatusCounts must match requiredReferenceEntryCount/,
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
        smoke: {
          ...artifact.smoke,
          source: { ...artifact.smoke.source, workflowRunUrl: null },
        },
      }),
    /ready evidence must include production smoke source metadata/,
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
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          failedMeasurementCount: 1,
          failedMeasurementViewportCount: 1,
          firstFailedMeasurement:
            "hero-banner.desktop: visualMatchPercent >= 95 (current 0.15)",
        },
      }),
    /accepted visual evidence must have full counts, no pending evidence, and no issues/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          artifactCheck: {
            ...artifact.visual.artifactCheck,
            issueCount: 1,
            issues: [
              {
                code: "missing_artifact_file",
                component: null,
                message: "capture report is missing.",
                severity: "error",
                viewport: null,
              },
            ],
            status: "invalid",
          },
        },
      }),
    /ready evidence must include accepted visual evidence/,
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
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        readinessChecklist: {
          ...artifact.readinessChecklist,
          releaseReady: false,
        },
      }),
    /readinessChecklist\.releaseReady must match releaseReady/,
  );
});
