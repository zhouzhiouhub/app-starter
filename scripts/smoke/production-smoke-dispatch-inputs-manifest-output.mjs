import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createProductionSmokeDispatchValidationCommand,
} from "./production-smoke-dispatch-command.mjs";
import {
  productionSmokeEvidenceInputSources,
} from "./production-smoke-evidence-input-sources.mjs";
import {
  productionSmokeWorkflowInputs,
  requiredProductionSmokeEvidence,
} from "./smoke-missing-evidence-markdown.mjs";

export const productionSmokeDispatchInputsManifestSchemaVersion =
  "production-smoke-dispatch-inputs.v1";
export {
  defaultProductionSmokeDispatchInputsManifestOutputPath,
  normalizeProductionSmokeDispatchInputsManifestOutputPath,
} from "./production-smoke-dispatch-inputs-manifest-path.mjs";

export function createProductionSmokeDispatchInputsManifest(dispatchArtifact) {
  const inputs = Array.isArray(dispatchArtifact?.inputs)
    ? dispatchArtifact.inputs
    : [];
  const missingInputs = Array.isArray(dispatchArtifact?.missingInputs)
    ? dispatchArtifact.missingInputs
    : inputs.filter((input) => input.placeholder).map((input) => input.name);

  return {
    command: dispatchArtifact?.command ?? "",
    inputCount: inputs.length,
    inputSources: productionSmokeEvidenceInputSources.map(
      createInputSourceEntry,
    ),
    inputs: inputs.map(createManifestInputEntry),
    manualDispatch: dispatchArtifact?.manualDispatch ?? "",
    missingInputCount: missingInputs.length,
    missingInputs,
    readyToDispatch: dispatchArtifact?.readyToDispatch === true,
    ref: dispatchArtifact?.ref ?? "",
    requiredEvidence: requiredProductionSmokeEvidence.map(
      createRequiredEvidenceEntry,
    ),
    schemaVersion: productionSmokeDispatchInputsManifestSchemaVersion,
    status:
      dispatchArtifact?.readyToDispatch === true
        ? "ready-to-dispatch"
        : "needs-inputs",
    validationCommand: createProductionSmokeDispatchValidationCommand({
      inputs,
    }),
    workflowFile: dispatchArtifact?.workflowFile ?? "",
    workflowInputs: productionSmokeWorkflowInputs.map(createWorkflowInputEntry),
  };
}

export async function writeProductionSmokeDispatchInputsManifest(
  outputPath,
  dispatchArtifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      createProductionSmokeDispatchInputsManifest(dispatchArtifact),
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function createManifestInputEntry(input) {
  const source = productionSmokeEvidenceInputSources.find(
    (item) => item.name === input.name,
  );
  const workflowInput = productionSmokeWorkflowInputs.find(
    (item) => item.name === input.name,
  );

  return {
    name: input.name,
    placeholder: input.placeholder === true,
    source: source?.source ?? "",
    status: input.placeholder ? "missing" : "ready",
    value: input.value,
    workflowDescription: workflowInput?.description ?? "",
    workflowRequired: workflowInput?.required === true,
  };
}

function createInputSourceEntry(input) {
  return {
    name: input.name,
    source: input.source,
    value: input.value,
  };
}

function createRequiredEvidenceEntry(item) {
  return {
    label: item.label,
    value: item.value,
  };
}

function createWorkflowInputEntry(input) {
  return {
    description: input.description,
    name: input.name,
    required: input.required === true,
    value: input.value,
  };
}
