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
    "- Page Builder Visual bundle: `reports/visual/page-builder-fixture`",
    "- Page Builder Visual acceptance Markdown: `reports/visual/page-builder-fixture/visual-acceptance-report.md`",
    "- Page Builder Visual artifact check Markdown: `reports/visual/page-builder-fixture/visual-artifact-check-report.md`",
    "- Release evidence JSON: `artifacts/release/release-check.json`",
    "- Release evidence Markdown: `artifacts/release/release-check.md`",
    "- Project status JSON: `artifacts/release/project-status.json`",
    "- Project status Markdown: `artifacts/release/project-status.md`",
    "- Release notes Markdown: `docs/releases/<tag>.md`",
    `- Refresh Smoke review: ${formatCode(
      "pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json",
    )}`,
    `- Refresh visual bundle: ${formatCode(
      "pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture",
    )}`,
    `- Refresh combined gate: ${formatCode(
      "pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture --output artifacts/release/release-check.json --markdown-output artifacts/release/release-check.md",
    )}`,
    `- Refresh status handoff: ${formatCode(
      "pnpm project:status -- --all-actions --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture --output artifacts/release/project-status.json --markdown-output artifacts/release/project-status.md",
    )}`,
  ];
}

function formatVisualGate(visual) {
  return [
    formatText(visual.status),
    `${visual.acceptedComponentCount}/${visual.componentCount} components`,
    `${visual.acceptedViewportCount}/${visual.viewportCount} viewports`,
    `${visual.pendingTaskCount} pending tasks`,
    visual.artifactStatus ? `artifact ${formatText(visual.artifactStatus)}` : null,
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

  const lines = artifact.nextActions.flatMap((action) => [
    `- ${formatText(action.area)}: ${formatText(action.label)}`,
    `  Action: ${formatText(action.action, { maxLength: 1200 })}`,
  ]);

  if (artifact.truncatedNextActionCount > 0) {
    lines.push(
      `- ${artifact.truncatedNextActionCount} more next actions were omitted. Run ${formatCode(
        "pnpm project:status -- --all-actions",
      )}.`,
    );
  }

  return lines;
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
