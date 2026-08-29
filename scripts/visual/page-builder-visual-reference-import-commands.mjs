import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance-constants.mjs";
import { pageBuilderVisualCaptureDefaultOutputDir } from "./page-builder-visual-capture-constants.mjs";

export function createPageBuilderVisualReferenceCaptureCommand(report) {
  const captureOutputDir = inferCaptureOutputDir(report.manifestPath);

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

export function createPageBuilderVisualReferenceImportWriteCommand(report) {
  return joinCommand([
    "pnpm",
    "visual:references",
    "--",
    "--source-dir",
    report.sourceDir,
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
  if (report.manifestPath === defaultPageBuilderVisualAcceptanceManifestPath) {
    return [];
  }

  return ["--manifest", report.manifestPath];
}

function createAcceptanceManifestArgument(report) {
  if (report.manifestPath === defaultPageBuilderVisualAcceptanceManifestPath) {
    return [];
  }

  return [report.manifestPath];
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

function inferCaptureOutputDir(manifestPath) {
  const normalized = manifestPath.replaceAll("\\", "/");

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
