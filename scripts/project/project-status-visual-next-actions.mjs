import {
  createPageBuilderVisualReferenceCheckCommand,
  createPageBuilderVisualReferenceMissingPathsCommand,
  createPageBuilderVisualReferenceRequestCommand,
} from "../visual/page-builder-visual-reference-import-commands.mjs";
import {
  createPageBuilderVisualReferenceHandoffCommand,
  defaultPageBuilderVisualReferenceHandoffOutputDir,
} from "../visual/page-builder-visual-reference-handoff.mjs";
import {
  defaultPageBuilderVisualMissingReferencesOutputPath,
  defaultPageBuilderVisualReferenceExportManifestOutputPath,
  defaultPageBuilderVisualReferenceExportTableOutputPath,
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";

const pageBuilderVisualArtifactName =
  "page-builder-visual-fixture-<run_number>";
const defaultVisualArtifactDir = "reports/visual/page-builder-fixture";
const defaultVisualReferenceSourceDir = "docs/visual/page-builder-references";

export function createPageBuilderVisualActionSteps(action, context) {
  if (
    action.area !== "Page Builder Visual" ||
    action.label !== "Visual acceptance pending"
  ) {
    return [];
  }

  const visualContext = createPageBuilderVisualActionContext(context);

  return [
    createNextActionStep("Reference source", defaultVisualReferenceSourceDir),
    createNextActionStep(
      "Missing paths",
      createPageBuilderVisualReferenceMissingPathsCommand({
        manifestPath: visualContext.manifestPath,
        sourceDir: defaultVisualReferenceSourceDir,
      }),
    ),
    createNextActionStep(
      "Design request",
      createPageBuilderVisualReferenceRequestCommand({
        manifestPath: visualContext.manifestPath,
        sourceDir: defaultVisualReferenceSourceDir,
      }),
    ),
    createNextActionStep(
      "Design handoff package",
      createPageBuilderVisualReferenceHandoffCommand({
        manifestPath: visualContext.manifestPath,
        outputDir: defaultPageBuilderVisualReferenceHandoffOutputDir,
        sourceDir: defaultVisualReferenceSourceDir,
      }),
    ),
    createNextActionStep(
      "Design handoff output",
      defaultPageBuilderVisualReferenceHandoffOutputDir,
    ),
    createNextActionStep(
      "Design request output",
      createVisualReferenceRequestOutputPath(visualContext),
    ),
    createNextActionStep(
      "Missing paths output",
      createVisualMissingReferencesOutputPath(visualContext),
    ),
    createNextActionStep(
      "Export table output",
      createVisualReferenceExportTableOutputPath(visualContext),
    ),
    createNextActionStep(
      "Export manifest output",
      createVisualReferenceExportManifestOutputPath(visualContext),
    ),
    createNextActionStep(
      "Reference report",
      createPageBuilderVisualReferenceCheckCommand({
        manifestPath: visualContext.manifestPath,
        sourceDir: defaultVisualReferenceSourceDir,
      }),
    ),
    createNextActionStep(
      "Import",
      `pnpm visual:references -- --manifest ${visualContext.manifestPath} --write --require-complete`,
    ),
    createNextActionStep(
      "Capture fixture",
      `pnpm visual:capture:fixture -- --manifest ${visualContext.manifestPath} --output-dir ${visualContext.artifactDir} --report ${visualContext.captureReportPath} --write-manifest`,
    ),
    createNextActionStep(
      "Measure",
      `pnpm visual:measure -- --manifest ${visualContext.manifestPath} --write --require-complete`,
    ),
    createNextActionStep(
      "Accept passing",
      `pnpm visual:measure -- --manifest ${visualContext.manifestPath} --write --accept-passing --require-complete`,
    ),
    createNextActionStep(
      "Verify",
      `pnpm visual:acceptance -- --require-accepted ${visualContext.manifestPath}`,
    ),
    createNextActionStep(
      "Bundle artifact",
      `pnpm visual:artifact-bundle -- --artifact-dir ${visualContext.artifactDir}`,
    ),
    createNextActionStep(
      "Check artifact",
      `pnpm visual:artifact-check -- --artifact-dir ${visualContext.artifactDir} --output ${visualContext.artifactCheckJsonReportPath} --markdown-output ${visualContext.artifactCheckReportPath}`,
    ),
    createNextActionStep("Keep artifact", pageBuilderVisualArtifactName),
  ];
}

export function readPendingVisualTasks(checklist) {
  if (!Array.isArray(checklist?.components)) {
    return [];
  }

  return checklist.components.flatMap((component) =>
    Array.isArray(component.viewports)
      ? component.viewports.filter((viewport) => viewport.ready !== true)
      : [],
  );
}

export function readVisualTaskActions(checklist) {
  return readPendingVisualTasks(checklist).map((task) => ({
    action: [
      `Place ${task.expectedDesignReference}.`,
      `Capture ${formatExpectedPreviewScreenshot(task)}.`,
      task.commands?.capture ? `Run ${task.commands.capture}.` : null,
      task.commands?.referenceReport
        ? `Run ${task.commands.referenceReport}.`
        : null,
      task.commands?.importReference
        ? `Run ${task.commands.importReference}.`
        : null,
      task.commands?.measure ? `Run ${task.commands.measure}.` : null,
      task.commands?.acceptPassing
        ? `Run ${task.commands.acceptPassing} after review passes.`
        : null,
      task.commands?.verify ? `Verify with ${task.commands.verify}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
    area: "Page Builder Visual",
    label: `${task.component}.${task.viewport}`,
    steps: createVisualTaskActionSteps(task),
  }));
}

function createVisualReferenceRequestOutputPath(visualContext) {
  return visualContext.artifactDir === defaultVisualArtifactDir
    ? defaultPageBuilderVisualReferenceRequestOutputPath
    : `${visualContext.artifactDir}/page-builder-reference-request.md`;
}

function createVisualMissingReferencesOutputPath(visualContext) {
  return visualContext.artifactDir === defaultVisualArtifactDir
    ? defaultPageBuilderVisualMissingReferencesOutputPath
    : `${visualContext.artifactDir}/page-builder-missing-references.txt`;
}

function createVisualReferenceExportTableOutputPath(visualContext) {
  return visualContext.artifactDir === defaultVisualArtifactDir
    ? defaultPageBuilderVisualReferenceExportTableOutputPath
    : `${visualContext.artifactDir}/page-builder-reference-export-table.tsv`;
}

function createVisualReferenceExportManifestOutputPath(visualContext) {
  return visualContext.artifactDir === defaultVisualArtifactDir
    ? defaultPageBuilderVisualReferenceExportManifestOutputPath
    : `${visualContext.artifactDir}/page-builder-reference-export-manifest.json`;
}

function createPageBuilderVisualActionContext(context) {
  const artifactDir = context.visualArtifactDir ?? defaultVisualArtifactDir;

  return {
    artifactDir,
    artifactCheckJsonReportPath:
      `${artifactDir}/visual-artifact-check-report.json`,
    artifactCheckReportPath: `${artifactDir}/visual-artifact-check-report.md`,
    captureReportPath: `${artifactDir}/visual-capture-report.json`,
    manifestPath: `${artifactDir}/page-builder-visual-acceptance.json`,
  };
}

function createVisualTaskActionSteps(task) {
  return [
    createNextActionStep("Reference", task.expectedDesignReference),
    createNextActionStep("Preview", formatExpectedPreviewScreenshot(task)),
    createNextActionStep("Capture", task.commands?.capture),
    createNextActionStep("Reference report", task.commands?.referenceReport),
    createNextActionStep("Import", task.commands?.importReference),
    createNextActionStep("Measure", task.commands?.measure),
    createNextActionStep("Accept passing", task.commands?.acceptPassing),
    createNextActionStep("Verify", task.commands?.verify),
  ].filter(Boolean);
}

function formatExpectedPreviewScreenshot(task) {
  if (
    typeof task.expectedPreviewScreenshot !== "string" ||
    task.expectedPreviewScreenshot.length === 0
  ) {
    return null;
  }

  return `${task.expectedPreviewScreenshot}${formatSize(
    task.expectedPreviewScreenshotSize,
  )}`;
}

function formatSize(size) {
  return size && Number.isFinite(size.width) && Number.isFinite(size.height)
    ? ` (${size.width}x${size.height})`
    : "";
}

function createNextActionStep(label, value) {
  return typeof value === "string" && value.length > 0
    ? {
        label,
        value,
      }
    : null;
}
