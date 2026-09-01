import {
  defaultProductionSmokeDispatchInputsManifestOutputPath,
} from "./production-smoke-dispatch-inputs-manifest-path.mjs";

const defaultWorkflowFile = "production-smoke.yml";
const defaultRef = "main";
const defaultDispatchCliCommand = "pnpm smoke:dispatch";
const defaultSmokeRequestCommand = "pnpm smoke:request";
const defaultSmokeRequestOutputPath =
  "artifacts/production-smoke/production-smoke-request.md";
const defaultSmokeRequestInputsOutputPath =
  "artifacts/production-smoke/production-smoke-dispatch-inputs.txt";
const defaultSmokeRequestInputsTableOutputPath =
  "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv";
const defaultManualDispatchInstruction =
  "GitHub Actions > Production Smoke > Run workflow, then use the listed workflow_dispatch inputs.";

export const productionSmokeDispatchInputs = [
  {
    name: "visual_artifact_name",
    value: "page-builder-visual-fixture-<run_number>",
  },
  {
    name: "visual_artifact_run_id",
    value: "<Page Builder Visual workflow run id>",
  },
  {
    name: "local_verification_run_url",
    value: "<main CI run URL>",
  },
  {
    name: "local_verification_artifact_name",
    value: "local-verification-<run_number>",
  },
  {
    name: "release_tag",
    value: "<tag>",
  },
  {
    name: "rollback_target",
    value: "<target>",
  },
  {
    name: "storefront_url",
    value: "<public HTTPS storefront URL>",
  },
];

const dispatchCliInputOptions = new Map([
  ["visual_artifact_name", "--visual-artifact"],
  ["visual_artifact_run_id", "--visual-artifact-run-id"],
  ["local_verification_run_url", "--local-verification-run-url"],
  ["local_verification_artifact_name", "--local-verification-artifact"],
  ["release_tag", "--release-tag"],
  ["rollback_target", "--rollback-target"],
  ["storefront_url", "--storefront-url"],
]);

export function createProductionSmokeDispatchCommand(options = {}) {
  const workflowFile = readText(options.workflowFile) ?? defaultWorkflowFile;
  const ref = readText(options.ref) ?? defaultRef;
  const inputs = Array.isArray(options.inputs)
    ? options.inputs
    : productionSmokeDispatchInputs;

  return [
    "gh workflow run",
    workflowFile,
    "--ref",
    ref,
    ...inputs.flatMap(formatDispatchInput),
  ].join(" ");
}

export function createProductionSmokeDispatchValidationCommand(options = {}) {
  const cliCommand =
    readText(options.cliCommand) ?? defaultDispatchCliCommand;
  const inputs = Array.isArray(options.inputs)
    ? options.inputs
    : productionSmokeDispatchInputs;

  return [
    cliCommand,
    "--",
    "--require-complete",
    ...inputs.flatMap(formatDispatchCliInput),
  ].join(" ");
}

export function createProductionSmokeDispatchManifestValidationCommand(
  options = {},
) {
  const cliCommand =
    readText(options.cliCommand) ?? defaultDispatchCliCommand;
  const inputsJsonPath =
    readText(options.inputsJsonPath) ??
    defaultProductionSmokeDispatchInputsManifestOutputPath;

  return [
    cliCommand,
    "--",
    "--inputs-json",
    inputsJsonPath,
    "--require-complete",
  ].join(" ");
}

export function createProductionSmokeRequestCommand(options = {}) {
  const outputPath =
    readText(options.outputPath) ?? defaultSmokeRequestOutputPath;
  const inputsOutputPath =
    readText(options.inputsOutputPath) ?? defaultSmokeRequestInputsOutputPath;
  const inputsTableOutputPath =
    readText(options.inputsTableOutputPath) ??
    defaultSmokeRequestInputsTableOutputPath;
  const inputsJsonOutputPath =
    readText(options.inputsJsonOutputPath) ??
    defaultProductionSmokeDispatchInputsManifestOutputPath;

  if (
    outputPath === defaultSmokeRequestOutputPath &&
    inputsOutputPath === defaultSmokeRequestInputsOutputPath &&
    inputsTableOutputPath === defaultSmokeRequestInputsTableOutputPath &&
    inputsJsonOutputPath === defaultProductionSmokeDispatchInputsManifestOutputPath
  ) {
    return defaultSmokeRequestCommand;
  }

  return [
    defaultSmokeRequestCommand,
    "--",
    "--output",
    outputPath,
    "--inputs-output",
    inputsOutputPath,
    "--inputs-table-output",
    inputsTableOutputPath,
    "--inputs-json-output",
    inputsJsonOutputPath,
  ].join(" ");
}

export function createProductionSmokeManualDispatchInstruction() {
  return defaultManualDispatchInstruction;
}

function formatDispatchInput(input) {
  const name = readText(input?.name);
  const value = readText(input?.value);

  return name && value ? ["-f", `${name}=${quoteShellValue(value)}`] : [];
}

function formatDispatchCliInput(input) {
  const name = readText(input?.name);
  const value = readText(input?.value);
  const option = dispatchCliInputOptions.get(name);

  return option && value ? [option, quoteShellValue(value)] : [];
}

function quoteShellValue(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function readText(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
