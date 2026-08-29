import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact-validation.mjs";

const maxMarkdownItemCount = 20;
const maxMarkdownTextLength = 420;

export function createReleaseEvidenceCheckMarkdown(artifact) {
  assertReleaseEvidenceCheckArtifact(artifact);

  const lines = [
    "# Release Evidence Check",
    "",
    `Generated: ${formatCode(artifact.generatedAt)}`,
    `Status: ${formatCode(artifact.status)}`,
    `Release ready: ${artifact.releaseReady ? "yes" : "no"}`,
    `Blockers: ${artifact.blockerCount}`,
    "",
    "## Production Smoke",
    "",
    ...formatSmokeSummary(artifact.smoke),
    "",
    "## Page Builder Visual",
    "",
    ...formatVisualSummary(artifact.visual),
    "",
    "## Readiness Checklist",
    "",
    ...formatReadinessChecklist(artifact.readinessChecklist),
    "",
    "## Blockers",
    "",
    ...formatBlockers(artifact.blockers, artifact.blockerCount),
    "",
    "## Pending Visual Evidence",
    "",
    ...formatVisualTasks(artifact.visual.checklist?.pendingTasks),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export async function writeReleaseEvidenceCheckMarkdown(outputPath, artifact) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createReleaseEvidenceCheckMarkdown(artifact),
    "utf8",
  );
}

function formatSmokeSummary(smoke) {
  return [
    `- Status: ${formatText(smoke.status)}`,
    `- Report path: ${formatNullableCode(smoke.path)}`,
    `- Summary: ${formatText(smoke.summary.status)}, ${smoke.summary.checkCount} checks, ${smoke.summary.failedCheckCount} failed`,
    `- Production ready: ${smoke.summary.productionReady ? "yes" : "no"}`,
    ...formatSmokeSource(smoke.source),
    ...formatSmokeTraceability(smoke.traceability),
  ];
}

function formatSmokeSource(source) {
  return [
    `- Source repository: ${formatNullableText(source.repository)}`,
    `- Source commit: ${formatNullableText(source.commitSha)}`,
    `- Source run: ${formatNullableText(source.runId)}`,
    `- Source workflow: ${formatNullableText(source.workflow)}`,
    `- Source workflow URL: ${formatNullableText(source.workflowRunUrl)}`,
  ];
}

function formatSmokeTraceability(traceability) {
  if (!Array.isArray(traceability) || traceability.length === 0) {
    return ["- Traceability: none"];
  }

  return [
    "- Traceability:",
    ...traceability
      .slice(0, maxMarkdownItemCount)
      .map(
        (item) =>
          `  - ${formatText(item.label)}: ${formatText(item.status)}${formatAction(
            item.action,
          )}`,
      ),
    ...formatHiddenCount(
      traceability.length,
      maxMarkdownItemCount,
      "traceability items",
    ).map((line) => `  ${line}`),
  ];
}

function formatVisualSummary(visual) {
  return [
    `- Status: ${formatText(visual.status)}`,
    `- Manifest: ${formatNullableCode(visual.manifestPath)}`,
    `- Components accepted: ${visual.acceptedComponentCount}/${visual.componentCount}`,
    `- Viewports accepted: ${visual.acceptedViewportCount}/${visual.viewportCount}`,
    `- Issues: ${visual.issueCount} total, ${visual.errorCount} errors, ${visual.warningCount} warnings`,
    ...formatArtifactCheck(visual.artifactCheck),
    ...formatList("Pending components", visual.pendingComponents),
    ...formatList("Pending viewports", visual.pendingViewports),
    ...formatVisualIssues(visual.issues),
  ];
}

function formatArtifactCheck(check) {
  if (!check) {
    return ["- Artifact check: not recorded"];
  }

  return [
    `- Artifact check: ${formatText(check.status)}`,
    `- Artifact dir: ${formatNullableCode(check.artifactDir)}`,
    `- Artifact files: ${check.presentRequiredFileCount}/${check.requiredFileCount}`,
    `- Artifact screenshots: ${check.presentScreenshotCount}/${check.expectedScreenshotCount}`,
    ...formatVisualIssues(check.issues, "Artifact issues"),
  ];
}

