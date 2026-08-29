import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance-constants.mjs";

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
