import { readErrorMessage } from "./smoke-error-message.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeManualDispatchInstruction,
  productionSmokeDispatchInputs,
} from "./production-smoke-dispatch-command.mjs";
import { printProductionSmokeDispatchHelp } from "./production-smoke-dispatch-help.mjs";
import {
  normalizeProductionSmokeDispatchInputsManifestOutputPath,
  readProductionSmokeDispatchManifestOverrides,
} from "./production-smoke-dispatch-manifest-inputs.mjs";
import {
  normalizeProductionSmokeDispatchInputValue,
  productionSmokeDispatchOptionInputNames,
} from "./production-smoke-dispatch-input-normalizers.mjs";
import {
  readProductionSmokeDispatchInputMissingReason,
} from "./production-smoke-dispatch-input-reason.mjs";
import {
  normalizeProductionSmokeWorkflowFile,
  normalizeProductionSmokeWorkflowRef,
} from "./production-smoke-workflow-normalizers.mjs";

const defaultWorkflowFile = "production-smoke.yml";
const defaultRef = "main";

export async function runProductionSmokeDispatchCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printProductionSmokeDispatchHelp(stdout);
    return 0;
  }

  try {
    const config = readProductionSmokeDispatchCliConfig(args);

    if (config.inputsJsonPath) {
      applyManifestOverrides(
        config,
        await readProductionSmokeDispatchManifestOverrides(
          config.inputsJsonPath,
        ),
      );
    }

    const artifact = createProductionSmokeDispatchArtifact(config);

    if (artifact.requireComplete && !artifact.readyToDispatch) {
      throw new Error(createIncompleteDispatchErrorMessage(artifact, config));
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
    inputsJsonPath: null,
    json: false,
    ref: defaultRef,
    refOverridden: false,
    requireComplete: false,
    workflowFile: defaultWorkflowFile,
    workflowFileOverridden: false,
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

    if (option === "--inputs-json" || option === "--inputs-manifest") {
      config.inputsJsonPath =
        normalizeProductionSmokeDispatchInputsManifestOutputPath(
          value ?? readOptionValue(option, normalizedArgs, index),
        );
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--ref") {
      config.ref = normalizeProductionSmokeWorkflowRef(
        value ?? readOptionValue(option, normalizedArgs, index),
      );
      config.refOverridden = true;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--workflow-file") {
      config.workflowFile = normalizeProductionSmokeWorkflowFile(
        value ?? readOptionValue(option, normalizedArgs, index),
      );
      config.workflowFileOverridden = true;
      index += value === null ? 1 : 0;
      continue;
    }

    if (productionSmokeDispatchOptionInputNames.has(option)) {
      const inputName = productionSmokeDispatchOptionInputNames.get(option);
      const rawValue = value ?? readOptionValue(option, normalizedArgs, index);

      config.inputOverrides.set(
        inputName,
        normalizeProductionSmokeDispatchInputValue(inputName, rawValue),
      );
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
  const missingInputDetails = inputs
    .filter((item) => item.placeholder)
    .map((item) => ({
      name: item.name,
      reason: readProductionSmokeDispatchInputMissingReason(item),
    }));
  const missingInputs = missingInputDetails.map((item) => item.name);

  return {
    command,
    inputs,
    json: config.json,
    manualDispatch: createProductionSmokeManualDispatchInstruction(),
    missingInputDetails,
    missingInputs,
    readyToDispatch: missingInputs.length === 0,
    ref: config.ref,
    requireComplete: config.requireComplete,
    workflowFile: config.workflowFile,
  };
}

function applyManifestOverrides(config, overrides) {
  if (!config.refOverridden && overrides.ref) {
    config.ref = overrides.ref;
  }

  if (!config.workflowFileOverridden && overrides.workflowFile) {
    config.workflowFile = overrides.workflowFile;
  }

  for (const [name, value] of overrides.inputOverrides) {
    if (!config.inputOverrides.has(name)) {
      config.inputOverrides.set(name, value);
    }
  }
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
    ...(artifact.missingInputDetails.length > 0
      ? [
          `  First missing input: ${formatMissingInputDetail(
            artifact.missingInputDetails[0],
          )}`,
        ]
      : []),
    "  Inputs:",
    ...artifact.inputs.map((input) => `    - ${input.name}: ${input.value}`),
    `  Command: ${artifact.command}`,
  ];
}

function createIncompleteDispatchErrorMessage(artifact, config) {
  const firstMissingInput =
    artifact.missingInputDetails.length > 0
      ? formatMissingInputDetail(artifact.missingInputDetails[0])
      : "";

  return [
    `Missing dispatch inputs: ${artifact.missingInputs.join(", ")}.`,
    firstMissingInput ? `First missing input: ${firstMissingInput}.` : "",
    createIncompleteDispatchInputAction(config),
    "Manual: GitHub Actions > Production Smoke > Run workflow.",
  ]
    .filter(Boolean)
    .join(" ");
}

function createIncompleteDispatchInputAction(config) {
  if (config.inputsJsonPath) {
    return [
      `Fill ${config.inputsJsonPath} with real workflow_dispatch values.`,
      `Rerun: pnpm smoke:dispatch -- --inputs-json ${config.inputsJsonPath} --require-complete.`,
      "Preview without --require-complete.",
    ].join(" ");
  }

  return [
    "Pass real input flags, or run pnpm smoke:request to create",
    "artifacts/production-smoke/production-smoke-dispatch-inputs.json first.",
    "Preview with pnpm smoke:dispatch.",
  ].join(" ");
}

function formatMissingInputDetail(input) {
  return input.reason ? `${input.name} - ${input.reason}` : input.name;
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
