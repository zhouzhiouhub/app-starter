import {
  normalizeProjectStatusMarkdownPath,
  normalizeProjectStatusPath,
  normalizeReleaseCheckMarkdownPath,
  normalizeReleaseEvidencePath,
} from "./release-notes-validation.mjs";
import {
  normalizeProductionSmokePreflightJsonReportPath,
  normalizeProductionSmokePreflightMarkdownReportPath,
} from "./production-smoke-preflight-report.mjs";

const defaultReleaseCheckOutputPath = "artifacts/release/release-check.json";
const defaultReleaseCheckMarkdownPath = "artifacts/release/release-check.md";
const defaultProjectStatusOutputPath = "artifacts/release/project-status.json";
const defaultProjectStatusMarkdownPath = "artifacts/release/project-status.md";
const defaultPreflightOutputPath = "artifacts/release/preflight.json";
const defaultPreflightMarkdownPath = "artifacts/release/preflight.md";

export function readReleaseHandoffCliConfig(args = []) {
  const normalizedArgs = stripPnpmSeparator(args);
  const config = createDefaultReleaseHandoffConfig();

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === "--latest") {
      config.smokeReportPath = null;
      continue;
    }

    if (arg === "--require-ready") {
      config.requireReady = true;
      continue;
    }

    if (arg === "--smoke-report") {
      config.smokeReportPath = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (arg === "--visual-artifact-dir") {
      config.visualArtifactDir = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (arg === "--visual-manifest") {
      config.visualManifestPath = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (readReleaseHandoffOutputOption(config, arg, normalizedArgs, index)) {
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown release handoff option: ${arg}`);
    }

    if (config.smokeReportPath) {
      throw new Error("Provide only one smoke report path.");
    }

    config.smokeReportPath = arg;
  }

  return config;
}

export function createReleaseCheckArgs(config) {
  const args = [
    "--checklist",
    "--all-visual-tasks",
    "--output",
    config.releaseCheckOutputPath,
    "--markdown-output",
    config.releaseCheckMarkdownPath,
  ];

  if (config.smokeReportPath) {
    args.push("--smoke-report", config.smokeReportPath);
  }

  if (config.visualArtifactDir) {
    args.push("--visual-artifact-dir", config.visualArtifactDir);
  }

  if (config.visualManifestPath) {
    args.push("--visual-manifest", config.visualManifestPath);
  }

  return args;
}

function createDefaultReleaseHandoffConfig() {
  return {
    preflightMarkdownPath: normalizeProductionSmokePreflightMarkdownReportPath(
      defaultPreflightMarkdownPath,
    ),
    preflightOutputPath: normalizeProductionSmokePreflightJsonReportPath(
      defaultPreflightOutputPath,
    ),
    projectStatusMarkdownPath: normalizeProjectStatusMarkdownPath(
      defaultProjectStatusMarkdownPath,
    ),
    projectStatusOutputPath: normalizeProjectStatusPath(
      defaultProjectStatusOutputPath,
    ),
    releaseCheckMarkdownPath: normalizeReleaseCheckMarkdownPath(
      defaultReleaseCheckMarkdownPath,
    ),
    releaseCheckOutputPath: normalizeReleaseEvidencePath(
      defaultReleaseCheckOutputPath,
    ),
    requireReady: false,
    smokeReportPath: null,
    visualArtifactDir: null,
    visualManifestPath: null,
  };
}

function readReleaseHandoffOutputOption(config, arg, args, index) {
  if (arg === "--release-check-output") {
    config.releaseCheckOutputPath = normalizeReleaseEvidencePath(
      readOptionValue(arg, args, index),
    );
    return true;
  }

  if (arg === "--release-check-markdown") {
    config.releaseCheckMarkdownPath = normalizeReleaseCheckMarkdownPath(
      readOptionValue(arg, args, index),
    );
    return true;
  }

  if (arg === "--project-status-output") {
    config.projectStatusOutputPath = normalizeProjectStatusPath(
      readOptionValue(arg, args, index),
    );
    return true;
  }

  if (arg === "--project-status-markdown") {
    config.projectStatusMarkdownPath = normalizeProjectStatusMarkdownPath(
      readOptionValue(arg, args, index),
    );
    return true;
  }

  if (arg === "--preflight-output") {
    config.preflightOutputPath =
      normalizeProductionSmokePreflightJsonReportPath(
        readOptionValue(arg, args, index),
      );
    return true;
  }

  if (arg === "--preflight-markdown") {
    config.preflightMarkdownPath =
      normalizeProductionSmokePreflightMarkdownReportPath(
        readOptionValue(arg, args, index),
      );
    return true;
  }

  return false;
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
