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
    visual.artifactStatus
      ? `artifact ${formatText(visual.artifactStatus)}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatLocalVerification(localVerification) {
  return localVerification.commands.map(
    (item) =>
      `- ${formatText(item.label)}: ${formatCode(item.command)} (${formatText(
        item.status,
      )})`,
  );
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
