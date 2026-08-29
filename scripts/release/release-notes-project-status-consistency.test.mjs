import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import test from "node:test";
import { readProjectStatusArtifact } from "./release-notes.mjs";
import { assertReleaseNotesProjectStatusConsistency } from "./release-notes-project-status-consistency.mjs";

test("release notes reads validated project status artifacts", async () => {
  const root = `tmp/release-notes-project-status-${process.pid}-${Date.now()}`;
  const artifactPath = `${root}/project-status.json`;

  await rm(root, { force: true, recursive: true });
  mkdirSync(root, { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(createProjectStatus())}\n`);

  try {
    const artifact = await readProjectStatusArtifact(artifactPath);

    assert.equal(artifact.schemaVersion, "project-status.v1");
    assert.equal(artifact.releaseReady, true);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("release notes project status consistency accepts matching gates", () => {
  assert.doesNotThrow(() =>
    assertReleaseNotesProjectStatusConsistency(
      createReleaseArtifact(),
      createProjectStatus(),
    ),
  );
});

test("release notes project status consistency rejects ready mismatches", () => {
  assert.throws(
    () =>
      assertReleaseNotesProjectStatusConsistency(
        createReleaseArtifact(),
        createProjectStatus({
          releaseReady: false,
          status: "needs-evidence",
        }),
      ),
    /project status releaseReady must match release-evidence-check\.v1/,
  );
});

test("release notes project status consistency rejects visual count mismatches", () => {
  assert.throws(
    () =>
      assertReleaseNotesProjectStatusConsistency(
        createReleaseArtifact(),
        createProjectStatus({
          releaseGate: {
            ...createProjectStatus().releaseGate,
            visual: {
              ...createProjectStatus().releaseGate.visual,
              acceptedViewportCount: 11,
            },
          },
        }),
      ),
    /project status releaseGate\.visual\.acceptedViewportCount must match release-evidence-check\.v1/,
  );
});

function createReleaseArtifact() {
  return {
    blockerCount: 0,
    releaseReady: true,
    smoke: {
      path: "artifacts/production-smoke/smoke-report.json",
      status: "ready",
      summary: {
        status: "passed",
      },
    },
    visual: {
      acceptedComponentCount: 6,
      acceptedViewportCount: 12,
      artifactCheck: undefined,
      componentCount: 6,
      checklist: {
        pendingTaskCount: 0,
        pendingViewportCount: 0,
      },
      pendingComponents: [],
      pendingViewports: [],
      status: "accepted",
      viewportCount: 12,
    },
  };
}

function createProjectStatus(overrides = {}) {
  return {
    completedMilestones: ["MVP release evidence tooling is wired."],
    completionSummary: {
      localMvpScope: "implemented",
      releaseDecision: "ready-to-release",
      releaseEvidenceStatus: "ready",
      summary:
        "MVP implementation and retained release evidence are ready for release notes.",
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
      source: "CI verify job and local package scripts",
    },
    nextActionCount: 1,
    nextActionLimit: 1,
    nextActions: [
      {
        action: "Run pnpm release:notes.",
        area: "Release Notes",
        label: "Generate release record",
      },
    ],
    phase: "MVP release verification",
    releaseGate: createReleaseGate(),
    releaseReady: true,
    schemaVersion: "project-status.v1",
    status: "release-ready",
    truncatedNextActionCount: 0,
    ...overrides,
  };
}

function createReleaseGate() {
  return {
    blockerCount: 0,
    smoke: {
      blockerCount: 0,
      path: "artifacts/production-smoke/smoke-report.json",
      status: "ready",
      summaryStatus: "passed",
    },
    visual: {
      acceptedComponentCount: 6,
      acceptedViewportCount: 12,
      artifactStatus: null,
      componentCount: 6,
      pendingComponentCount: 0,
      pendingTaskCount: 0,
      pendingViewportCount: 0,
      status: "accepted",
      viewportCount: 12,
    },
  };
}
