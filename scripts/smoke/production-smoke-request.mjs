import {
  createProductionSmokeDispatchArtifact,
  readProductionSmokeDispatchCliConfig,
} from "./production-smoke-dispatch-cli.mjs";
import {
  normalizeProductionSmokeDispatchInputsOutputPath,
} from "./production-smoke-dispatch-inputs-output.mjs";
import {
  normalizeProductionSmokeDispatchInputsTableOutputPath,
} from "./production-smoke-dispatch-inputs-table-output.mjs";
import {
  printProductionSmokeRequestSummary,
  writeProductionSmokeRequestOutputs,
} from "./production-smoke-request-cli-output.mjs";
import { readErrorMessage } from "./smoke-error-message.mjs";
import { normalizeSmokeReportMarkdownPath } from "./smoke-report-path-config.mjs";
import { printProductionSmokeRequestHelp } from "./production-smoke-request-help.mjs";

export const defaultProductionSmokeRequestOutputPath =
  "artifacts/production-smoke/production-smoke-request.md";

export {
  createProductionSmokeRequestMarkdown,
  writeProductionSmokeRequestMarkdown,
} from "./production-smoke-request-markdown.mjs";

export async function runProductionSmokeRequestCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printProductionSmokeRequestHelp(stdout);
    return 0;
  }

  try {
    const config = readProductionSmokeRequestCliConfig(args);
    const dispatchArtifact = createProductionSmokeDispatchArtifact(
      config.dispatchConfig,
    );
    const requestArtifact = {
      ...dispatchArtifact,
      inputsTableOutputPath: config.inputsTableOutputPath,
      inputsOutputPath: config.inputsOutputPath,
    };

    await writeProductionSmokeRequestOutputs(config, {
      dispatch: dispatchArtifact,
      request: requestArtifact,
    });
    printProductionSmokeRequestSummary(config, dispatchArtifact, stdout);

    return 0;
  } catch (error) {
    stderr(`Production smoke request failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

export function readProductionSmokeRequestCliConfig(args = []) {
  const input = {
    dispatchArgs: [],
    inputsTableOutputPath: null,
    inputsOutputPath: null,
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

    if (option === "--inputs-output") {
      input.inputsOutputPath =
        value ?? readOptionValue(option, normalizedArgs, index);
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--inputs-table-output") {
      input.inputsTableOutputPath =
        value ?? readOptionValue(option, normalizedArgs, index);
      index += value === null ? 1 : 0;
      continue;
    }

    input.dispatchArgs.push(normalizedArgs[index]);
  }

  return {
    dispatchConfig: readProductionSmokeDispatchCliConfig(input.dispatchArgs),
    inputsOutputPath: input.inputsOutputPath
      ? normalizeProductionSmokeDispatchInputsOutputPath(input.inputsOutputPath)
      : null,
    inputsTableOutputPath: input.inputsTableOutputPath
      ? normalizeProductionSmokeDispatchInputsTableOutputPath(
          input.inputsTableOutputPath,
        )
      : null,
    outputPath: normalizeProductionSmokeRequestOutputPath(input.outputPath),
  };
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
