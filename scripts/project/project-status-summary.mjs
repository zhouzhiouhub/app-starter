import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { formatRequiredSourceReferenceAvailability } from "../visual/page-builder-visual-reference-summary-format.mjs";

const maxSummaryLineLength = 320;
const visibleNextActionCount = 2;
const informationalStepLabels = new Set([
  "Input evidence",
  "Keep artifact",
  "Keep artifacts",
  "Local verification inputs",
  "Output record",
  "Preview",
  "Reference",
  "Reference source",
  "Release note inputs",
  "Review args",
  "Visual evidence inputs",
]);

export function formatProjectStatusSummary(artifact) {
  const lines = [
    `Project status summary (${artifact.schemaVersion})`,
    `  Phase: ${artifact.phase}`,
    `  Status: ${artifact.status}`,
    `  Release ready: ${artifact.releaseReady ? "yes" : "no"}`,
    `  Local MVP scope: ${artifact.completionSummary.localMvpScope}`,
    `  Release evidence: ${artifact.completionSummary.releaseEvidenceStatus}`,
    `  Release decision: ${artifact.completionSummary.releaseDecision}`,
    `  Production Smoke: ${formatSmokeSummary(artifact.releaseGate.smoke)}`,
    `  Page Builder Visual: ${formatVisualSummary(artifact.releaseGate.visual)}`,
    `  Blockers: ${artifact.releaseGate.blockerCount}`,
    "  Next:",
    ...formatNextActions(artifact),
    "  Details: pnpm project:status -- --all-actions",
  ];

  return lines.map(formatSummaryLine);
}

function formatSmokeSummary(smoke) {
  return `${smoke.status} (${smoke.summaryStatus})`;
}

function formatVisualSummary(visual) {
  return [
    visual.status,
    `${visual.acceptedViewportCount}/${visual.viewportCount} viewports accepted`,
    `${visual.pendingTaskCount} tasks pending`,
    formatVisualArtifactSummary(visual.artifactCheck),
  ]
    .filter(Boolean)
    .join(", ");
}

function formatVisualArtifactSummary(artifactCheck) {
  if (!artifactCheck) {
    return null;
  }

  return [
    `artifact ${artifactCheck.status}`,
    formatArtifactCounts(artifactCheck),
    formatReferenceImport(artifactCheck.referenceImport),
  ]
    .filter(Boolean)
    .join(", ");
}

function formatArtifactCounts(artifactCheck) {
  const counts = [
    formatCount(
      artifactCheck.presentRequiredFileCount,
      artifactCheck.requiredFileCount,
      "files",
    ),
    formatCount(
      artifactCheck.presentScreenshotCount,
      artifactCheck.expectedScreenshotCount,
      "screenshots",
    ),
  ].filter(Boolean);

  return counts.length > 0 ? counts.join(", ") : null;
}

function formatReferenceImport(referenceImport) {
  if (!referenceImport) {
    return null;
  }

  const firstMissing = Array.isArray(referenceImport.missingReferences)
    ? referenceImport.missingReferences[0]
    : null;
  const missingSuffix = firstMissing ? `, first missing ${firstMissing}` : "";
  const required = formatRequiredReferenceCoverage(referenceImport);

  return `references ${referenceImport.status} (${referenceImport.missingCount} missing, ${referenceImport.updateCount} updates${required}${missingSuffix})`;
}

function formatRequiredReferenceCoverage(referenceImport) {
  const coverage = formatRequiredSourceReferenceAvailability(referenceImport, {
    includeStatusCounts: false,
  });

  return coverage ? `, ${coverage}` : "";
}

function formatCount(present, expected, label) {
  if (!Number.isFinite(present) || !Number.isFinite(expected)) {
    return null;
  }

  return `${present}/${expected} ${label}`;
}

function formatNextActions(artifact) {
  if (!Array.isArray(artifact.nextActions) || artifact.nextActions.length === 0) {
    return ["    - None"];
  }

  const visibleActions = artifact.nextActions.slice(0, visibleNextActionCount);
  const hiddenCount = artifact.nextActionCount - visibleActions.length;
  const lines = visibleActions.flatMap(formatNextAction);

  if (hiddenCount > 0) {
    lines.push(
      `    - ... and ${hiddenCount} more next actions. Run pnpm project:status -- --all-actions.`,
    );
  }

  return lines;
}

function formatNextAction(action) {
  const lines = [`    - ${action.area}: ${action.label}`];
  const firstStep = readSummaryStep(action);

  if (firstStep) {
    lines.push(`      ${firstStep.label}: ${firstStep.value}`);
  } else {
    lines.push(`      Action: ${action.action}`);
  }

  return lines;
}

function readSummaryStep(action) {
  if (!Array.isArray(action.steps) || action.steps.length === 0) {
    return null;
  }

  return action.steps.find(isActionStep) ?? action.steps[0];
}

function isActionStep(step) {
  return (
    typeof step?.label === "string" &&
    typeof step.value === "string" &&
    !informationalStepLabels.has(step.label)
  );
}

function formatSummaryLine(line) {
  const prefix = line.match(/^ */u)?.[0] ?? "";
  const maxLength = Math.max(3, maxSummaryLineLength - prefix.length);

  return `${prefix}${formatSmokeText(line.slice(prefix.length), {
    maxLength,
  })}`;
}
