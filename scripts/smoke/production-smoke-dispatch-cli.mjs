import { normalizePlainValue } from "../release/release-notes-validation.mjs";
import { readErrorMessage } from "./smoke-error-message.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeManualDispatchInstruction,
  productionSmokeDispatchInputs,
} from "./production-smoke-dispatch-command.mjs";
import { printProductionSmokeDispatchHelp } from "./production-smoke-dispatch-help.mjs";
import {
  normalizeProductionSmokeDispatchInputsManifestOutputPath,
  readProductionSmokeDispatchManifestInputOverrides,
} from "./production-smoke-dispatch-manifest-inputs.mjs";
import {
  normalizeProductionSmokeDispatchInputValue,
  productionSmokeDispatchOptionInputNames,
} from "./production-smoke-dispatch-input-normalizers.mjs";

const defaultWorkflowFile = "production-smoke.yml";
const defaultRef = "main";
const safeWorkflowFilePattern = /^[A-Za-z0-9._-]+\.ya?ml$/u;
const safeWorkflowRefPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,119}$/u;

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
      applyManifestInputOverrides(
        config.inputOverrides,
        await readProductionSmokeDispatchManifestInputOverrides(
          config.inputsJsonPath,
        ),
      );
    }

    const artifact = createProductionSmokeDispatchArtifact(config);

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
    inputsJsonPath: null,
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

    if (option === "--inputs-json" || option === "--inputs-manifest") {
      config.inputsJsonPath =
        normalizeProductionSmokeDispatchInputsManifestOutputPath(
          value ?? readOptionValue(option, normalizedArgs, index),
        );
      index += value === null ? 1 : 0;
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

function applyManifestInputOverrides(target, source) {
  for (const [name, value] of source) {
    if (!target.has(name)) {
      target.set(name, value);
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
