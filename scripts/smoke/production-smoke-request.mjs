import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createProductionSmokeDispatchArtifact,
  readProductionSmokeDispatchCliConfig,
} from "./production-smoke-dispatch-cli.mjs";
import {
  createProductionSmokeDispatchValidationCommand,
} from "./production-smoke-dispatch-command.mjs";
import {
  productionSmokeWorkflowInputs,
  requiredProductionSmokeEvidence,
} from "./smoke-missing-evidence-markdown.mjs";
import { readErrorMessage } from "./smoke-error-message.mjs";
import { normalizeSmokeReportMarkdownPath } from "./smoke-report-path-config.mjs";
import { formatSmokeText } from "./smoke-text.mjs";

export const defaultProductionSmokeRequestOutputPath =
  "artifacts/production-smoke/production-smoke-request.md";

const maxMarkdownTextLength = 420;

export async function runProductionSmokeRequestCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    const config = readProductionSmokeRequestCliConfig(args);
    const dispatchArtifact = createProductionSmokeDispatchArtifact(
      config.dispatchConfig,
    );

    await writeProductionSmokeRequestMarkdown(
      config.outputPath,
      dispatchArtifact,
    );
    stdout(`Production smoke request written: ${config.outputPath}`);
    stdout(`Ready to dispatch: ${dispatchArtifact.readyToDispatch ? "yes" : "no"}`);

    if (dispatchArtifact.missingInputs.length > 0) {
      stdout(`Missing inputs: ${dispatchArtifact.missingInputs.join(", ")}`);
    }

    return 0;
  } catch (error) {
    stderr(`Production smoke request failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

export function readProductionSmokeRequestCliConfig(args = []) {
  const input = {
    dispatchArgs: [],
    outputPath: defaultProductionSmokeRequestOutputPath,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const { option, value } = splitInlineOption(normalizedArgs[index]);

    if (option === "--output") {
      input.outputPath =
        value ?? readOptionValue(option, normalizedArgs, index);
      index += value === null ? 1 : 0;
      continue;
    }

    input.dispatchArgs.push(normalizedArgs[index]);
  }

  return {
    dispatchConfig: readProductionSmokeDispatchCliConfig(input.dispatchArgs),
    outputPath: normalizeProductionSmokeRequestOutputPath(input.outputPath),
  };
}

export function createProductionSmokeRequestMarkdown(dispatchArtifact) {
  const validationCommand = createProductionSmokeDispatchValidationCommand({
    inputs: dispatchArtifact.inputs,
  });
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
    "",
    "## Dispatch",
    "",
    `- Manual dispatch: ${formatCode(dispatchArtifact.manualDispatch)}`,
    `- Validate dispatch: ${formatCode(validationCommand)}`,
    `- Dispatch template: ${formatCode(dispatchArtifact.command)}`,
    "",
    "## Evidence Inputs",
    "",
    ...dispatchArtifact.inputs.map(formatDispatchInput),
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

export function normalizeProductionSmokeRequestOutputPath(value) {
  try {
    return normalizeSmokeReportMarkdownPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "Smoke report Markdown",
        "Production Smoke request",
      ),
    );
  }
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

function formatWorkflowInput(input) {
  return `- ${formatCode(input.name)}: ${formatCode(input.value)} (${formatText(
    input.required ? "required" : "optional",
  )}; ${formatText(input.description)})`;
}

function formatRequiredEvidence(item) {
  return `- [ ] ${formatCode(item.label)}: ${formatCode(item.value)}`;
}

function readStatus(dispatchArtifact) {
  return dispatchArtifact.readyToDispatch ? "ready-to-dispatch" : "needs-inputs";
}

function splitInlineOption(arg) {
  const equalsIndex = arg.indexOf("=");

  return equalsIndex === -1
    ? { option: arg, value: null }
    : {
        option: arg.slice(0, equalsIndex),
        value: arg.slice(equalsIndex + 1),
      };
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
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

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm smoke:request
  pnpm smoke:request -- --output artifacts/production-smoke/production-smoke-request.md
  pnpm smoke:request -- --visual-artifact page-builder-visual-fixture-123 --visual-artifact-run-id 456

Options:
  --output <path>  Write the production smoke evidence request Markdown.

Evidence inputs:
  Accepts the same evidence input overrides as pnpm smoke:dispatch, including
  --visual-artifact, --visual-artifact-run-id, --local-verification-run-url,
  --local-verification-artifact, --release-tag, --rollback-target, and
  --storefront-url.

Evidence:
  This command writes a production handoff request only. The terminal summary
  and Markdown status report dispatch readiness and any missing input names. It
  does not run smoke checks, create release evidence, upload artifacts, or mark
  the project ready.`);
}
