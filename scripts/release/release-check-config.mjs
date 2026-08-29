import { defaultPageBuilderVisualAcceptanceManifestPath } from "../visual/page-builder-visual-acceptance-constants.mjs";
import { readPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check-config.mjs";
import { createArtifactPaths } from "../visual/page-builder-visual-artifact-check-paths.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { normalizeSmokeReportPath } from "../smoke/smoke-report-path-config.mjs";
import { normalizeReleaseCheckMarkdownPath } from "./release-notes-validation.mjs";

export function readReleaseCheckCliConfig(args) {
  const config = {
    allVisualTasks: false,
    checklist: false,
    json: false,
    markdownOutputPath: null,
    outputPath: null,
    smokeReportPath: null,
    visualArtifactDir: null,
    visualManifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
  };
  let visualManifestPathExplicit = false;
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === "--latest") {
      config.smokeReportPath = null;
      continue;
    }

    if (arg === "--json") {
      config.json = true;
      continue;
    }

    if (arg === "--checklist") {
      config.checklist = true;
      continue;
    }

    if (arg === "--all-visual-tasks") {
      config.allVisualTasks = true;
      continue;
    }

    if (arg === "--output") {
      config.outputPath = normalizeReleaseCheckOutputPath(
        readOptionValue(arg, normalizedArgs, index),
      );
      index += 1;
      continue;
    }

    if (arg === "--markdown-output") {
      config.markdownOutputPath = normalizeReleaseCheckMarkdownPath(
        readOptionValue(arg, normalizedArgs, index),
      );
      index += 1;
      continue;
    }

    if (arg === "--smoke-report") {
      config.smokeReportPath = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (arg === "--visual-manifest") {
      config.visualManifestPath = readOptionValue(arg, normalizedArgs, index);
      visualManifestPathExplicit = true;
      index += 1;
      continue;
    }

    if (arg === "--visual-artifact-dir") {
      config.visualArtifactDir = readPageBuilderVisualArtifactDir(
        readOptionValue(arg, normalizedArgs, index),
      );
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

  if (config.visualArtifactDir && !visualManifestPathExplicit) {
    config.visualManifestPath = createArtifactPaths(config.visualArtifactDir)
      .manifest;
  }

  return config;
}

export function normalizeReleaseCheckOutputPath(value) {
  try {
    return normalizeSmokeReportPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "SMOKE_REPORT_PATH",
        "Release check output",
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
