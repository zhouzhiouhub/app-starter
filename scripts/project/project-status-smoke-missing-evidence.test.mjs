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
  createProductionSmokeRequestCommand,
} from "../smoke/production-smoke-dispatch-command.mjs";
import {
  defaultProductionSmokeDispatchInputsOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-output.mjs";
import {
  defaultProductionSmokeDispatchInputsTableOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-table-path.mjs";
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
    14,
  );
  assert.equal(
    artifact.releaseGate.smoke.missingEvidence.inputSourceCount,
    7,
  );
  assert.equal(
    artifact.releaseGate.smoke.missingEvidence.workflowInputCount,
    14,
  );
  assert.deepEqual(
    artifact.releaseGate.smoke.missingEvidence.requiredEvidence.slice(0, 7),
    [
      {
        label: "Production smoke request",
        value: createProductionSmokeRequestCommand(),
      },
      {
        label: "Dispatch inputs output",
        value: defaultProductionSmokeDispatchInputsOutputPath,
      },
      {
        label: "Dispatch inputs table output",
        value: defaultProductionSmokeDispatchInputsTableOutputPath,
      },
      {
        label: "Workflow dispatch validation",
        value: createProductionSmokeDispatchValidationCommand(),
      },
      {
        label: "Workflow dispatch template",
        value: createProductionSmokeDispatchCommand(),
      },
      {
        label: "Workflow manual dispatch",
        value: createProductionSmokeManualDispatchInstruction(),
      },
      {
        label: "Workflow",
        value: "GitHub Actions Production Smoke against the production environment",
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
  assert.deepEqual(
    artifact.releaseGate.smoke.missingEvidence.inputSources.find(
      (input) => input.name === "local_verification_run_url",
    ),
    {
      name: "local_verification_run_url",
      source: "main CI run URL that uploaded the local verification artifact",
      value: "<main CI run URL>",
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

  artifact.releaseGate.smoke.missingEvidence.workflowInputCount =
    artifact.releaseGate.smoke.missingEvidence.workflowInputs.length;
  artifact.releaseGate.smoke.missingEvidence.inputSourceCount = 0;
  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /inputSourceCount must match inputSources length/,
  );
});
