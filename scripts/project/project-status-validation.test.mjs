import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import test from "node:test";
import {
  assertProjectStatusArtifact,
  projectStatusSchemaVersion,
  writeProjectStatusArtifact,
} from "./project-status.mjs";

test("project status artifact validation accepts complete blocked status", () => {
  assert.doesNotThrow(() => assertProjectStatusArtifact(createArtifact()));
});

test("project status artifact validation rejects inconsistent status", () => {
  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...createArtifact(),
        releaseReady: true,
      }),
    /status must match releaseReady/,
  );

  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...createArtifact(),
        completionSummary: {
          ...createArtifact().completionSummary,
          releaseDecision: "ready-to-release",
        },
      }),
    /completionSummary\.releaseDecision must match releaseReady/,
  );

  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...createArtifact(),
        completionSummary: {
          ...createArtifact().completionSummary,
          releaseEvidenceStatus: "ready",
        },
      }),
    /completionSummary\.releaseEvidenceStatus must match releaseReady/,
  );
});

test("project status artifact validation rejects incomplete counts", () => {
  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...createArtifact(),
        nextActionCount: 0,
      }),
    /nextActionCount must cover serialized actions/,
  );

  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...createArtifact(),
        localVerification: {
          ...createArtifact().localVerification,
          commandCount: 2,
        },
      }),
    /localVerification\.commandCount must match commands length/,
  );

  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...createArtifact(),
        truncatedNextActionCount: 1,
      }),
    /truncatedNextActionCount must match hidden actions/,
  );
});

test("project status artifact validation accepts legacy local verification shape", () => {
  const artifact = createArtifact();

  delete artifact.localVerification.handoff;
  delete artifact.localVerification.shortcut;

  assert.doesNotThrow(() => assertProjectStatusArtifact(artifact));
});

test("project status artifact validation rejects invalid handoff metadata", () => {
  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...createArtifact(),
        localVerification: {
          ...createArtifact().localVerification,
          shortcut: "",
        },
      }),
    /localVerification\.shortcut must be a string/,
  );

  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...createArtifact(),
        localVerification: {
          ...createArtifact().localVerification,
          handoff: {
            jsonPath: "tmp/project-status.json",
          },
        },
      }),
    /localVerification\.handoff\.markdownPath must be a string/,
  );
});

test("project status artifact validation rejects invalid visual artifact counts", () => {
  const artifact = createArtifact();
  artifact.releaseGate.visual.artifactStatus = "complete";
  artifact.releaseGate.visual.artifactCheck = {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 13,
    requiredFileCount: 6,
    status: "complete",
  };

  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /artifactCheck\.presentScreenshotCount must not exceed/,
  );
});

test("project status artifact validation rejects complete visual artifact issues", () => {
  const artifact = createArtifact();
  artifact.releaseGate.visual.artifactStatus = "complete";
  artifact.releaseGate.visual.artifactCheck = {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 1,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    requiredFileCount: 6,
    status: "complete",
  };

  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /complete releaseGate\.visual\.artifactCheck must have no issues/,
  );
});

test("project status artifact validation rejects inconsistent reference import", () => {
  const artifact = createArtifact();
  artifact.releaseGate.visual.artifactStatus = "complete";
  artifact.releaseGate.visual.artifactCheck = {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 0,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    referenceImport: {
      complete: true,
      manifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      missingCount: 1,
      missingReferences: [],
      sourceDir: "docs/visual/page-builder-references",
      sourceDirStatus: "ready",
      status: "ready",
      updated: false,
      updateCount: 0,
    },
    requiredFileCount: 6,
    status: "complete",
  };

  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /complete referenceImport must have no missing references/,
  );

  artifact.releaseGate.visual.artifactCheck.referenceImport = {
    ...artifact.releaseGate.visual.artifactCheck.referenceImport,
    complete: false,
    missingCount: 0,
    missingReferences: ["docs/visual/page-builder-references/hero-banner.png"],
    status: "invalid",
  };
  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /missingReferences\.length must not exceed missingCount/,
  );

  artifact.releaseGate.visual.artifactCheck.referenceImport = {
    ...artifact.releaseGate.visual.artifactCheck.referenceImport,
    missingCount: 12,
    missingReferences: [],
    requiredReferenceCount: 12,
    requiredReferenceEntryCount: 12,
    requiredReferenceStatusCounts: {
      invalid: 0,
      missing: 11,
      ready: 0,
      updated: 0,
      wouldUpdate: 0,
    },
  };
  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /requiredReferenceStatusCounts must match requiredReferenceEntryCount/,
  );
});

test("project status writer validates artifacts before writing", async () => {
  const outputPath = `tmp/project-status-invalid-${process.pid}-${Date.now()}.json`;

  await rm(outputPath, { force: true });

  try {
    await assert.rejects(
      () =>
        writeProjectStatusArtifact(outputPath, {
          ...createArtifact(),
          schemaVersion: "project-status.v0",
        }),
      /schemaVersion must be project-status\.v1/,
    );
    assert.equal(existsSync(outputPath), false);
  } finally {
    await rm(outputPath, { force: true });
  }
});

function createArtifact() {
  return {
    completedMilestones: ["MVP release evidence tooling is wired."],
    completionSummary: {
      localMvpScope: "implemented",
      releaseDecision: "not-ready",
      releaseEvidenceStatus: "needs-evidence",
      summary:
        "MVP implementation is in release verification; final completion still requires retained production smoke and Page Builder visual acceptance evidence.",
    },
    generatedAt: "2026-08-28T00:00:00.000Z",
    localVerification: {
      commandCount: 1,
      commands: [
        {
          command: "pnpm build",
          label: "Build",
          status: "configured",
        },
      ],
      handoff: {
        jsonPath: "tmp/project-status.json",
        markdownPath: "tmp/project-status-handoff.md",
      },
      shortcut: "pnpm run verify:local",
      source: "CI verify job and local package scripts",
    },
    nextActionCount: 1,
    nextActionLimit: 8,
    nextActions: [
      {
        action: "Run the Production Smoke workflow.",
        area: "Production Smoke",
        label: "Production smoke artifact missing",
      },
    ],
    phase: "MVP release verification",
    releaseGate: {
      blockerCount: 1,
      smoke: {
        blockerCount: 1,
        path: null,
        status: "blocked",
        summaryStatus: "missing",
      },
      visual: {
        acceptedComponentCount: 0,
        acceptedViewportCount: 0,
        artifactStatus: null,
        componentCount: 6,
        pendingComponentCount: 6,
        pendingTaskCount: 12,
        pendingViewportCount: 12,
        status: "needs-evidence",
        viewportCount: 12,
      },
    },
    releaseReady: false,
    schemaVersion: projectStatusSchemaVersion,
    status: "needs-evidence",
    truncatedNextActionCount: 0,
  };
}
