import { createArtifactPaths } from "../visual/page-builder-visual-artifact-check-paths.mjs";
import { defaultPageBuilderVisualReferenceSourceDir } from "../visual/page-builder-visual-acceptance-actions.mjs";
import { defaultPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check-config.mjs";
import {
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
} from "../visual/page-builder-visual-reference-import-commands.mjs";

const defaultVisualEvidenceAction = createDefaultVisualEvidenceAction();

export const visualArtifactAction =
  "Run pnpm visual:artifact-check against the downloaded Page Builder Visual " +
  "artifact, then rerun Production Smoke with a complete artifact pair.";

export function readVisualChecklistManifestPath(input = {}) {
  const artifactDir =
    readText(input.visualArtifact?.artifactDir) ??
    readText(input.visualArtifactDir);

  if (artifactDir) {
    return createArtifactPaths(artifactDir).manifest;
  }

  const manifestPath = readText(input.visualManifestPath);

  if (isVisualArtifactManifestPath(manifestPath)) {
    return manifestPath;
  }

  return createArtifactPaths(defaultPageBuilderVisualArtifactDir).manifest;
}

export function createVisualEvidenceAction(artifact) {
  if (artifact?.status !== "complete" || !artifact.artifactDir) {
    return defaultVisualEvidenceAction;
  }

  const paths = createArtifactPaths(artifact.artifactDir);
  const commandReport = {
    manifestPath: paths.manifest,
    sourceDir: defaultPageBuilderVisualReferenceSourceDir,
  };

  return [
    "Fixture artifact is complete.",
    `Attach real design references under ${commandReport.sourceDir},`,
    `run ${createPageBuilderVisualReferenceImportWriteCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceCaptureCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceMeasureCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceAcceptPassingCommand(commandReport)} after review passes,`,
    `then ${createPageBuilderVisualReferenceAcceptanceCommand(commandReport)}.`,
  ].join(" ");
}

function createDefaultVisualEvidenceAction() {
  const paths = createArtifactPaths(defaultPageBuilderVisualArtifactDir);
  const commandReport = {
    manifestPath: paths.manifest,
    sourceDir: defaultPageBuilderVisualReferenceSourceDir,
  };

  return [
    `Run pnpm visual:artifact-bundle -- --artifact-dir ${defaultPageBuilderVisualArtifactDir} to refresh retained fixture evidence,`,
    `run ${createVisualChecklistCommand(paths)} to archive the checklist,`,
    `attach real design references under ${commandReport.sourceDir},`,
    `run ${createVisualReferenceReportCommand(commandReport, paths)} to archive reference import review,`,
    `run ${createPageBuilderVisualReferenceImportWriteCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceCaptureCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceMeasureCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceAcceptPassingCommand(commandReport)} after review passes,`,
    `then ${createPageBuilderVisualReferenceAcceptanceCommand(commandReport)}.`,
  ].join(" ");
}

function createVisualChecklistCommand(paths) {
  return joinCommand([
    "pnpm",
    "visual:acceptance",
    "--",
    "--checklist",
    "--output",
    paths.acceptanceReport,
    "--markdown-output",
    paths.acceptanceMarkdown,
    paths.manifest,
  ]);
}

function createVisualReferenceReportCommand(report, paths) {
  return joinCommand([
    "pnpm",
    "visual:references",
    "--",
    "--source-dir",
    report.sourceDir,
    "--manifest",
    report.manifestPath,
    "--output",
    paths.referenceImportReport,
    "--markdown-output",
    paths.referenceImportMarkdown,
    "--require-complete",
  ]);
}

function isVisualArtifactManifestPath(value) {
  const normalized = value?.replaceAll("\\", "/");

  return (
    normalized?.startsWith("artifacts/visual/") ||
    normalized?.startsWith("reports/visual/")
  );
}

function readText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.replaceAll("\\", "/") : null;
}

function joinCommand(parts) {
  return parts.join(" ");
}
