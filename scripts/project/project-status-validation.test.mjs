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
  };
}
