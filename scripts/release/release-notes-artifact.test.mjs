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

function createReadyReleaseArtifact() {
  return {
    blockerCount: 0,
    blockers: [],
    generatedAt: "2026-08-28T00:00:00.000Z",
    readinessChecklist: {
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
          detail: "6/6 components, 12/12 viewports",
          label: "Page Builder Visual evidence",
          status: "ready",
        },
        {
          action:
            "Run pnpm release:notes with release tag, workflow run URL, artifact names, storefront URL, and rollback target.",
          detail: null,
          label: "Release notes record",
          status: "ready to generate",
        },
      ],
      releaseReady: true,
    },
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
      artifactCheck: {
        artifactDir: "reports/visual/page-builder-fixture",
        expectedScreenshotCount: 12,
        issueCount: 0,
        issues: [],
        presentRequiredFileCount: 3,
        presentScreenshotCount: 12,
        requiredFileCount: 3,
        status: "complete",
      },
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
      checklist: {
        pendingTaskCount: 0,
        pendingTasks: [],
        pendingViewportCount: 0,
        readyViewportCount: 12,
        viewportCount: 12,
      },
    },
  };
}

function createReadySmokeSource() {
  return {
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    repository: "zhouzhiouhub/app-starter",
    runId: "123456789",
    runNumber: "123",
    workflow: "Production Smoke",
    workflowRunUrl:
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
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
