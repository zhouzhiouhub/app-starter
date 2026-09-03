export function createPageBuilderVisualMeasurementSummary(checklist) {
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

export function formatPageBuilderVisualMeasurementSummary(summary, options = {}) {
  if (
    !Number.isFinite(summary?.failedMeasurementViewportCount) ||
    summary.failedMeasurementViewportCount === 0
  ) {
    return null;
  }

  const formatText = readTextFormatter(options);
  const metricCount = Number.isFinite(summary.failedMeasurementCount)
    ? `, ${summary.failedMeasurementCount} failed metrics`
    : "";
  const firstFailed = summary.firstFailedMeasurement
    ? `, first failed ${formatText(summary.firstFailedMeasurement)}`
    : "";

  return `${summary.failedMeasurementViewportCount} measured viewports failing${metricCount}${firstFailed}`;
}

function readPendingVisualTasks(checklist) {
  if (!Array.isArray(checklist?.components)) {
    return [];
  }

  return checklist.components.flatMap((component) =>
    Array.isArray(component.viewports)
      ? component.viewports.filter((viewport) => viewport.ready !== true)
      : [],
  );
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
