import { defaultPageBuilderVisualAcceptanceManifestPath } from "../visual/page-builder-visual-acceptance-constants.mjs";

export function readReleaseCheckCliConfig(args) {
  const config = {
    smokeReportPath: null,
    visualManifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === "--latest") {
      config.smokeReportPath = null;
      continue;
    }

    if (arg === "--smoke-report") {
      config.smokeReportPath = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (arg === "--visual-manifest") {
      config.visualManifestPath = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown release check option: ${arg}`);
    }

    if (config.smokeReportPath) {
      throw new Error("Provide only one smoke report path.");
    }

    config.smokeReportPath = arg;
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
