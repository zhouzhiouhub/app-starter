import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxArtifactTextLength = 420;
const maxVisualChecklistMissingCount = 20;
const maxVisualChecklistTaskCount = 50;

export function createVisualChecklistArtifact(checklist) {
  const pendingTasks = readPendingVisualChecklistTasks(checklist);

  return {
    manifestPath: readTextOrNull(checklist.manifestPath),
    pendingTaskCount: pendingTasks.length,
    pendingTasks: pendingTasks
      .slice(0, maxVisualChecklistTaskCount)
      .map(createVisualChecklistTaskArtifact),
    pendingViewportCount: checklist.pendingViewportCount,
    readyViewportCount: checklist.readyViewportCount,
    viewportCount: checklist.viewportCount,
  };
}

function readPendingVisualChecklistTasks(checklist) {
  if (!Array.isArray(checklist.components)) {
    return [];
  }

  return checklist.components.flatMap((component) =>
    Array.isArray(component.viewports)
      ? component.viewports.filter((viewport) => viewport.ready !== true)
      : [],
  );
}

function createVisualChecklistTaskArtifact(task) {
  const missing = Array.isArray(task.missing) ? task.missing : [];

  return {
    commands: createVisualChecklistCommandsArtifact(task.commands),
    component: readTextOrNull(task.component) ?? "unknown",
    designReference: readTextOrNull(task.designReference),
    expectedDesignReference: readTextOrNull(task.expectedDesignReference),
    expectedPreviewScreenshot: readTextOrNull(task.expectedPreviewScreenshot),
    ...createOptionalSizeArtifact(
      "expectedPreviewScreenshotSize",
      task.expectedPreviewScreenshotSize,
    ),
    missing: missing
      .slice(0, maxVisualChecklistMissingCount)
      .map((item) => readTextOrNull(item) ?? "unknown"),
    missingCount: missing.length,
    previewScreenshot: readTextOrNull(task.previewScreenshot),
    status: readTextOrNull(task.status) ?? "unknown",
    viewport: readTextOrNull(task.viewport) ?? "unknown",
  };
}

function createOptionalSizeArtifact(field, size) {
  return size && Number.isFinite(size.width) && Number.isFinite(size.height)
    ? {
        [field]: {
          height: size.height,
          width: size.width,
        },
      }
    : {};
}

function createVisualChecklistCommandsArtifact(commands) {
  const artifact = {
    acceptPassing: readTextOrNull(commands?.acceptPassing),
    capture: readTextOrNull(commands?.capture),
    importReference: readTextOrNull(commands?.importReference),
    measure: readTextOrNull(commands?.measure),
    verify: readTextOrNull(commands?.verify),
  };
  const referenceReport = readTextOrNull(commands?.referenceReport);

  if (referenceReport) {
    artifact.referenceReport = referenceReport;
  }

  return artifact;
}

function readTextOrNull(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxArtifactTextLength });
}
