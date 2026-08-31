import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatMissingProductionSmokeEvidence } from "../smoke/smoke-missing-evidence-markdown.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  formatMissingVisualReferenceFiles,
  formatVisualReferenceImport,
} from "../visual/page-builder-visual-missing-references-markdown.mjs";
import { formatManifestDesignReferenceSummary } from "../visual/page-builder-visual-reference-summary-format.mjs";
import { assertProjectStatusArtifact } from "./project-status-validation.mjs";
import { formatReleaseEvidenceArtifacts } from "./project-status-release-evidence-artifacts.mjs";

const maxMarkdownTextLength = 420;

export function createProjectStatusMarkdown(artifact) {
  assertProjectStatusArtifact(artifact);

  const lines = [
    "# MVP Release Handoff",
    "",
    `Generated: ${formatCode(artifact.generatedAt)}`,
    `Status: ${formatCode(artifact.status)}`,
    `Release ready: ${artifact.releaseReady ? "yes" : "no"}`,
    "",
    "## Completion Summary",
    "",
    ...formatCompletionSummary(artifact.completionSummary),
    "",
    "## Completion Checklist",
    "",
    ...formatCompletionChecklist(artifact.completionChecklist),
    "",
    "## Completed Milestones",
    "",
    ...formatCompletedMilestones(artifact.completedMilestones),
    "",
    "## Release Gate",
    "",
    ...formatReleaseGate(artifact.releaseGate),
    "",
    "## Release Evidence Artifacts",
    "",
    ...formatReleaseEvidenceArtifacts(),
    "",
    "## Local Verification",
    "",
    ...formatLocalVerification(artifact.localVerification),
    "",
    "## Next Actions",
    "",
    ...formatNextActions(artifact),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function formatCompletionSummary(summary) {
  return [
    `- Local MVP scope: ${formatCode(summary.localMvpScope)}`,
    `- Release evidence: ${formatCode(summary.releaseEvidenceStatus)}`,
    `- Release decision: ${formatCode(summary.releaseDecision)}`,
    `- Summary: ${formatText(summary.summary)}`,
  ];
}

function formatCompletionChecklist(checklist) {
  if (!checklist || !Array.isArray(checklist.items)) {
    return ["- Not recorded"];
  }

  return [
    `- Complete: ${checklist.completeCount}/${checklist.itemCount}`,
    `- Needs evidence: ${checklist.needsEvidenceCount}/${checklist.itemCount}`,
    ...checklist.items.flatMap(formatCompletionChecklistItem),
  ];
}

function formatCompletionChecklistItem(item) {
  const lines = [
    `- ${formatText(item.label)}: ${formatCode(item.status)} - ${formatText(
      item.evidence,
    )}`,
  ];

  if (typeof item.nextAction === "string") {
    lines.push(`  Next: ${formatText(item.nextAction, { maxLength: 1200 })}`);
  }

  if (Array.isArray(item.nextSteps) && item.nextSteps.length > 0) {
    lines.push("  Next steps:");
    lines.push(
      ...item.nextSteps.map(
        (step) => `    - ${formatText(step.label)}: ${formatCode(step.value)}`,
      ),
    );
  }

  return lines;
}

export async function writeProjectStatusMarkdown(outputPath, artifact) {
  const markdown = createProjectStatusMarkdown(artifact);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
}

function formatCompletedMilestones(milestones) {
  return milestones.map((milestone) => `- ${formatText(milestone)}`);
}

function formatReleaseGate(gate) {
  return [
    `- Production Smoke: ${formatSmokeGate(gate.smoke)}`,
    `- Page Builder Visual: ${formatVisualGate(gate.visual)}`,
    `- Blockers: ${gate.blockerCount}`,
    ...formatMissingProductionSmokeEvidence(gate.smoke),
    ...formatMissingVisualReferenceFiles(gate.visual),
  ];
}

function formatSmokeGate(smoke) {
  return [
    `${formatText(smoke.status)} (${formatText(smoke.summaryStatus)})`,
    formatSmokeMarkdownSummary(smoke.markdown),
  ]
    .filter(Boolean)
    .join(", ");
}

function formatSmokeMarkdownSummary(markdown) {
  if (!markdown) {
    return null;
  }

  return `Markdown ${formatText(markdown.status)}${formatSmokeMarkdownDetails(
    markdown,
  )}`;
}

function formatSmokeMarkdownDetails(markdown) {
  return typeof markdown.path === "string" && markdown.path.length > 0
    ? ` (${formatText(markdown.path)})`
    : "";
}

function formatVisualGate(visual) {
  return [
    formatText(visual.status),
    `${visual.acceptedComponentCount}/${visual.componentCount} components`,
    `${visual.acceptedViewportCount}/${visual.viewportCount} viewports`,
    `${visual.pendingTaskCount} pending tasks`,
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

  return `artifact ${formatText(status)}${formatVisualArtifactCounts(
    visual.artifactCheck,
  )}`;
}

function formatVisualArtifactCounts(artifactCheck) {
  if (!artifactCheck) {
    return "";
  }

  const countText = [
    formatVisualArtifactDir(artifactCheck.artifactDir),
    formatVisualArtifactIssueCount(artifactCheck.issueCount),
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
    formatManifestDesignReferenceSummary(artifactCheck),
    formatVisualReferenceImport(artifactCheck.referenceImport, {
      includeRequiredLabel: true, includeStatusCounts: false,
    }),
  ].filter(Boolean);

  return countText.length > 0 ? ` (${countText.join(", ")})` : "";
}

function formatVisualArtifactIssueCount(issueCount) {
  return Number.isFinite(issueCount) ? `${issueCount} issues` : null;
}

function formatVisualArtifactDir(artifactDir) {
  return typeof artifactDir === "string" && artifactDir.length > 0
    ? formatText(artifactDir)
    : null;
}

function formatVisualArtifactCount(present, expected, label) {
  if (!Number.isFinite(present) || !Number.isFinite(expected)) {
    return null;
  }

  return `${present}/${expected} ${label}`;
}

function formatLocalVerification(localVerification) {
  return [
    ...formatLocalVerificationShortcut(localVerification),
    ...localVerification.commands.map(
      (item) =>
        `- ${formatText(item.label)}: ${formatCode(item.command)} (${formatText(
          item.status,
        )})`,
    ),
  ];
}

function formatLocalVerificationShortcut(localVerification) {
  const lines = [];

  if (typeof localVerification.shortcut === "string") {
    lines.push(`- Shortcut: ${formatCode(localVerification.shortcut)}`);
  }

  if (typeof localVerification.handoff?.jsonPath === "string") {
    lines.push(
      `- Handoff JSON: ${formatCode(localVerification.handoff.jsonPath)}`,
    );
  }

  if (typeof localVerification.handoff?.markdownPath === "string") {
    lines.push(
      `- Handoff Markdown: ${formatCode(
        localVerification.handoff.markdownPath,
      )}`,
    );
  }

  return lines;
}

function formatNextActions(artifact) {
  if (artifact.nextActions.length === 0) {
    return ["- None"];
  }

  const lines = artifact.nextActions.flatMap(formatNextAction);

  if (artifact.truncatedNextActionCount > 0) {
    lines.push(
      `- ${artifact.truncatedNextActionCount} more next actions were omitted. Run ${formatCode(
        "pnpm project:status -- --all-actions",
      )}.`,
    );
  }

  return lines;
}

function formatNextAction(action) {
  if (!Array.isArray(action.steps) || action.steps.length === 0) {
    return [
      `- ${formatText(action.area)}: ${formatText(action.label)}`,
      `  Action: ${formatText(action.action, { maxLength: 1200 })}`,
    ];
  }

  return [
    `- ${formatText(action.area)}: ${formatText(action.label)}`,
    "  Steps:",
    ...action.steps.map(
      (step) => `    - ${formatText(step.label)}: ${formatCode(step.value)}`,
    ),
  ];
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value, options = {}) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: options.maxLength ?? maxMarkdownTextLength,
  });
}
