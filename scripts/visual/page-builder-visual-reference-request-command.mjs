import { pageBuilderVisualCaptureDefaultOutputDir } from "./page-builder-visual-capture-constants.mjs";
import {
  defaultPageBuilderVisualMissingReferencesOutputPath,
  defaultPageBuilderVisualReferenceExportManifestOutputPath,
  defaultPageBuilderVisualReferenceExportTableOutputPath,
} from "./page-builder-visual-reference-missing-output.mjs";
import {
  createManifestOption,
  createSourceDirOption,
  inferVisualArtifactDir,
  isDefaultReferenceCheckContext,
  joinCommand,
} from "./page-builder-visual-reference-command-context.mjs";

const defaultReferenceRequestCommand = "pnpm visual:references:request";
const defaultPageBuilderVisualReferenceRequestOutputPath =
  "artifacts/visual/page-builder-reference-request.md";

export function createPageBuilderVisualReferenceRequestCommand(report) {
  if (isDefaultReferenceRequestContext(report)) {
    return defaultReferenceRequestCommand;
  }

  const outputDir = inferVisualArtifactDir(report.manifestPath);

  return joinCommand([
    "pnpm",
    "visual:references:request",
    "--",
    ...createSourceDirOption(report),
    ...createReferenceRequestManifestOption(report),
    ...createReferenceRequestOutputOption(report, outputDir),
    ...createReferenceRequestMissingOutputOption(report, outputDir),
    ...createReferenceRequestTableOutputOption(report, outputDir),
    ...createReferenceRequestJsonOutputOption(report, outputDir),
  ]);
}

function isDefaultReferenceRequestContext(report) {
  return (
    isDefaultReferenceCheckContext(report) &&
    readReferenceRequestOutputPath(
      report,
      pageBuilderVisualCaptureDefaultOutputDir,
    ) === defaultPageBuilderVisualReferenceRequestOutputPath &&
    readReferenceRequestMissingOutputPath(
      report,
      pageBuilderVisualCaptureDefaultOutputDir,
    ) === defaultPageBuilderVisualMissingReferencesOutputPath &&
    readReferenceRequestTableOutputPath(
      report,
      pageBuilderVisualCaptureDefaultOutputDir,
    ) === defaultPageBuilderVisualReferenceExportTableOutputPath &&
    readReferenceRequestJsonOutputPath(
      report,
      pageBuilderVisualCaptureDefaultOutputDir,
    ) === defaultPageBuilderVisualReferenceExportManifestOutputPath
  );
}

function readReferenceRequestOutputPath(report, outputDir) {
  return typeof report.requestOutputPath === "string" &&
    report.requestOutputPath.length > 0
    ? report.requestOutputPath
    : readDefaultReferenceRequestOutputPath(report, outputDir);
}

function readReferenceRequestMissingOutputPath(report, outputDir) {
  return typeof report.missingOutputPath === "string" &&
    report.missingOutputPath.length > 0
    ? report.missingOutputPath
    : readDefaultReferenceRequestMissingOutputPath(report, outputDir);
}

function readReferenceRequestTableOutputPath(report, outputDir) {
  return typeof report.tableOutputPath === "string" &&
    report.tableOutputPath.length > 0
    ? report.tableOutputPath
    : readDefaultReferenceRequestTableOutputPath(report, outputDir);
}

function readReferenceRequestJsonOutputPath(report, outputDir) {
  return typeof report.jsonOutputPath === "string" &&
    report.jsonOutputPath.length > 0
    ? report.jsonOutputPath
    : readDefaultReferenceRequestJsonOutputPath(report, outputDir);
}

function createReferenceRequestManifestOption(report) {
  return isDefaultReferenceCheckContext(report) ? [] : createManifestOption(report);
}

function createReferenceRequestOutputOption(report, outputDir) {
  return ["--output", readReferenceRequestOutputPath(report, outputDir)];
}

function createReferenceRequestMissingOutputOption(report, outputDir) {
  return [
    "--missing-output",
    readReferenceRequestMissingOutputPath(report, outputDir),
  ];
}

function createReferenceRequestTableOutputOption(report, outputDir) {
  return ["--table-output", readReferenceRequestTableOutputPath(report, outputDir)];
}

function createReferenceRequestJsonOutputOption(report, outputDir) {
  return [
    "--json-output",
    readReferenceRequestJsonOutputPath(report, outputDir),
  ];
}

function readDefaultReferenceRequestOutputPath(report, outputDir) {
  return isDefaultReferenceCheckContext(report)
    ? defaultPageBuilderVisualReferenceRequestOutputPath
    : `${outputDir}/page-builder-reference-request.md`;
}

function readDefaultReferenceRequestMissingOutputPath(report, outputDir) {
  return isDefaultReferenceCheckContext(report)
    ? defaultPageBuilderVisualMissingReferencesOutputPath
    : `${outputDir}/page-builder-missing-references.txt`;
}

function readDefaultReferenceRequestTableOutputPath(report, outputDir) {
  return isDefaultReferenceCheckContext(report)
    ? defaultPageBuilderVisualReferenceExportTableOutputPath
    : `${outputDir}/page-builder-reference-export-table.tsv`;
}

function readDefaultReferenceRequestJsonOutputPath(report, outputDir) {
  return isDefaultReferenceCheckContext(report)
    ? defaultPageBuilderVisualReferenceExportManifestOutputPath
    : `${outputDir}/page-builder-reference-export-manifest.json`;
}
