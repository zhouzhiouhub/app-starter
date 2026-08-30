import { readCaptureOutputDir } from "./page-builder-visual-capture-config.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import {
  normalizeVisualAcceptanceMarkdownOutputPath,
  normalizeVisualAcceptanceOutputPath,
} from "./page-builder-visual-acceptance-output-paths.mjs";

export const defaultPageBuilderVisualArtifactDir =
  "reports/visual/page-builder-fixture";

export function readPageBuilderVisualArtifactDir(value) {
  return readCaptureOutputDir(value);
}

export function readPageBuilderVisualArtifactCheckCliConfig(
  argv,
  env = process.env,
) {
  const args = stripPnpmSeparator(argv);
  const input = {
    artifactDir:
      env.PAGE_BUILDER_VISUAL_ARTIFACT_DIR ??
      defaultPageBuilderVisualArtifactDir,
    json: false,
    markdownOutputPath:
      env.PAGE_BUILDER_VISUAL_ARTIFACT_CHECK_MARKDOWN_PATH ?? null,
    outputPath: env.PAGE_BUILDER_VISUAL_ARTIFACT_CHECK_OUTPUT_PATH ?? null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    if (option === "--help" || option === "-h") {
      return { help: true };
    }

    index = readArtifactCheckOption(option, args, index, input);
  }

  return {
    artifactDir: readPageBuilderVisualArtifactDir(input.artifactDir),
    json: input.json,
    markdownOutputPath: input.markdownOutputPath
      ? normalizeVisualArtifactCheckMarkdownOutputPath(input.markdownOutputPath)
      : null,
    outputPath: input.outputPath
      ? normalizeVisualArtifactCheckOutputPath(input.outputPath)
      : null,
  };
}

export function normalizeVisualArtifactCheckMarkdownOutputPath(value) {
  try {
    return normalizeVisualAcceptanceMarkdownOutputPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "Visual acceptance Markdown",
        "Visual artifact check Markdown",
      ),
    );
  }
}

export function normalizeVisualArtifactCheckOutputPath(value) {
  try {
    return normalizeVisualAcceptanceOutputPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "Visual acceptance output",
        "Visual artifact check output",
      ),
    );
  }
}

function readArtifactCheckOption(option, args, index, input) {
  switch (option) {
    case "--artifact-dir":
      input.artifactDir = readOptionValue(option, args, index);
      return index + 1;
    case "--json":
      input.json = true;
      return index;
    case "--output":
      input.outputPath = readOptionValue(option, args, index);
      return index + 1;
    case "--markdown-output":
      input.markdownOutputPath = readOptionValue(option, args, index);
      return index + 1;
    default:
      throw new Error(`Unknown visual artifact check option: ${option}`);
  }
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function stripPnpmSeparator(argv) {
  return argv[0] === "--" ? argv.slice(1) : argv;
}
