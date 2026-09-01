import {
  normalizeArtifactName,
  normalizeLocalVerificationArtifactName,
  normalizePlainValue,
  normalizeReleaseTag,
  normalizeStorefrontUrl,
  normalizeWorkflowRunUrl,
} from "../release/release-notes-validation.mjs";
import { readErrorMessage } from "./smoke-error-message.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeManualDispatchInstruction,
  productionSmokeDispatchInputs,
} from "./production-smoke-dispatch-command.mjs";

const defaultWorkflowFile = "production-smoke.yml";
const defaultRef = "main";
const safeVisualArtifactNamePattern =
  /^page-builder-visual-fixture-[0-9]{1,20}$/u;
const safeWorkflowFilePattern = /^[A-Za-z0-9._-]+\.ya?ml$/u;
const safeWorkflowRefPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,119}$/u;
const safeGithubRunIdPattern = /^[0-9]{1,20}$/u;
const safeRollbackTargetPattern = /^[A-Za-z0-9][A-Za-z0-9._/@:-]{0,159}$/u;

const optionInputNames = new Map([
  ["--visual-artifact-name", "visual_artifact_name"],
  ["--visual-artifact", "visual_artifact_name"],
  ["--visual-artifact-run-id", "visual_artifact_run_id"],
  ["--local-verification-run-url", "local_verification_run_url"],
  ["--local-verification-artifact-name", "local_verification_artifact_name"],
  ["--local-verification-artifact", "local_verification_artifact_name"],
  ["--release-tag", "release_tag"],
  ["--rollback-target", "rollback_target"],
  ["--storefront-url", "storefront_url"],
]);

const inputNormalizers = {
  local_verification_artifact_name: normalizeLocalVerificationArtifactName,
  local_verification_run_url: normalizeWorkflowRunUrl,
  release_tag: normalizeReleaseTag,
  rollback_target: normalizeRollbackTarget,
  storefront_url: normalizeStorefrontUrl,
  visual_artifact_name: normalizeVisualArtifactName,
  visual_artifact_run_id: normalizeGithubRunId,
};

export async function runProductionSmokeDispatchCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    const artifact = createProductionSmokeDispatchArtifact(
      readProductionSmokeDispatchCliConfig(args),
    );

    if (artifact.requireComplete && !artifact.readyToDispatch) {
      throw new Error(
        `Missing dispatch inputs: ${artifact.missingInputs.join(", ")}.`,
      );
    }

    if (artifact.json) {
      stdout(JSON.stringify(artifact, null, 2));
    } else {
      for (const line of formatProductionSmokeDispatch(artifact)) {
        stdout(line);
      }
    }

    return 0;
  } catch (error) {
    stderr(`Production smoke dispatch failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

export function readProductionSmokeDispatchCliConfig(args) {
  const config = {
    inputOverrides: new Map(),
    json: false,
    ref: defaultRef,
    requireComplete: false,
    workflowFile: defaultWorkflowFile,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const { option, value } = splitInlineOption(normalizedArgs[index]);

    if (option === "--json") {
      config.json = true;
      continue;
    }

    if (option === "--require-complete") {
      config.requireComplete = true;
      continue;
    }

    if (option === "--ref") {
      config.ref = normalizeWorkflowRef(
        value ?? readOptionValue(option, normalizedArgs, index),
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--workflow-file") {
      config.workflowFile = normalizeWorkflowFile(
        value ?? readOptionValue(option, normalizedArgs, index),
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (optionInputNames.has(option)) {
      const inputName = optionInputNames.get(option);
      const rawValue = value ?? readOptionValue(option, normalizedArgs, index);

      config.inputOverrides.set(inputName, inputNormalizers[inputName](rawValue));
      index += value === null ? 1 : 0;
      continue;
    }

    throw new Error(`Unknown production smoke dispatch option: ${option}`);
  }

  return config;
}

export function createProductionSmokeDispatchArtifact(config) {
  const inputs = productionSmokeDispatchInputs.map((input) => {
    const value = config.inputOverrides.get(input.name) ?? input.value;

    return {
      name: input.name,
      placeholder: !config.inputOverrides.has(input.name),
      value,
    };
  });
  const command = createProductionSmokeDispatchCommand({
    inputs,
    ref: config.ref,
    workflowFile: config.workflowFile,
  });
  const missingInputs = inputs
    .filter((item) => item.placeholder)
    .map((item) => item.name);

  return {
    command,
    inputs,
    json: config.json,
    manualDispatch: createProductionSmokeManualDispatchInstruction(),
    missingInputs,
    readyToDispatch: missingInputs.length === 0,
    ref: config.ref,
    requireComplete: config.requireComplete,
    workflowFile: config.workflowFile,
  };
}

export function formatProductionSmokeDispatch(artifact) {
  return [
    "Production Smoke dispatch",
    `  Manual dispatch: ${artifact.manualDispatch}`,
    `  Workflow file: ${artifact.workflowFile}`,
    `  Ref: ${artifact.ref}`,
    `  Ready to dispatch: ${artifact.readyToDispatch ? "yes" : "no"}`,
    ...(artifact.missingInputs.length > 0
      ? [`  Missing inputs: ${artifact.missingInputs.join(", ")}`]
      : []),
    "  Inputs:",
    ...artifact.inputs.map((input) => `    - ${input.name}: ${input.value}`),
    `  Command: ${artifact.command}`,
  ];
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

function normalizeGithubRunId(value) {
  const normalized = normalizePlainValue("GitHub workflow run id", value);

  if (!safeGithubRunIdPattern.test(normalized)) {
    throw new Error("GitHub workflow run id must contain only digits.");
  }

  return normalized;
}

function normalizeRollbackTarget(value) {
  const normalized = normalizePlainValue("rollback target", value);

  if (!safeRollbackTargetPattern.test(normalized)) {
    throw new Error(
      "Rollback target must use safe characters: letters, numbers, dot, underscore, dash, slash, at, or colon.",
    );
  }

  return normalized;
}

function normalizeVisualArtifactName(value) {
  const normalized = normalizeArtifactName("visual artifact", value);

  if (!safeVisualArtifactNamePattern.test(normalized)) {
    throw new Error(
      "Visual artifact must use the page-builder-visual-fixture-<run_number> naming pattern.",
    );
  }

  return normalized;
}

function normalizeWorkflowFile(value) {
  const normalized = normalizePlainValue("workflow file", value);

  if (!safeWorkflowFilePattern.test(normalized)) {
    throw new Error("Workflow file must be a safe .yml or .yaml filename.");
  }

  return normalized;
}

function normalizeWorkflowRef(value) {
  const normalized = normalizePlainValue("workflow ref", value);

  if (
    !safeWorkflowRefPattern.test(normalized) ||
    normalized.includes("..") ||
    normalized.includes("//") ||
    normalized.endsWith("/")
  ) {
    throw new Error("Workflow ref must be a safe branch, tag, or commit ref.");
  }

  return normalized;
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm smoke:dispatch
  pnpm smoke:dispatch -- --json
  pnpm smoke:dispatch -- --require-complete
  pnpm smoke:dispatch -- --local-verification-run-url https://github.com/owner/repo/actions/runs/122 --local-verification-artifact local-verification-122 --visual-artifact page-builder-visual-fixture-123 --visual-artifact-run-id 123 --release-tag v0.1.0 --rollback-target main@abcdef1 --storefront-url https://store.brand.com

Options:
  --json                              Print machine-readable dispatch data.
  --require-complete                  Fail if any workflow input still uses a placeholder.
  --ref <ref>                         Git ref for the workflow dispatch; defaults to main.
  --workflow-file <file>              Workflow file name; defaults to production-smoke.yml.
  --local-verification-run-url <url>  Main CI GitHub Actions run URL.
  --local-verification-artifact <name>
                                      Main CI local-verification artifact name.
  --visual-artifact <name>            Page Builder Visual artifact name.
  --visual-artifact-run-id <id>       Page Builder Visual workflow run id.
  --release-tag <tag>                 Release tag used by release notes.
  --rollback-target <target>          Commit, tag, deployment, or version used for rollback.
  --storefront-url <url>              Public production storefront URL.
  -h, --help                          Show this help.

Dispatch:
  This command only prints the GitHub Actions dispatch command and manual UI
  path. It does not call gh, run Production Smoke, or mark release evidence
  ready. Use --require-complete before copying a formal release command so
  placeholder values cannot reach the protected production workflow.`);
}
