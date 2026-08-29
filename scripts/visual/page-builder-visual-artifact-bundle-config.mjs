import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance.mjs";
import { readPageBuilderVisualArtifactDir } from "./page-builder-visual-artifact-check.mjs";
import {
  artifactFileNames,
  artifactMarkdownFileNames,
} from "./page-builder-visual-artifact-check-paths.mjs";
import { readCaptureManifestPath } from "./page-builder-visual-capture-manifest.mjs";
import { readPageBuilderVisualFixtureCaptureCliConfig } from "./page-builder-visual-fixture-capture.mjs";
import { readPageBuilderVisualMeasureCliConfig } from "./page-builder-visual-measure.mjs";
import { readPageBuilderVisualReferenceImportCliConfig } from "./page-builder-visual-reference-import.mjs";

const forwardedFlagOptions = new Set(["--skip-build"]);
const forwardedValueOptions = new Set([
  "--base-url",
  "--browser",
  "--start-timeout-ms",
  "--timeout-ms",
]);
const reservedBundleOptions = new Set([
  "--component",
  "--manifest",
  "--output-dir",
  "--report",
  "--viewport",
  "--write-manifest",
]);

export const defaultPageBuilderVisualArtifactBundleSourceManifestPath =
  defaultPageBuilderVisualAcceptanceManifestPath;
export const defaultPageBuilderVisualReferenceSourceDir =
  "docs/visual/page-builder-references";

export function readPageBuilderVisualArtifactBundleCliConfig(
  argv,
  env = process.env,
) {
  const args = stripPnpmSeparator(argv);
  const input = {
    artifactDir:
      env.PAGE_BUILDER_VISUAL_ARTIFACT_DIR ??
      "reports/visual/page-builder-fixture",
    fixtureArgs: [],
    sourceManifestPath:
      env.PAGE_BUILDER_VISUAL_SOURCE_MANIFEST_PATH ??
      defaultPageBuilderVisualArtifactBundleSourceManifestPath,
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    if (option === "--help" || option === "-h") {
      return { help: true };
    }

    index = readArtifactBundleOption(option, args, index, input);
  }

  return normalizeArtifactBundleConfig(input, env);
}

export function normalizeArtifactBundleConfig(input, env = process.env) {
  const artifactDir = readPageBuilderVisualArtifactDir(input.artifactDir);
  const sourceManifestPath = readCaptureManifestPath(input.sourceManifestPath);
  const paths = createPageBuilderVisualArtifactBundlePaths(artifactDir);
  const fixtureCapture = readPageBuilderVisualFixtureCaptureCliConfig(
    [
      ...input.fixtureArgs,
      "--manifest",
      paths.manifest,
      "--output-dir",
      artifactDir,
      "--report",
      paths.captureReport,
      "--write-manifest",
    ],
    env,
  );

  return {
    artifactDir,
    fixtureCapture,
    measure: readPageBuilderVisualMeasureCliConfig([
      "--manifest",
      paths.manifest,
    ]),
    paths,
    referenceImport: readPageBuilderVisualReferenceImportCliConfig([
      "--source-dir",
      defaultPageBuilderVisualReferenceSourceDir,
      "--manifest",
      paths.manifest,
      "--markdown-output",
      paths.referenceImportMarkdown,
      "--require-complete",
    ]),
    sourceManifestPath,
  };
}

export function createPageBuilderVisualArtifactBundlePaths(artifactDir) {
  return {
    artifactCheckMarkdown: `${artifactDir}/visual-artifact-check-report.md`,
    acceptanceMarkdown:
      `${artifactDir}/${artifactMarkdownFileNames.acceptanceMarkdown}`,
    acceptanceReport: `${artifactDir}/${artifactFileNames.acceptanceReport}`,
    captureReport: `${artifactDir}/${artifactFileNames.captureReport}`,
    manifest: `${artifactDir}/${artifactFileNames.manifest}`,
    referenceImportMarkdown:
      `${artifactDir}/${artifactMarkdownFileNames.referenceImportMarkdown}`,
  };
}

function readArtifactBundleOption(option, args, index, input) {
  if (option === "--artifact-dir") {
    input.artifactDir = readOptionValue(option, args, index);
    return index + 1;
  }

  if (option === "--source-manifest") {
    input.sourceManifestPath = readOptionValue(option, args, index);
    return index + 1;
  }

  if (forwardedFlagOptions.has(option)) {
    input.fixtureArgs.push(option);
    return index;
  }

  if (forwardedValueOptions.has(option)) {
    input.fixtureArgs.push(option, readOptionValue(option, args, index));
    return index + 1;
  }

  if (reservedBundleOptions.has(option)) {
    throw new Error(
      `${option} is managed by visual:artifact-bundle and cannot be passed directly.`,
    );
  }

  throw new Error(`Unknown visual artifact bundle option: ${option}`);
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
