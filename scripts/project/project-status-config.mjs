import { readReleaseCheckCliConfig } from "../release/release-check-config.mjs";

export function readProjectStatusCliConfig(args) {
  const input = readProjectStatusArgs(args);
  const releaseCheckConfig = readReleaseCheckCliConfig(input.releaseCheckArgs);

  return {
    json: releaseCheckConfig.json,
    outputPath: releaseCheckConfig.outputPath,
    requireReady: input.requireReady,
    releaseCheckConfig,
  };
}

function readProjectStatusArgs(args) {
  const normalizedArgs = stripPnpmSeparator(args);
  const releaseCheckArgs = [];
  let requireReady = false;

  for (const arg of normalizedArgs) {
    if (arg === "--require-ready") {
      requireReady = true;
      continue;
    }

    releaseCheckArgs.push(arg);
  }

  return { releaseCheckArgs, requireReady };
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}
