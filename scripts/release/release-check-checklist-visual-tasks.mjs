const maxVisibleVisualTasks = 2;

export function readVisibleVisualTasks(checklist, options = {}) {
  const tasks = readPendingVisualTasks(checklist);

  if (tasks.length === 0) {
    return null;
  }

  const visibleTaskCount = options.includeAllVisualTasks
    ? tasks.length
    : maxVisibleVisualTasks;

  return {
    hiddenCount: Math.max(0, tasks.length - visibleTaskCount),
    items: tasks.slice(0, visibleTaskCount).map(createVisualTaskSummary),
  };
}

export function formatVisualTasks(item) {
  if (!item.tasks || item.tasks.items.length === 0) {
    return [];
  }

  const lines = ["    Visual tasks:"];

  for (const task of item.tasks.items) {
    lines.push(
      `      - ${task.component}.${task.viewport}: missing ${task.missing.join(
        ", ",
      )}`,
    );
    lines.push(`        Reference: ${task.expectedDesignReference}`);
    lines.push(`        Preview: ${formatExpectedPreviewScreenshot(task)}`);
    lines.push(`        Capture: ${task.capture}`);
    if (task.referenceReport) {
      lines.push(`        Reference report: ${task.referenceReport}`);
    }
    lines.push(`        Import: ${task.importReference}`);
    lines.push(`        Measure: ${task.measure}`);
    if (task.acceptPassing) {
      lines.push(`        Accept passing: ${task.acceptPassing}`);
    }
    lines.push(`        Verify: ${task.verify}`);
  }

  if (item.tasks.hiddenCount > 0) {
    lines.push(
      `      - ... and ${item.tasks.hiddenCount} more visual viewport tasks. Use --all-visual-tasks with --checklist to list every visual task.`,
    );
  }

  return lines;
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

function createVisualTaskSummary(task) {
  return {
    acceptPassing: task.commands?.acceptPassing ?? null,
    capture: task.commands?.capture ?? null,
    component: task.component,
    expectedDesignReference: task.expectedDesignReference,
    expectedPreviewScreenshot: task.expectedPreviewScreenshot,
    expectedPreviewScreenshotSize: task.expectedPreviewScreenshotSize,
    importReference: task.commands?.importReference ?? null,
    measure: task.commands?.measure ?? null,
    missing: Array.isArray(task.missing) ? task.missing : [],
    referenceReport: task.commands?.referenceReport ?? null,
    verify: task.commands?.verify ?? null,
    viewport: task.viewport,
  };
}

function formatExpectedPreviewScreenshot(task) {
  return `${task.expectedPreviewScreenshot}${formatSize(
    task.expectedPreviewScreenshotSize,
  )}`;
}

function formatSize(size) {
  return size && Number.isFinite(size.width) && Number.isFinite(size.height)
    ? ` (${size.width}x${size.height})`
    : "";
}
