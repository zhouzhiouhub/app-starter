import {
  defaultPageBuilderVisualAcceptanceManifestPath,
  defaultPageBuilderVisualReferenceSourceDir,
} from "./page-builder-visual-acceptance-constants.mjs";
import { defaultPageBuilderVisualArtifactDir } from "./page-builder-visual-artifact-check-config.mjs";
import { createArtifactPaths } from "./page-builder-visual-artifact-check-paths.mjs";
import { pageBuilderVisualCaptureDefaultOutputDir } from "./page-builder-visual-capture-constants.mjs";

const defaultReferenceCheckCommand = "pnpm visual:references:check";
const defaultMissingPathsCommand = "pnpm --silent visual:references:missing";
const defaultReferenceRequestCommand = "pnpm visual:references:request";

export function createPageBuilderVisualReferenceCaptureCommand(report) {
  const captureOutputDir = inferVisualArtifactDir(report.manifestPath);

  return joinCommand([
    "pnpm",
    "visual:capture:fixture",
    "--",
    ...createManifestOption(report),
    ...createCaptureOutputDirOption(captureOutputDir),
    "--report",
    `${captureOutputDir}/visual-capture-report.json`,
    "--write-manifest",
  ]);
}

export function createPageBuilderVisualReferenceReportCommand(report) {
  if (isDefaultReferenceCheckContext(report)) {
    return defaultReferenceCheckCommand;
  }

  const outputDir = inferVisualArtifactDir(report.manifestPath);

  return joinCommand([
    "pnpm",
    "visual:references",
    "--",
    ...createSourceDirOption(report),
    ...createManifestOption(report),
    "--output",
    `${outputDir}/visual-reference-import-report.json`,
    "--markdown-output",
    `${outputDir}/visual-reference-import-report.md`,
    "--require-complete",
  ]);
}

export function createPageBuilderVisualReferenceCheckCommand(report) {
  return createPageBuilderVisualReferenceReportCommand(report);
}

export function createPageBuilderVisualReferenceMissingPathsCommand(report) {
  if (isDefaultReferenceCheckContext(report)) {
    return defaultMissingPathsCommand;
  }

  return joinCommand([
    "pnpm",
    "--silent",
    "visual:references",
    "--",
    ...createSourceDirOption(report),
    ...createManifestOption(report),
    "--missing-paths",
  ]);
}

export function createPageBuilderVisualReferenceRequestCommand(report) {
  if (isDefaultReferenceCheckContext(report)) {
    return defaultReferenceRequestCommand;
  }

  const outputDir = inferVisualArtifactDir(report.manifestPath);

  return joinCommand([
    "pnpm",
    "visual:references:request",
    "--",
    ...createSourceDirOption(report),
    ...createManifestOption(report),
    "--output",
    `${outputDir}/page-builder-reference-request.md`,
  ]);
}

export function createPageBuilderVisualReferenceImportWriteCommand(report) {
  return joinCommand([
    "pnpm",
    "visual:references",
    "--",
    ...createSourceDirOption(report),
    ...createManifestOption(report),
    "--write",
    "--require-complete",
  ]);
}

export function createPageBuilderVisualReferenceMeasureCommand(report) {
  return joinCommand([
    "pnpm",
    "visual:measure",
    "--",
    ...createManifestOption(report),
    "--write",
    "--require-complete",
  ]);
}

export function createPageBuilderVisualReferenceAcceptPassingCommand(report) {
  return joinCommand([
    "pnpm",
    "visual:measure",
    "--",
    ...createManifestOption(report),
    "--write",
    "--accept-passing",
    "--require-complete",
  ]);
}

export function createPageBuilderVisualReferenceAcceptanceCommand(report) {
  return joinCommand([
    "pnpm",
    "visual:acceptance",
    "--",
    "--require-accepted",
    ...createAcceptanceManifestArgument(report),
  ]);
}

function createManifestOption(report) {
  const manifestPath = readManifestPath(report);

  if (manifestPath === defaultPageBuilderVisualAcceptanceManifestPath) {
    return [];
  }

  return ["--manifest", manifestPath];
}

function createAcceptanceManifestArgument(report) {
  const manifestPath = readManifestPath(report);

  if (manifestPath === defaultPageBuilderVisualAcceptanceManifestPath) {
    return [];
  }

  return [manifestPath];
}

function joinCommand(parts) {
  return parts.join(" ");
}

function createCaptureOutputDirOption(captureOutputDir) {
  if (captureOutputDir === pageBuilderVisualCaptureDefaultOutputDir) {
    return [];
  }

  return ["--output-dir", captureOutputDir];
}

function inferVisualArtifactDir(manifestPath) {
  const normalized = readManifestPath({ manifestPath }).replaceAll("\\", "/");

  if (normalized === defaultPageBuilderVisualAcceptanceManifestPath) {
    return pageBuilderVisualCaptureDefaultOutputDir;
  }

  if (
    !normalized.startsWith("artifacts/visual/") &&
    !normalized.startsWith("reports/visual/")
  ) {
    return pageBuilderVisualCaptureDefaultOutputDir;
  }

  return normalized.slice(0, normalized.lastIndexOf("/"));
}

function isDefaultReferenceCheckContext(report) {
  const artifactPaths = createArtifactPaths(defaultPageBuilderVisualArtifactDir);

  return (
    readManifestPath(report).replaceAll("\\", "/") === artifactPaths.manifest &&
    readSourceDir(report) === defaultPageBuilderVisualReferenceSourceDir
  );
}

function readManifestPath(report) {
  return typeof report.manifestPath === "string" &&
    report.manifestPath.length > 0
    ? report.manifestPath
    : defaultPageBuilderVisualAcceptanceManifestPath;
}

function readSourceDir(report) {
  return typeof report.sourceDir === "string" && report.sourceDir.length > 0
    ? report.sourceDir
    : defaultPageBuilderVisualReferenceSourceDir;
}

function createSourceDirOption(report) {
  const sourceDir = readSourceDir(report);

  if (sourceDir === defaultPageBuilderVisualReferenceSourceDir) {
    return [];
  }

  return ["--source-dir", sourceDir];
}
