import {
  defaultPageBuilderVisualAcceptanceManifestPath,
  defaultPageBuilderVisualReferenceSourceDir,
} from "./page-builder-visual-acceptance-constants.mjs";
import { defaultPageBuilderVisualArtifactDir } from "./page-builder-visual-artifact-check-config.mjs";
import { createArtifactPaths } from "./page-builder-visual-artifact-check-paths.mjs";
import { pageBuilderVisualCaptureDefaultOutputDir } from "./page-builder-visual-capture-constants.mjs";

export function createManifestOption(report) {
  const manifestPath = readManifestPath(report);

  if (manifestPath === defaultPageBuilderVisualAcceptanceManifestPath) {
    return [];
  }

  return ["--manifest", manifestPath];
}

export function createAcceptanceManifestArgument(report) {
  const manifestPath = readManifestPath(report);

  if (manifestPath === defaultPageBuilderVisualAcceptanceManifestPath) {
    return [];
  }

  return [manifestPath];
}

export function joinCommand(parts) {
  return parts.join(" ");
}

export function createCaptureOutputDirOption(captureOutputDir) {
  if (captureOutputDir === pageBuilderVisualCaptureDefaultOutputDir) {
    return [];
  }

  return ["--output-dir", captureOutputDir];
}

export function inferVisualArtifactDir(manifestPath) {
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

export function isDefaultReferenceCheckContext(report) {
  const artifactPaths = createArtifactPaths(defaultPageBuilderVisualArtifactDir);

  return (
    readManifestPath(report).replaceAll("\\", "/") === artifactPaths.manifest &&
    readSourceDir(report) === defaultPageBuilderVisualReferenceSourceDir
  );
}

export function readManifestPath(report) {
  return typeof report.manifestPath === "string" &&
    report.manifestPath.length > 0
    ? report.manifestPath
    : defaultPageBuilderVisualAcceptanceManifestPath;
}

export function readSourceDir(report) {
  return typeof report.sourceDir === "string" && report.sourceDir.length > 0
    ? report.sourceDir
    : defaultPageBuilderVisualReferenceSourceDir;
}

export function createSourceDirOption(report) {
  const sourceDir = readSourceDir(report);

  if (sourceDir === defaultPageBuilderVisualReferenceSourceDir) {
    return [];
  }

  return ["--source-dir", sourceDir];
}
