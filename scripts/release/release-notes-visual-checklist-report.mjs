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
    return ["- Visual checklist tasks: none"];
  }

  const visibleTasks = pendingTasks
    .slice(0, maxVisualChecklistTaskLines)
    .flatMap(formatVisualChecklistTask);
  const hiddenCount = pendingTasks.length - maxVisualChecklistTaskLines;

  return [
    `- Visual checklist tasks: ${formatCount(
      checklist,
      pendingTasks,
    )} pending viewport tasks`,
    ...visibleTasks,
    ...formatHiddenTaskCount(hiddenCount),
  ];
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
    `  - Preview: \`${formatValue(task.expectedPreviewScreenshot)}\``,
    `  - Capture: \`${formatValue(task.commands?.capture)}\``,
    ...formatOptionalCommand(
      "Reference report",
      task.commands?.referenceReport,
    ),
    `  - Import: \`${formatValue(task.commands?.importReference)}\``,
    `  - Measure: \`${formatValue(task.commands?.measure)}\``,
    `  - Verify: \`${formatValue(task.commands?.verify)}\``,
  ];
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
