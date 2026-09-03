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
  productionSmokeWorkflowInputs,
  readProductionSmokeReleaseEvidenceRequirement,
} from "./production-smoke-workflow-inputs.mjs";
import {
  requiredProductionSmokeEvidence,
} from "./smoke-missing-evidence-markdown.mjs";
import { formatSmokeText } from "./smoke-text.mjs";

const maxMarkdownTextLength = 420;

export function createProductionSmokeRequestMarkdown(dispatchArtifact) {
  const validationCommand = createProductionSmokeRequestValidationCommand(
    dispatchArtifact,
  );
  const missingInputs =
    dispatchArtifact.missingInputs.length > 0
      ? dispatchArtifact.missingInputs.join(", ")
      : "none";
  const lines = [
    "# Production Smoke Evidence Request",
    "",
    `Status: ${formatCode(readStatus(dispatchArtifact))}`,
    `Workflow file: ${formatCode(dispatchArtifact.workflowFile)}`,
    `Ref: ${formatCode(dispatchArtifact.ref)}`,
    `Ready to dispatch: ${formatCode(
      dispatchArtifact.readyToDispatch ? "yes" : "no",
    )}`,
    `Missing inputs: ${formatCode(missingInputs)}`,
    ...formatInputsOutputPath(dispatchArtifact.inputsOutputPath),
    ...formatInputsTableOutputPath(dispatchArtifact.inputsTableOutputPath),
    ...formatInputsJsonOutputPath(dispatchArtifact.inputsJsonOutputPath),
    "",
    "## Dispatch",
    "",
    `- Manual dispatch: ${formatCode(dispatchArtifact.manualDispatch)}`,
    `- Validate dispatch: ${formatCode(validationCommand)}`,
    ...formatDispatchManifestNotes(dispatchArtifact),
    `- Dispatch template: ${formatCode(dispatchArtifact.command)}`,
    "",
    "## Evidence Inputs",
    "",
    ...dispatchArtifact.inputs.map(formatDispatchInput),
    "",
    "## Evidence Input Sources",
    "",
    ...productionSmokeEvidenceInputSources.map((input) =>
      formatEvidenceInputSource(input, dispatchArtifact.inputs),
    ),
    "",
    "## Workflow Inputs",
    "",
    ...productionSmokeWorkflowInputs.map(formatWorkflowInput),
    "",
    "## Required Evidence",
    "",
    ...requiredProductionSmokeEvidence.map(formatRequiredEvidence),
    "",
    "## After Run",
    "",
    "- Keep every required GitHub Actions artifact listed above.",
    "- Rerun `pnpm project:status -- --summary` and confirm `Release ready: yes` before calling the project complete.",
    "- Generate final release notes only after Production Smoke and Page Builder Visual evidence are both ready.",
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export async function writeProductionSmokeRequestMarkdown(
  outputPath,
  dispatchArtifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createProductionSmokeRequestMarkdown(dispatchArtifact),
    "utf8",
  );
}

function formatInputsOutputPath(outputPath) {
  return outputPath ? [`Dispatch inputs output: ${formatCode(outputPath)}`] : [];
}

function formatInputsTableOutputPath(outputPath) {
  return outputPath
    ? [`Dispatch inputs table output: ${formatCode(outputPath)}`]
    : [];
}

function formatInputsJsonOutputPath(outputPath) {
  return outputPath
    ? [`Dispatch inputs JSON output: ${formatCode(outputPath)}`]
    : [];
}

function createProductionSmokeRequestValidationCommand(dispatchArtifact) {
  return dispatchArtifact.inputsJsonOutputPath
    ? createProductionSmokeDispatchManifestValidationCommand({
        inputsJsonPath: dispatchArtifact.inputsJsonOutputPath,
      })
    : createProductionSmokeDispatchValidationCommand({
        inputs: dispatchArtifact.inputs,
      });
}

function formatDispatchManifestNotes(dispatchArtifact) {
  return dispatchArtifact.inputsJsonOutputPath
    ? [
        `- JSON manifest: ${formatCode(
          dispatchArtifact.inputsJsonOutputPath,
        )} provides workflow file, ref, and input values for dispatch.`,
        `- CLI overrides: explicit ${formatCode("--workflow-file")}, ${formatCode(
          "--ref",
        )}, and input flags override JSON manifest values.`,
      ]
    : [];
}

function formatDispatchInput(input) {
  const checked = input.placeholder ? " " : "x";
  const suffix = input.placeholder
    ? " - replace before dispatch"
    : " - ready";

  return `- [${checked}] ${formatCode(input.name)}: ${formatCode(
    input.value,
  )}${suffix}`;
}

function formatEvidenceInputSource(source, inputs) {
  const input = inputs.find((item) => item.name === source.name);

  return `- ${formatCode(source.name)}: ${formatCode(
    input?.value ?? source.value,
  )} - ${formatText(source.source)}`;
}

function formatWorkflowInput(input) {
  return `- ${formatCode(input.name)}: ${formatCode(input.value)} (${formatText(
    input.required ? "workflow required" : "workflow optional",
  )}; ${formatText(
    readProductionSmokeReleaseEvidenceRequirement(input.name),
  )}; ${formatText(input.description)})`;
}

function formatRequiredEvidence(item) {
  return `- [ ] ${formatCode(item.label)}: ${formatCode(item.value)}`;
}

function readStatus(dispatchArtifact) {
  return dispatchArtifact.readyToDispatch ? "ready-to-dispatch" : "needs-inputs";
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
