import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createProductionSmokeDispatchManifestValidationCommand,
  createProductionSmokeDispatchValidationCommand,
} from "./production-smoke-dispatch-command.mjs";
import {
  productionSmokeEvidenceInputSources,
} from "./production-smoke-evidence-input-sources.mjs";
import {
  requiredProductionSmokeEvidence,
} from "./smoke-missing-evidence-markdown.mjs";
import {
  productionSmokeWorkflowInputs,
} from "./production-smoke-workflow-inputs.mjs";
import {
  readProductionSmokeDispatchInputMissingReason,
} from "./production-smoke-dispatch-input-reason.mjs";

export const productionSmokeDispatchInputsManifestSchemaVersion =
  "production-smoke-dispatch-inputs.v1";
export const productionSmokeDispatchManifestContextSummary =
  "JSON input manifest carries workflow file, ref, and input values; explicit CLI flags override manifest values.";

const productionSmokeDispatchManifestContext = {
  inheritedFields: ["workflowFile", "ref", "inputs"],
  overridePolicy:
    "Explicit --workflow-file, --ref, and input flags override JSON manifest values.",
  summary: productionSmokeDispatchManifestContextSummary,
};

export {
  defaultProductionSmokeDispatchInputsManifestOutputPath,
  normalizeProductionSmokeDispatchInputsManifestOutputPath,
} from "./production-smoke-dispatch-inputs-manifest-path.mjs";

export function createProductionSmokeDispatchManifestContext() {
  return {
    ...productionSmokeDispatchManifestContext,
    inheritedFields: [
      ...productionSmokeDispatchManifestContext.inheritedFields,
    ],
  };
}

export function createProductionSmokeDispatchInputsManifest(dispatchArtifact) {
  const inputs = Array.isArray(dispatchArtifact?.inputs)
    ? dispatchArtifact.inputs
    : [];
  const missingInputs = Array.isArray(dispatchArtifact?.missingInputs)
    ? dispatchArtifact.missingInputs
    : inputs.filter((input) => input.placeholder).map((input) => input.name);

  return {
    command: dispatchArtifact?.command ?? "",
    dispatchManifestContext: createProductionSmokeDispatchManifestContext(),
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
    validationCommand: createManifestValidationCommand(dispatchArtifact, inputs),
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
      createProductionSmokeDispatchInputsManifest({
        ...dispatchArtifact,
        inputsJsonOutputPath: outputPath,
      }),
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
    ...(input.placeholder === true
      ? { missingReason: readProductionSmokeDispatchInputMissingReason(input) }
      : {}),
    name: input.name,
    placeholder: input.placeholder === true,
    releaseEvidenceRequired: source !== undefined,
    source: source?.source ?? "",
    status: input.placeholder ? "missing" : "ready",
    value: input.value,
    workflowDescription: workflowInput?.description ?? "",
    workflowRequired: workflowInput?.required === true,
  };
}

function createManifestValidationCommand(dispatchArtifact, inputs) {
  return dispatchArtifact?.inputsJsonOutputPath
    ? createProductionSmokeDispatchManifestValidationCommand({
        inputsJsonPath: dispatchArtifact.inputsJsonOutputPath,
      })
    : createProductionSmokeDispatchValidationCommand({ inputs });
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
