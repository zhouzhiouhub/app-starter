import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProjectStatusArtifact,
  createProjectStatusArtifact,
} from "./project-status.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeDispatchValidationCommand,
  createProductionSmokeManualDispatchInstruction,
} from "../smoke/production-smoke-dispatch-command.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project status artifact carries structured missing smoke evidence", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-31T00:00:00.000Z",
  });

  assertProjectStatusArtifact(artifact);
  assert.equal(artifact.releaseGate.smoke.status, "blocked");
  assert.equal(artifact.releaseGate.smoke.missingEvidence.status, "blocked");
  assert.equal(
    artifact.releaseGate.smoke.missingEvidence.summaryStatus,
    "missing",
  );
  assert.equal(
    artifact.releaseGate.smoke.missingEvidence.requiredEvidenceCount,
    11,
  );
  assert.equal(
    artifact.releaseGate.smoke.missingEvidence.workflowInputCount,
    14,
  );
  assert.deepEqual(
    artifact.releaseGate.smoke.missingEvidence.requiredEvidence.slice(0, 4),
    [
      {
        label: "Workflow",
        value: "GitHub Actions Production Smoke against the production environment",
      },
      {
        label: "Workflow manual dispatch",
        value: createProductionSmokeManualDispatchInstruction(),
      },
      {
        label: "Workflow dispatch validation",
        value: createProductionSmokeDispatchValidationCommand(),
      },
      {
        label: "Workflow dispatch template",
        value: createProductionSmokeDispatchCommand(),
      },
    ],
  );
  assert.deepEqual(
    artifact.releaseGate.smoke.missingEvidence.workflowInputs.find(
      (input) => input.name === "visual_artifact_name",
    ),
    {
      description: "Page Builder Visual artifact name",
      name: "visual_artifact_name",
      required: false,
      value: "page-builder-visual-fixture-<run_number>",
    },
  );
});

test("project status artifact validates missing smoke evidence counts", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-31T00:00:00.000Z",
  });

  artifact.releaseGate.smoke.missingEvidence.workflowInputCount = 0;

  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /workflowInputCount must match workflowInputs length/,
  );
});