function formatVisualIssues(issues, label = "Visual issues") {
  if (!Array.isArray(issues) || issues.length === 0) {
    return [`- ${label}: none`];
  }

  return [
    `- ${label}:`,
    ...issues
      .slice(0, maxMarkdownItemCount)
      .map((issue) => `  - ${formatIssue(issue)}`),
    ...formatHiddenCount(issues.length, maxMarkdownItemCount, "issues").map(
      (line) => `  ${line}`,
    ),
  ];
}

function formatReadinessChecklist(checklist) {
  if (!checklist || !Array.isArray(checklist.items)) {
    return ["- Not recorded"];
  }

  return checklist.items.flatMap(formatReadinessChecklistItem);
}

function formatReadinessChecklistItem(item) {
  return [
    `- ${formatText(item.label)}: ${formatText(item.status)}`,
    ...formatOptionalChecklistField("Detail", item.detail),
    ...formatOptionalChecklistField("Action", item.action, { maxLength: 1200 }),
    ...formatOptionalChecklistCommand("Bundle", item.bundleCommand),
  ];
}

function formatOptionalChecklistField(label, value, options = {}) {
  return value ? [`  - ${label}: ${formatText(value, options)}`] : [];
}

function formatOptionalChecklistCommand(label, command) {
  return command ? [`  - ${label}: ${formatCode(command)}`] : [];
}

function formatBlockers(blockers, blockerCount) {
  if (!Array.isArray(blockers) || blockers.length === 0) {
    return ["- None"];
  }

  return [
    ...blockers
      .slice(0, maxMarkdownItemCount)
      .map(
        (blocker) =>
          `- ${formatText(blocker.area)}: ${formatText(
            blocker.label,
          )} - ${formatText(blocker.action, { maxLength: 1200 })}`,
      ),
    ...formatHiddenCount(
      blockerCount ?? blockers.length,
      maxMarkdownItemCount,
      "blockers",
    ),
  ];
}

function formatVisualTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return ["- None"];
  }

  return [
    ...tasks
      .slice(0, maxMarkdownItemCount)
      .flatMap(formatVisualTask),
    ...formatHiddenCount(tasks.length, maxMarkdownItemCount, "visual tasks"),
  ];
}

function formatVisualTask(task) {
  const lines = [
    `- ${formatText(task.component)}.${formatText(
      task.viewport,
    )}: missing ${formatMissing(task.missing)}`,
    `  - Reference: ${formatCode(task.expectedDesignReference)}`,
    `  - Preview: ${formatCode(task.expectedPreviewScreenshot)}`,
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

function formatList(label, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return [`- ${label}: none`];
  }

  const visible = values.slice(0, maxMarkdownItemCount).map(formatText);
  const hidden = values.length - visible.length;

  return [
    `- ${label}: ${visible.join(", ")}`,
    ...(hidden > 0 ? [`  - ... and ${hidden} more ${label.toLowerCase()}`] : []),
  ];
}

function formatIssue(issue) {
  const target = [issue.component, issue.viewport]
    .filter(Boolean)
    .map(formatText)
    .join(".");

  return [
    target || "unknown",
    `: ${formatText(issue.code)} (${formatText(issue.severity)})`,
    ` - ${formatText(issue.message, { maxLength: 1200 })}`,
  ].join("");
}

function formatAction(action) {
  return action ? `; action: ${formatText(action)}` : "";
}

function formatMissing(values) {
  return Array.isArray(values) && values.length > 0
    ? values.map(formatText).join(", ")
    : "unknown";
}

function formatHiddenCount(count, visibleCount, label) {
  const hidden = count - Math.min(count, visibleCount);
  return hidden > 0 ? [`- ... and ${hidden} more ${label}`] : [];
}

function formatNullableCode(value) {
  return value ? formatCode(value) : "not recorded";
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatNullableText(value) {
  return value ? formatText(value) : "not recorded";
}

function formatText(value, options = {}) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: options.maxLength ?? maxMarkdownTextLength,
  });
}
