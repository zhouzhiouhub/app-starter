import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance-constants.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { normalizeSmokeReportPath } from "../smoke/smoke-report-path-config.mjs";

export function readPageBuilderVisualAcceptanceCliConfig(args) {
  const config = {
    checklist: false,
    json: false,
    manifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
    outputPath: null,
    requireAccepted: false,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === "--require-accepted") {
      config.requireAccepted = true;
      continue;
    }

    if (arg === "--checklist") {
      config.checklist = true;
      continue;
    }

    if (arg === "--json") {
      config.json = true;
      continue;
    }

    if (arg === "--output") {
      config.outputPath = normalizeVisualAcceptanceOutputPath(
        readOptionValue(arg, normalizedArgs, index),
      );
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown visual acceptance option: ${arg}`);
    }

    if (config.manifestPath !== defaultPageBuilderVisualAcceptanceManifestPath) {
      throw new Error("Provide only one visual acceptance manifest path.");
    }

    config.manifestPath = arg;
  }

  return config;
}

export function normalizeVisualAcceptanceOutputPath(value) {
  try {
    return normalizeSmokeReportPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "SMOKE_REPORT_PATH",
        "Visual acceptance output",
      ),
    );
  }
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
