import { normalizeProjectStatusMarkdownPath } from "../release/release-notes-validation.mjs";
import { readReleaseCheckCliConfig } from "../release/release-check-config.mjs";

export function readProjectStatusCliConfig(args) {
  const input = readProjectStatusArgs(args);
  const releaseCheckConfig = readReleaseCheckCliConfig(input.releaseCheckArgs);

  return {
    allActions: input.allActions,
    json: releaseCheckConfig.json,
    markdownOutputPath: input.markdownOutputPath,
    outputPath: releaseCheckConfig.outputPath,
    requireReady: input.requireReady,
    releaseCheckConfig,
  };
}

function readProjectStatusArgs(args) {
  const normalizedArgs = stripPnpmSeparator(args);
  const releaseCheckArgs = [];
  let allActions = false;
  let markdownOutputPath = null;
  let requireReady = false;

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === "--all-actions") {
      allActions = true;
      continue;
    }

    if (arg === "--require-ready") {
      requireReady = true;
      continue;
    }

    if (arg === "--markdown-output") {
      markdownOutputPath = normalizeProjectStatusMarkdownPath(
        readOptionValue(arg, normalizedArgs, index),
      );
      index += 1;
      continue;
    }

    releaseCheckArgs.push(arg);
  }

  return { allActions, markdownOutputPath, releaseCheckArgs, requireReady };
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
