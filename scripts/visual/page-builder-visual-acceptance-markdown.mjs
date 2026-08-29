import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxMarkdownTextLength = 420;

export function createPageBuilderVisualAcceptanceMarkdown(
  report,
  checklist,
  options = {},
) {
  const lines = [
    "# Page Builder Visual Acceptance",
    "",
    `Manifest: ${formatCode(options.manifestPath)}`,
    `Status: ${formatCode(report.status)}`,
    `Components accepted: ${report.acceptedComponentCount}/${report.componentCount}`,
    `Viewport evidence accepted: ${report.acceptedViewportCount}/${report.viewportCount}`,
    `Target: >=${report.targets.minVisualMatchPercent}% match, <=${report.targets.maxLayoutDeltaPx}px layout delta, <=${report.targets.maxColorDeltaE} color delta`,
    "",
    "## Evidence Checklist",
    "",
    ...formatChecklistSummary(checklist),
    "",
    "## Viewport Tasks",
    "",
    ...formatViewportTasks(checklist),
    "## Issues",
    "",
    ...formatIssues(report.issues),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export async function writePageBuilderVisualAcceptanceMarkdown(
  outputPath,
  report,
  checklist,
  options = {},
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createPageBuilderVisualAcceptanceMarkdown(report, checklist, options),
    "utf8",
  );
}

function formatChecklistSummary(checklist) {
  if (!checklist) {
    return ["- Checklist: not recorded"];
  }

  return [
    `- Viewports ready: ${checklist.readyViewportCount}/${checklist.viewportCount}`,
    `- Pending viewports: ${checklist.pendingViewportCount}`,
  ];
}

function formatViewportTasks(checklist) {
  if (!Array.isArray(checklist?.components)) {
    return ["- Checklist tasks not recorded.", ""];
  }

  return checklist.components.flatMap(formatComponentTasks);
}

function formatComponentTasks(component) {
  const lines = [
    `### ${formatText(component.component)}`,
    "",
    `- Status: ${formatText(component.status)}`,
  ];
  const viewports = Array.isArray(component.viewports) ? component.viewports : [];

  for (const viewport of viewports) {
    lines.push(...formatViewportTask(viewport));
  }

  lines.push("");
  return lines;
}

function formatViewportTask(viewport) {
  if (viewport.ready) {
    return [`- ${formatText(viewport.viewport)}: ready`];
  }

  return [
    `- ${formatText(viewport.viewport)}: missing ${formatMissing(viewport)}`,
    `  - Expected design reference: ${formatCode(
      viewport.expectedDesignReference,
    )}`,
    `  - Current design reference: ${formatNullableCode(
      viewport.designReference,
    )}`,
    `  - Expected preview screenshot: ${formatCode(
      viewport.expectedPreviewScreenshot,
    )}`,
    `  - Current preview screenshot: ${formatNullableCode(
      viewport.previewScreenshot,
    )}`,
    `  - Reference report: ${formatNullableCode(
      viewport.commands?.referenceReport,
    )}`,
    `  - Capture: ${formatCode(viewport.commands?.capture)}`,
    `  - Import reference: ${formatCode(viewport.commands?.importReference)}`,
    `  - Measure: ${formatCode(viewport.commands?.measure)}`,
    `  - Verify: ${formatCode(viewport.commands?.verify)}`,
  ];
}

function formatIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return ["- None"];
  }

  return issues.map(
    (issue) =>
      `- [${formatText(issue.severity)}] ${formatIssueTarget(issue)}: ${formatText(
        issue.message,
      )}`,
  );
}

function formatIssueTarget(issue) {
  const component = formatText(issue.component);
  const viewport = formatText(issue.viewport);

  if (component === "unknown") {
    return viewport;
  }

  return viewport === "unknown" ? component : `${component}.${viewport}`;
}

function formatMissing(viewport) {
  const missing = Array.isArray(viewport.missing) ? viewport.missing : [];

  if (missing.length === 0) {
    return "unknown";
  }

  return formatText(missing.join(", "));
}

function formatNullableCode(value) {
  return value ? formatCode(value) : "missing";
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
