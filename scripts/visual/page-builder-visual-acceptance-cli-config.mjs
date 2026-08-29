import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance-constants.mjs";
import {
  normalizeVisualAcceptanceMarkdownOutputPath,
  normalizeVisualAcceptanceOutputPath,
} from "./page-builder-visual-acceptance-output-paths.mjs";

export function readPageBuilderVisualAcceptanceCliConfig(args) {
  const config = {
    checklist: false,
    json: false,
    markdownOutputPath: null,
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

    if (arg === "--markdown-output") {
      config.markdownOutputPath = normalizeVisualAcceptanceMarkdownOutputPath(
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
