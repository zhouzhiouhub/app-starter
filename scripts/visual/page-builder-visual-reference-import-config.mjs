import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance-constants.mjs";
import {
  normalizeVisualAcceptanceMarkdownOutputPath,
  normalizeVisualAcceptanceOutputPath,
} from "./page-builder-visual-acceptance-output-paths.mjs";
import { normalizeDirectoryPathSeparators } from "../safe-path-separators.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";

const allowedSourceDirs = ["docs", "artifacts/visual", "reports/visual"];
const unsafeSourceDirCharacters = new Set(["`", '"', "'"]);

export function readPageBuilderVisualReferenceImportCliConfig(argv) {
  const args = stripPnpmSeparator(argv);
  const input = {
    json: false,
    manifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
    markdownOutputPath: null,
    outputPath: null,
    requireComplete: false,
    sourceDir: null,
    write: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    if (option === "--help" || option === "-h") {
      return { help: true };
    }

    index = readReferenceImportOption(option, args, index, input);
  }

  if (!input.sourceDir) {
    throw new Error("--source-dir is required.");
  }

  return {
    json: input.json,
    manifestPath: input.manifestPath,
    markdownOutputPath: input.markdownOutputPath
      ? normalizeVisualReferenceImportMarkdownOutputPath(
          input.markdownOutputPath,
        )
      : null,
    outputPath: input.outputPath
      ? normalizeVisualReferenceImportOutputPath(input.outputPath)
      : null,
    requireComplete: input.requireComplete,
    sourceDir: normalizeVisualReferenceSourceDir(input.sourceDir),
    write: input.write,
  };
}

export function normalizeVisualReferenceSourceDir(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Visual reference source dir is required.");
  }

  const trimmed = value.trim();

  if (trimmed !== value) {
    throw new Error("Visual reference source dir must not include padding.");
  }

  const sourceDir = normalizeDirectoryPathSeparators(trimmed).replace(
    /^\.\//u,
    "",
  );

  if (!isSafeRelativeDir(sourceDir)) {
    throw new Error(
      "Visual reference source dir must be a safe relative directory under docs/, artifacts/visual/, or reports/visual/.",
    );
  }

  return sourceDir;
}

export function normalizeVisualReferenceImportMarkdownOutputPath(value) {
  try {
    return normalizeVisualAcceptanceMarkdownOutputPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "Visual acceptance Markdown",
        "Visual reference import Markdown",
      ),
    );
  }
}

export function normalizeVisualReferenceImportOutputPath(value) {
  try {
    return normalizeVisualAcceptanceOutputPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "Visual acceptance output",
        "Visual reference import output",
      ),
    );
  }
}

function readReferenceImportOption(option, args, index, input) {
  switch (option) {
    case "--json":
      input.json = true;
      return index;
    case "--manifest":
      input.manifestPath = readOptionValue(option, args, index);
      return index + 1;
    case "--markdown-output":
      input.markdownOutputPath = readOptionValue(option, args, index);
      return index + 1;
    case "--output":
      input.outputPath = readOptionValue(option, args, index);
      return index + 1;
    case "--require-complete":
      input.requireComplete = true;
      return index;
    case "--source-dir":
      input.sourceDir = readOptionValue(option, args, index);
      return index + 1;
    case "--write":
      input.write = true;
      return index;
    default:
      return readSourceDirArgument(option, input, index);
  }
}

function readSourceDirArgument(option, input, index) {
  if (option.startsWith("-")) {
    throw new Error(`Unknown visual reference import option: ${option}`);
  }

  if (input.sourceDir) {
    throw new Error("Provide only one visual reference source dir.");
  }

  input.sourceDir = option;
  return index;
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function isSafeRelativeDir(value) {
  return (
    value.length > 0 &&
    !hasProtocol(value) &&
    !value.startsWith("/") &&
    !value.startsWith(".") &&
    !hasUnsafeCharacter(value) &&
    !hasUnsafePathSegment(value) &&
    allowedSourceDirs.some(
      (root) => value === root || value.startsWith(`${root}/`),
    )
  );
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

function hasUnsafeCharacter(value) {
  for (const character of value) {
    if (character < " " || unsafeSourceDirCharacters.has(character)) {
      return true;
    }
  }

  return false;
}

function hasUnsafePathSegment(value) {
  return value.split("/").some((segment) => segment === "" || segment === "..");
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}
