import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxVisualChecklistTaskLines = 4;
const maxVisualChecklistTextLength = 180;

export function formatVisualChecklist(checklist) {
  if (!checklist) {
    return ["- Visual checklist tasks: not recorded"];
  }

  const pendingTasks = Array.isArray(checklist.pendingTasks)
    ? checklist.pendingTasks
    : [];

  if (pendingTasks.length === 0) {
    return [
      formatManifest(checklist.manifestPath),
      "- Visual checklist tasks: none",
    ];
  }

  const visibleTasks = pendingTasks
    .slice(0, maxVisualChecklistTaskLines)
    .flatMap(formatVisualChecklistTask);
  const hiddenCount = pendingTasks.length - maxVisualChecklistTaskLines;

  return [
    formatManifest(checklist.manifestPath),
    `- Visual checklist tasks: ${formatCount(
      checklist,
      pendingTasks,
    )} pending viewport tasks`,
    ...visibleTasks,
    ...formatHiddenTaskCount(hiddenCount),
  ];
}

function formatManifest(manifestPath) {
  return `- Visual checklist manifest: \`${formatValue(manifestPath)}\``;
}

function formatCount(checklist, pendingTasks) {
  return checklist.pendingTaskCount ?? pendingTasks.length;
}

function formatVisualChecklistTask(task) {
  const label = `${formatValue(task.component)}.${formatValue(task.viewport)}`;
  const missing = Array.isArray(task.missing) ? task.missing : [];

  return [
    `- Visual task ${label}: missing ${formatValue(missing.join(", "))}`,
    `  - Reference: \`${formatValue(task.expectedDesignReference)}\``,
    `  - Preview: \`${formatValue(task.expectedPreviewScreenshot)}\`${formatSize(
      task.expectedPreviewScreenshotSize,
    )}`,
    `  - Capture: \`${formatValue(task.commands?.capture)}\``,
    ...formatOptionalCommand(
      "Reference report",
      task.commands?.referenceReport,
    ),
    `  - Import: \`${formatValue(task.commands?.importReference)}\``,
    `  - Measure: \`${formatValue(task.commands?.measure)}\``,
    ...formatOptionalCommand("Accept passing", task.commands?.acceptPassing),
    `  - Verify: \`${formatValue(task.commands?.verify)}\``,
  ];
}

function formatSize(size) {
  return size && Number.isFinite(size.width) && Number.isFinite(size.height)
    ? ` (${size.width}x${size.height})`
    : "";
}

function formatOptionalCommand(label, command) {
  return command ? [`  - ${label}: \`${formatValue(command)}\``] : [];
}

function formatHiddenTaskCount(hiddenCount) {
  if (hiddenCount <= 0) {
    return [];
  }

  return [`- Visual task: ... and ${hiddenCount} more pending viewport tasks`];
}

function formatValue(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxVisualChecklistTextLength,
  });
}
