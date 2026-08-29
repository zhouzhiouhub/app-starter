import {
  normalizeArtifactName,
  normalizePlainValue,
  normalizeReleaseEvidencePath,
  normalizeReleaseNotesOutputPath,
  normalizeReleaseTag,
  normalizeStorefrontUrl,
  normalizeWorkflowRunUrl,
} from "./release-notes-validation.mjs";

const defaultReleaseCheckPath = "artifacts/release/release-check.json";

export function readReleaseNotesCliConfig(args) {
  const config = {
    allowBlocked: false,
    outputPath: null,
    projectStatusArtifact: null,
    releaseArtifact: null,
    releaseCheckPath: defaultReleaseCheckPath,
    releaseTag: null,
    rollbackTarget: null,
    smokeArtifact: null,
    storefrontUrl: null,
    visualArtifact: null,
    workflowRunUrl: null,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === "--allow-blocked") {
      config.allowBlocked = true;
      continue;
    }

    index = readReleaseNotesOption(arg, normalizedArgs, index, config);
  }

  return normalizeReleaseNotesConfig(config);
}

function readReleaseNotesOption(arg, args, index, config) {
  switch (arg) {
    case "--output":
      config.outputPath = readOptionValue(arg, args, index);
      return index + 1;
    case "--project-status-artifact":
      config.projectStatusArtifact = readOptionValue(arg, args, index);
      return index + 1;
    case "--release-artifact":
      config.releaseArtifact = readOptionValue(arg, args, index);
      return index + 1;
    case "--release-check":
      config.releaseCheckPath = readOptionValue(arg, args, index);
      return index + 1;
    case "--release-tag":
      config.releaseTag = readOptionValue(arg, args, index);
      return index + 1;
    case "--rollback-target":
      config.rollbackTarget = readOptionValue(arg, args, index);
      return index + 1;
    case "--smoke-artifact":
      config.smokeArtifact = readOptionValue(arg, args, index);
      return index + 1;
    case "--storefront-url":
      config.storefrontUrl = readOptionValue(arg, args, index);
      return index + 1;
    case "--visual-artifact":
      config.visualArtifact = readOptionValue(arg, args, index);
      return index + 1;
    case "--workflow-run-url":
      config.workflowRunUrl = readOptionValue(arg, args, index);
      return index + 1;
    default:
      return readReleaseTagArgument(arg, config, index);
  }
}

function normalizeReleaseNotesConfig(config) {
  return {
    allowBlocked: config.allowBlocked,
    outputPath: config.outputPath
      ? normalizeReleaseNotesOutputPath(config.outputPath)
      : null,
    releaseArtifact: normalizeArtifactName(
      "release artifact",
      config.releaseArtifact,
    ),
    releaseCheckPath: normalizeReleaseEvidencePath(config.releaseCheckPath),
    projectStatusArtifact: normalizeArtifactName(
      "project status artifact",
      config.projectStatusArtifact,
    ),
    releaseTag: normalizeReleaseTag(config.releaseTag),
    rollbackTarget: normalizePlainValue("rollback target", config.rollbackTarget),
    smokeArtifact: normalizeArtifactName("smoke artifact", config.smokeArtifact),
    storefrontUrl: normalizeStorefrontUrl(config.storefrontUrl),
    visualArtifact: normalizeArtifactName("visual artifact", config.visualArtifact),
    workflowRunUrl: normalizeWorkflowRunUrl(config.workflowRunUrl),
  };
}

function readReleaseTagArgument(arg, config, index) {
  if (arg.startsWith("-")) {
    throw new Error(`Unknown release notes option: ${arg}`);
  }

  if (config.releaseTag) {
    throw new Error("Provide only one release tag.");
  }

  config.releaseTag = arg;
  return index;
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
