import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { assertProjectStatusArtifact } from "./project-status-validation.mjs";

const maxProjectLineLength = 420;

export function formatProjectStatusArtifact(artifact, options = {}) {
  const lines = [
    `Project status (${artifact.schemaVersion})`,
    `  Phase: ${artifact.phase}`,
    `  Status: ${artifact.status}`,
    `  Release ready: ${artifact.releaseReady ? "yes" : "no"}`,
    "  Completion:",
    ...formatCompletionSummary(artifact.completionSummary),
    "  Completion checklist:",
    ...formatCompletionChecklist(artifact.completionChecklist),
    "  Completed milestones:",
    ...artifact.completedMilestones.map((milestone) => `    - ${milestone}`),
    "  Release gate:",
    `    - Production Smoke: ${artifact.releaseGate.smoke.status} (${artifact.releaseGate.smoke.summaryStatus})`,
    `    - Page Builder Visual: ${formatVisualGate(artifact.releaseGate.visual)}`,
    `    - Blockers: ${artifact.releaseGate.blockerCount}`,
    "  Local verification:",
    ...formatLocalVerification(artifact.localVerification),
    "  Next actions:",
    ...formatProjectNextActions(artifact),
  ];

  return lines.map((line) => formatProjectLine(line, options));
}

function formatCompletionSummary(summary) {
  return [
    `    - Local MVP scope: ${summary.localMvpScope}`,
    `    - Release evidence: ${summary.releaseEvidenceStatus}`,
    `    - Release decision: ${summary.releaseDecision}`,
    `    - Summary: ${summary.summary}`,
  ];
}

function formatCompletionChecklist(checklist) {
  if (!checklist || !Array.isArray(checklist.items)) {
    return ["    - Not recorded"];
  }

  return checklist.items.flatMap(formatCompletionChecklistItem);
}

function formatCompletionChecklistItem(item) {
  const lines = [`    - ${item.label}: ${item.status} - ${item.evidence}`];

  if (typeof item.nextAction === "string") {
    lines.push(`      Next: ${item.nextAction}`);
  }

  if (Array.isArray(item.nextSteps) && item.nextSteps.length > 0) {
    lines.push("      Next steps:");
    lines.push(
      ...item.nextSteps.map(
        (step) => `        - ${step.label}: ${step.value}`,
      ),
    );
  }

  return lines;
}

function formatLocalVerification(localVerification) {
  if (!Array.isArray(localVerification?.commands)) {
    return ["    - Not recorded"];
  }

  return [
    ...formatLocalVerificationShortcut(localVerification),
    ...localVerification.commands.map(
      (item) => `    - ${item.label}: ${item.command} (${item.status})`,
    ),
  ];
}

function formatLocalVerificationShortcut(localVerification) {
  const lines = [];

  if (typeof localVerification.shortcut === "string") {
    lines.push(`    - Shortcut: ${localVerification.shortcut}`);
  }

  if (typeof localVerification.handoff?.jsonPath === "string") {
    lines.push(`    - Handoff JSON: ${localVerification.handoff.jsonPath}`);
  }

  if (typeof localVerification.handoff?.markdownPath === "string") {
    lines.push(
      `    - Handoff Markdown: ${localVerification.handoff.markdownPath}`,
    );
  }

  return lines;
}

export async function writeProjectStatusArtifact(outputPath, artifact) {
  assertProjectStatusArtifact(artifact);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

function formatVisualGate(visual) {
  return [
    `${visual.status}`,
    `components ${visual.acceptedComponentCount}/${visual.componentCount}`,
    `viewports ${visual.acceptedViewportCount}/${visual.viewportCount}`,
    `pending tasks ${visual.pendingTaskCount}`,
    formatVisualArtifactSummary(visual),
  ]
    .filter(Boolean)
    .join(", ");
}

function formatVisualArtifactSummary(visual) {
  const status = visual.artifactCheck?.status ?? visual.artifactStatus;

  if (!status) {
    return null;
  }

  return `artifact ${status}${formatVisualArtifactDetails(visual.artifactCheck)}`;
}

function formatVisualArtifactDetails(artifactCheck) {
  if (!artifactCheck) {
    return "";
  }

  const detailText = [
    formatVisualArtifactDir(artifactCheck.artifactDir),
    formatVisualArtifactCount(
      artifactCheck.presentRequiredFileCount,
      artifactCheck.requiredFileCount,
      "files",
    ),
    formatVisualArtifactCount(
      artifactCheck.presentScreenshotCount,
      artifactCheck.expectedScreenshotCount,
      "screenshots",
    ),
    formatVisualArtifactCount(
      artifactCheck.presentDesignReferenceCount,
      artifactCheck.referencedDesignReferenceCount,
      "design references",
    ),
  ].filter(Boolean);

  return detailText.length > 0 ? ` (${detailText.join(", ")})` : "";
}

function formatVisualArtifactDir(artifactDir) {
  return typeof artifactDir === "string" && artifactDir.length > 0
    ? artifactDir
    : null;
}

function formatVisualArtifactCount(present, expected, label) {
  if (!Number.isFinite(present) || !Number.isFinite(expected)) {
    return null;
  }

  return `${present}/${expected} ${label}`;
}

function formatProjectNextActions(artifact) {
  if (!Array.isArray(artifact.nextActions) || artifact.nextActions.length === 0) {
    return ["    - None"];
  }

  const lines = artifact.nextActions.flatMap(formatProjectNextAction);
  const hiddenCount = artifact.nextActionCount - artifact.nextActions.length;

  if (hiddenCount > 0) {
    lines.push(
      `    - ... and ${hiddenCount} more next actions. Use --all-actions to list every next action.`,
    );
  }

  return lines;
}

function formatProjectNextAction(action) {
  if (!Array.isArray(action.steps) || action.steps.length === 0) {
    return [`    - ${action.area}: ${action.label} - ${action.action}`];
  }

  return [
    `    - ${action.area}: ${action.label}`,
    ...action.steps.map((step) => `      ${step.label}: ${step.value}`),
  ];
}

function formatProjectLine(line, options) {
  const prefix = line.match(/^ */u)?.[0] ?? "";
  const maxLength =
    options.truncateLines === false
      ? null
      : Math.max(3, maxProjectLineLength - prefix.length);

  return `${prefix}${formatSmokeText(line.slice(prefix.length), {
    maxLength,
  })}`;
}
