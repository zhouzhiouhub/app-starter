import {
  createAcceptanceManifestArgument,
  createCaptureOutputDirOption,
  createManifestOption,
  createSourceDirOption,
  inferVisualArtifactDir,
  isDefaultReferenceCheckContext,
  joinCommand,
} from "./page-builder-visual-reference-command-context.mjs";

export {
  createPageBuilderVisualReferenceRequestCommand,
} from "./page-builder-visual-reference-request-command.mjs";

const defaultReferenceCheckCommand = "pnpm visual:references:check";
const defaultMissingPathsCommand = "pnpm --silent visual:references:missing";

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
