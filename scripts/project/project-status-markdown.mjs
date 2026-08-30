import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { assertProjectStatusArtifact } from "./project-status-validation.mjs";

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
    `- Production Smoke: ${formatText(gate.smoke.status)} (${formatText(
      gate.smoke.summaryStatus,
    )})`,
    `- Page Builder Visual: ${formatVisualGate(gate.visual)}`,
    `- Blockers: ${gate.blockerCount}`,
  ];
}

function formatReleaseEvidenceArtifacts() {
  return [
    "- Production Smoke JSON: `artifacts/production-smoke/smoke-report.json`",
    "- Production Smoke Markdown: `artifacts/production-smoke/smoke-report.md`",
    "- Production Smoke preflight JSON: `artifacts/release/preflight.json`",
    "- Production Smoke preflight Markdown: `artifacts/release/preflight.md`",
    "- Page Builder Visual bundle: `reports/visual/page-builder-fixture`",
    "- Page Builder Visual manifest: `reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`",
    "- Page Builder Visual capture report JSON: `reports/visual/page-builder-fixture/visual-capture-report.json`",
    "- Page Builder Visual reference import JSON: `reports/visual/page-builder-fixture/visual-reference-import-report.json`",
    "- Page Builder Visual reference import Markdown: `reports/visual/page-builder-fixture/visual-reference-import-report.md`",
    "- Page Builder Visual acceptance JSON: `reports/visual/page-builder-fixture/visual-acceptance-report.json`",
    "- Page Builder Visual acceptance Markdown: `reports/visual/page-builder-fixture/visual-acceptance-report.md`",
    "- Page Builder Visual artifact check JSON: `reports/visual/page-builder-fixture/visual-artifact-check-report.json`",
    "- Page Builder Visual artifact check Markdown: `reports/visual/page-builder-fixture/visual-artifact-check-report.md`",
    "- Release evidence JSON: `artifacts/release/release-check.json`",
    "- Release evidence Markdown: `artifacts/release/release-check.md`",
    "- Project status JSON: `artifacts/release/project-status.json`",
    "- Project status Markdown: `artifacts/release/project-status.md`",
    "- Release notes Markdown: `docs/releases/<tag>.md`",
    `- Refresh Smoke review: ${formatCode(
      "pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json",
    )}`,
    `- Refresh Production Smoke preflight: ${formatCode(
      "pnpm release:preflight -- --json-output artifacts/release/preflight.json --markdown-output artifacts/release/preflight.md",
    )}`,
    `- Refresh visual bundle: ${formatCode(
      "pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture",
    )}`,
    `- Refresh visual references: ${formatCode(
      "pnpm visual:references -- --source-dir docs/visual/page-builder-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output reports/visual/page-builder-fixture/visual-reference-import-report.json --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md --require-complete",
    )}`,
    `- Refresh visual capture: ${formatCode(
      "pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest",
    )}`,
    `- Refresh visual measurements: ${formatCode(
      "pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete",
    )}`,
    `- Accept passing visual evidence: ${formatCode(
      "pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete",
    )}`,
    `- Refresh visual acceptance report: ${formatCode(
      "pnpm visual:acceptance -- --checklist --output reports/visual/page-builder-fixture/visual-acceptance-report.json --markdown-output reports/visual/page-builder-fixture/visual-acceptance-report.md reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    )}`,
    `- Refresh visual artifact check: ${formatCode(
      "pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture --output reports/visual/page-builder-fixture/visual-artifact-check-report.json --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md",
    )}`,
    `- Refresh release handoff: ${formatCode(
      "pnpm release:handoff -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture",
    )}`,
  ];
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
  ].filter(Boolean);

  return countText.length > 0 ? ` (${countText.join(", ")})` : "";
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
