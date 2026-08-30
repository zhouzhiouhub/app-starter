import {
  normalizeArtifactName,
  normalizeLocalVerificationArtifactName,
  normalizePlainValue,
  normalizeProjectStatusPath,
  normalizeReleaseEvidencePath,
  normalizeReleaseNotesOutputPath,
  normalizeReleaseTag,
  normalizeStorefrontUrl,
  normalizeWorkflowRunUrl,
} from "./release-notes-validation.mjs";

const defaultReleaseCheckPath = "artifacts/release/release-check.json";
const defaultProjectStatusPath = "artifacts/release/project-status.json";

export function readReleaseNotesCliConfig(args) {
  const config = {
    allowBlocked: false,
    localVerificationArtifact: null,
    localVerificationRunUrl: null,
    outputPath: null,
    preflightArtifact: null,
    projectStatusArtifact: null,
    projectStatusPath: defaultProjectStatusPath,
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
    case "--local-verification-artifact":
      config.localVerificationArtifact = readOptionValue(arg, args, index);
      return index + 1;
    case "--local-verification-run-url":
      config.localVerificationRunUrl = readOptionValue(arg, args, index);
      return index + 1;
    case "--output":
      config.outputPath = readOptionValue(arg, args, index);
      return index + 1;
    case "--project-status-artifact":
      config.projectStatusArtifact = readOptionValue(arg, args, index);
      return index + 1;
    case "--preflight-artifact":
      config.preflightArtifact = readOptionValue(arg, args, index);
      return index + 1;
    case "--project-status":
      config.projectStatusPath = readOptionValue(arg, args, index);
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
    localVerificationArtifact: normalizeLocalVerificationArtifactName(
      config.localVerificationArtifact,
    ),
    localVerificationRunUrl: normalizeWorkflowRunUrl(
      config.localVerificationRunUrl,
    ),
    releaseCheckPath: normalizeReleaseEvidencePath(config.releaseCheckPath),
    projectStatusArtifact: normalizeArtifactName(
      "project status artifact",
      config.projectStatusArtifact,
    ),
    projectStatusPath: normalizeProjectStatusPath(config.projectStatusPath),
    releaseTag: normalizeReleaseTag(config.releaseTag),
    rollbackTarget: normalizePlainValue(
      "rollback target",
      config.rollbackTarget,
    ),
    smokeArtifact: normalizeArtifactName(
      "smoke artifact",
      config.smokeArtifact,
    ),
    preflightArtifact: normalizeArtifactName(
      "preflight artifact",
      config.preflightArtifact,
    ),
    storefrontUrl: normalizeStorefrontUrl(config.storefrontUrl),
    visualArtifact: normalizeArtifactName(
      "visual artifact",
      config.visualArtifact,
    ),
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
