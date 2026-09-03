import { readPendingVisualTasks } from "./project-status-visual-next-actions.mjs";

export function createProjectVisualMeasurementSummary(checklist) {
  const failedViewports = readPendingVisualTasks(checklist)
    .map(createVisualMeasurementFailure)
    .filter(Boolean);

  return {
    failedMeasurementCount: failedViewports.reduce(
      (count, failure) => count + failure.failedMetrics.length,
      0,
    ),
    failedMeasurementViewportCount: failedViewports.length,
    firstFailedMeasurement: failedViewports[0]?.summary ?? null,
  };
}

export function formatProjectVisualMeasurementSummary(visual, options = {}) {
  if (
    !Number.isFinite(visual.failedMeasurementViewportCount) ||
    visual.failedMeasurementViewportCount === 0
  ) {
    return null;
  }

  const formatText = readTextFormatter(options);
  const metricCount = Number.isFinite(visual.failedMeasurementCount)
    ? `, ${visual.failedMeasurementCount} failed metrics`
    : "";
  const firstFailed = visual.firstFailedMeasurement
    ? `, first failed ${formatText(visual.firstFailedMeasurement)}`
    : "";

  return `${visual.failedMeasurementViewportCount} measured viewports failing${metricCount}${firstFailed}`;
}

function createVisualMeasurementFailure(task) {
  const failedMetrics = Array.isArray(task?.missing)
    ? task.missing.filter(isFailedVisualMetricTask)
    : [];

  if (failedMetrics.length === 0) {
    return null;
  }

  return {
    failedMetrics,
    summary: `${task.component}.${task.viewport}: ${failedMetrics.join("; ")}`,
  };
}

function isFailedVisualMetricTask(task) {
  return (
    typeof task === "string" &&
    /^(visualMatchPercent|maxLayoutDeltaPx|maxColorDeltaE)\b.*\(current /u.test(
      task,
    )
  );
}

function readTextFormatter(options) {
  return typeof options.formatText === "function"
    ? options.formatText
    : (value) => String(value);
}
