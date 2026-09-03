import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  productionSmokeEvidenceInputSources,
} from "./production-smoke-evidence-input-sources.mjs";
import {
  productionSmokeWorkflowInputs,
} from "./production-smoke-workflow-inputs.mjs";
import {
  readProductionSmokeDispatchInputMissingReason,
} from "./production-smoke-dispatch-input-reason.mjs";
export {
  defaultProductionSmokeDispatchInputsTableOutputPath,
  normalizeProductionSmokeDispatchInputsTableOutputPath,
} from "./production-smoke-dispatch-inputs-table-path.mjs";

export function createProductionSmokeDispatchInputsTable(dispatchArtifact) {
  const inputs = Array.isArray(dispatchArtifact?.inputs)
    ? dispatchArtifact.inputs
    : [];
  const rows = inputs.map(createDispatchInputTableRow);

  return [
    [
      "name",
      "status",
      "missing_reason",
      "value",
      "source",
      "release_evidence_required",
      "workflow_required",
      "workflow_description",
    ].join("\t"),
    ...rows.map(formatTableRow),
  ].join("\n") + "\n";
}

export async function writeProductionSmokeDispatchInputsTable(
  outputPath,
  dispatchArtifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createProductionSmokeDispatchInputsTable(dispatchArtifact),
    "utf8",
  );
}

function createDispatchInputTableRow(input) {
  const source = productionSmokeEvidenceInputSources.find(
    (item) => item.name === input.name,
  );
  const workflowInput = productionSmokeWorkflowInputs.find(
    (item) => item.name === input.name,
  );

  return {
    name: input.name,
    missingReason: readProductionSmokeDispatchInputMissingReason(input),
    releaseEvidenceRequired: source !== undefined ? "required" : "optional",
    source: source?.source ?? "",
    status: input.placeholder ? "missing" : "ready",
    value: input.value,
    workflowDescription: workflowInput?.description ?? "",
    workflowRequired: workflowInput?.required === true ? "required" : "optional",
  };
}

function formatTableRow(row) {
  return [
    row.name,
    row.status,
    row.missingReason,
    row.value,
    row.source,
    row.releaseEvidenceRequired,
    row.workflowRequired,
    row.workflowDescription,
  ]
    .map(formatTsvCell)
    .join("\t");
}

function formatTsvCell(value) {
  return String(value ?? "").replace(/[\t\r\n]+/gu, " ").trim();
}
