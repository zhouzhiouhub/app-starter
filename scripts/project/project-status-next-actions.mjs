import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createProductionSmokeHandoffSteps } from "../smoke/production-smoke-handoff-steps.mjs";
import { createReleaseNotesHandoffSteps } from "../release/release-notes-handoff-steps.mjs";
import { createReleaseEvidenceRequestAction } from "./project-status-release-evidence-action.mjs";
import {
  createPageBuilderVisualReferenceCheckCommand,
  createPageBuilderVisualReferenceMissingPathsCommand,
  createPageBuilderVisualReferenceRequestCommand,
} from "../visual/page-builder-visual-reference-import-commands.mjs";
import {
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";

const maxProjectTextLength = 420;

const pageBuilderVisualArtifactName =
  "page-builder-visual-fixture-<run_number>";
const defaultVisualArtifactDir = "reports/visual/page-builder-fixture";
const defaultVisualReferenceSourceDir = "docs/visual/page-builder-references";

export function createProjectNextActions(check) {
  if (check.releaseReady) {
    return [createReleaseNotesAction()];
  }

  return [
    ...readProjectBlockerActions(check.blockers, {
      smokeReportPath: readText(check.smoke?.path),
      visualArtifactDir:
        readText(check.visualArtifact?.artifactDir) ??
        readText(check.visualArtifactDir),
    }),
    createReleaseEvidenceRequestAction(),
    ...readVisualTaskActions(check.visualChecklist),
  ];
}

function createReleaseNotesAction() {
  return {
    action:
      "Run pnpm release:notes with release tag, workflow run URL, artifact names, storefront URL, and rollback target.",
    area: "Release Notes",
    label: "Generate release record",
    steps: createReleaseNotesHandoffSteps(),
  };
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

function readProjectBlockerActions(blockers, context = {}) {
  return blockers
    .filter((blocker) => !isVisualRecordWarning(blocker))
    .map((blocker) => createBlockerAction(blocker, context));
}

function isVisualRecordWarning(blocker) {
  return (
    blocker.area === "Page Builder Visual" &&
    typeof blocker.label === "string" &&
    blocker.label.startsWith("record_")
  );
}

function createBlockerAction(blocker, context = {}) {
  const action = {
    action: readText(blocker.action) ?? "Review the release evidence blocker.",
    area: readText(blocker.area) ?? "Release",
    label: readText(blocker.label) ?? "Blocked",
  };
  const steps = createBlockerActionSteps(action, context);

  return steps.length > 0 ? { ...action, steps } : action;
}

function createBlockerActionSteps(action, context) {
  const productionSmokeSteps = createProductionSmokeActionSteps(action, context);

  if (productionSmokeSteps.length > 0) {
    return productionSmokeSteps;
  }

  return createPageBuilderVisualActionSteps(action, context);
}

function createProductionSmokeActionSteps(action, context) {
  if (
    action.area !== "Production Smoke" ||
    action.label !== "Production smoke artifact missing"
  ) {
    return [];
  }

  return createProductionSmokeHandoffSteps({
    includeRunWorkflow: true,
    rerunGateCommand: createReleaseCheckCommand(context),
  });
}

function createReleaseCheckCommand(context) {
  const smokeReportPath = context.smokeReportPath ?? "<path>";
  const command = [`pnpm release:check -- --smoke-report ${smokeReportPath}`];

  if (context.visualArtifactDir) {
    command.push(`--visual-artifact-dir ${context.visualArtifactDir}`);
  }

  return command.join(" ");
}

function createPageBuilderVisualActionSteps(action, context) {
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
      "Design request output",
      createVisualReferenceRequestOutputPath(visualContext),
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

function createVisualReferenceRequestOutputPath(visualContext) {
  return visualContext.artifactDir === defaultVisualArtifactDir
    ? defaultPageBuilderVisualReferenceRequestOutputPath
    : `${visualContext.artifactDir}/page-builder-reference-request.md`;
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

function readVisualTaskActions(checklist) {
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

function readText(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxProjectTextLength });
}
