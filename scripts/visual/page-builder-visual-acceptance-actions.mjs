import {
  defaultPageBuilderVisualAcceptanceManifestPath,
  defaultPageBuilderVisualReferenceSourceDir,
} from "./page-builder-visual-acceptance-constants.mjs";
import { pageBuilderVisualCaptureDefaultOutputDir } from "./page-builder-visual-capture-constants.mjs";

export function createPageBuilderVisualViewportActions(
  component,
  viewport,
  options = {},
) {
  const context = readActionContext(options);

  return {
    commands: {
      acceptPassing: createPageBuilderVisualAcceptPassingCommand(context),
      capture:
        createPageBuilderVisualViewportCaptureCommand(component, viewport, context),
      importReference: createPageBuilderVisualReferenceImportCommand(context),
      measure: createPageBuilderVisualMeasureCommand(context),
      referenceReport: createPageBuilderVisualReferenceReportCommand(context),
      verify: createPageBuilderVisualVerifyCommand(context),
    },
    expectedDesignReference: createPageBuilderVisualReferencePath(
      component,
      viewport,
      context.referenceSourceDir,
    ),
    expectedPreviewScreenshot: createPageBuilderVisualPreviewPath(
      component,
      viewport,
      context.captureOutputDir,
    ),
  };
}

function readActionContext(options) {
  const manifestPath =
    options.manifestPath ?? defaultPageBuilderVisualAcceptanceManifestPath;

  return {
    captureOutputDir:
      options.captureOutputDir ?? inferCaptureOutputDir(manifestPath),
    manifestPath,
    referenceSourceDir:
      options.referenceSourceDir ?? defaultPageBuilderVisualReferenceSourceDir,
  };
}

function createPageBuilderVisualReferencePath(
  component,
  viewport,
  referenceSourceDir,
) {
  return `${referenceSourceDir}/${component}-${viewport}.png`;
}

function createPageBuilderVisualPreviewPath(
  component,
  viewport,
  captureOutputDir,
) {
  return `${captureOutputDir}/page-builder-visual-fixture-${component}-${viewport}.png`;
}

function createPageBuilderVisualViewportCaptureCommand(
  component,
  viewport,
  context,
) {
  return joinCommand([
    "pnpm",
    "visual:capture:fixture",
    "--",
    "--component",
    component,
    "--viewport",
    viewport,
    ...createManifestOption(context),
    ...createCaptureOutputDirOption(context),
    "--write-manifest",
  ]);
}

function createPageBuilderVisualReferenceImportCommand(context) {
  return joinCommand([
    "pnpm",
    "visual:references",
    "--",
    "--source-dir",
    context.referenceSourceDir,
    ...createManifestOption(context),
    "--write",
    "--require-complete",
  ]);
}

function createPageBuilderVisualReferenceReportCommand(context) {
  return joinCommand([
    "pnpm",
    "visual:references",
    "--",
    "--source-dir",
    context.referenceSourceDir,
    ...createManifestOption(context),
    "--output",
    createPageBuilderVisualReferenceJsonReportPath(context),
    "--markdown-output",
    createPageBuilderVisualReferenceReportPath(context),
    "--require-complete",
  ]);
}

function createPageBuilderVisualMeasureCommand(context) {
  return joinCommand([
    "pnpm",
    "visual:measure",
    "--",
    ...createManifestOption(context),
    "--write",
    "--require-complete",
  ]);
}

function createPageBuilderVisualAcceptPassingCommand(context) {
  return joinCommand([
    "pnpm",
    "visual:measure",
    "--",
    ...createManifestOption(context),
    "--write",
    "--accept-passing",
    "--require-complete",
  ]);
}

function createPageBuilderVisualVerifyCommand(context) {
  return joinCommand([
    "pnpm",
    "visual:acceptance",
    "--",
    "--require-accepted",
    ...createAcceptanceManifestArgument(context),
  ]);
}

function createManifestOption(context) {
  if (context.manifestPath === defaultPageBuilderVisualAcceptanceManifestPath) {
    return [];
  }

  return ["--manifest", context.manifestPath];
}

function createCaptureOutputDirOption(context) {
  if (context.captureOutputDir === pageBuilderVisualCaptureDefaultOutputDir) {
    return [];
  }

  return ["--output-dir", context.captureOutputDir];
}

function createAcceptanceManifestArgument(context) {
  if (context.manifestPath === defaultPageBuilderVisualAcceptanceManifestPath) {
    return [];
  }

  return [context.manifestPath];
}

function joinCommand(parts) {
  return parts.join(" ");
}

function createPageBuilderVisualReferenceReportPath(context) {
  return `${context.captureOutputDir}/visual-reference-import-report.md`;
}

function createPageBuilderVisualReferenceJsonReportPath(context) {
  return `${context.captureOutputDir}/visual-reference-import-report.json`;
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
