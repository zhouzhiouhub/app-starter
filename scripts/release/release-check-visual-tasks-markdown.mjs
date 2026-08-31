export function formatVisualTasksMarkdown(tasks, formatters) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return ["- None"];
  }

  const maxItemCount = formatters.maxItemCount ?? 20;

  return [
    ...tasks
      .slice(0, maxItemCount)
      .flatMap((task) => formatVisualTask(task, formatters)),
    ...formatters.formatHiddenCount(tasks.length, maxItemCount, "visual tasks"),
  ];
}

function formatVisualTask(task, { formatCode, formatText }) {
  const lines = [
    `- ${formatText(task.component)}.${formatText(
      task.viewport,
    )}: missing ${formatMissing(task.missing, formatText)}`,
    `  - Reference: ${formatCode(task.expectedDesignReference)}`,
    `  - Preview: ${formatCode(task.expectedPreviewScreenshot)}${formatSize(
      task.expectedPreviewScreenshotSize,
    )}`,
    `  - Capture: ${formatCode(task.commands?.capture)}`,
  ];

  if (task.commands?.referenceReport) {
    lines.push(
      `  - Reference report: ${formatCode(task.commands.referenceReport)}`,
    );
  }

  lines.push(
    `  - Import: ${formatCode(task.commands?.importReference)}`,
    `  - Measure: ${formatCode(task.commands?.measure)}`,
  );

  if (task.commands?.acceptPassing) {
    lines.push(
      `  - Accept passing: ${formatCode(task.commands.acceptPassing)}`,
    );
  }

  lines.push(`  - Verify: ${formatCode(task.commands?.verify)}`);

  return lines;
}

function formatSize(size) {
  return size && Number.isFinite(size.width) && Number.isFinite(size.height)
    ? ` (${size.width}x${size.height})`
    : "";
}

function formatMissing(values, formatText) {
  return Array.isArray(values) && values.length > 0
    ? values.map(formatText).join(", ")
    : "unknown";
}
