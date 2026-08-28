import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxBlockerLines = 12;
const maxTextLength = 180;

export function createReleaseNotesMarkdown(config, artifact) {
  if (!config.allowBlocked && artifact.releaseReady !== true) {
    throw new Error(
      "Release notes require a ready release-evidence-check.v1 artifact. Pass --allow-blocked only for failure review drafts.",
    );
  }

  const lines = [
    `# Release ${formatInline(config.releaseTag)}`,
    "",
    `Generated: ${formatInline(artifact.generatedAt ?? new Date().toISOString())}`,
    `Status: ${artifact.releaseReady ? "ready" : "blocked"}`,
    "",
    "## Evidence",
    "",
    `- Workflow run: ${config.workflowRunUrl}`,
    `- Production smoke artifact: \`${formatInline(config.smokeArtifact)}\``,
    `- Combined release artifact: \`${formatInline(config.releaseArtifact)}\``,
    `- Page Builder visual artifact: \`${formatInline(config.visualArtifact)}\``,
    `- Release check source: \`${formatInline(config.releaseCheckPath)}\``,
    `- Public storefront: ${config.storefrontUrl}`,
    `- Rollback target: \`${formatInline(config.rollbackTarget)}\``,
    "",
    "## Gates",
    "",
    `- Release evidence: ${artifact.status}`,
    `- Production Smoke: ${artifact.smoke.status} (${artifact.smoke.summary.status}, ${artifact.smoke.summary.failedCheckCount} failed checks)`,
    `- Page Builder Visual: ${artifact.visual.status} (${artifact.visual.acceptedComponentCount}/${artifact.visual.componentCount} components, ${artifact.visual.acceptedViewportCount}/${artifact.visual.viewportCount} viewports)`,
    "",
    "## Traceability",
    "",
    ...formatTraceability(artifact.smoke.traceability),
    "",
    "## Blockers",
    "",
    ...formatBlockers(artifact.blockers),
    "",
  ];

  return `${lines.join("\n")}`;
}

export async function writeReleaseNotesMarkdown(outputPath, markdown) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
}

function formatTraceability(groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return ["- No production smoke traceability was recorded."];
  }

  return groups.map(
    (group) =>
      `- ${formatInline(group.label)}: ${formatInline(group.status)} (${formatInline(
        group.action ?? "no action",
      )})`,
  );
}

function formatBlockers(blockers) {
  if (!Array.isArray(blockers) || blockers.length === 0) {
    return ["- None"];
  }

  const visible = blockers.slice(0, maxBlockerLines).map(
    (blocker) =>
      `- ${formatInline(blocker.area)}: ${formatInline(blocker.label)} - ${formatInline(
        blocker.action,
      )}`,
  );
  const hidden = blockers.length - visible.length;

  if (hidden > 0) {
    visible.push(`- ... and ${hidden} more blockers`);
  }

  return visible;
}

function formatInline(value) {
  return formatSmokeText(value, { fallback: "unknown", maxLength: maxTextLength });
}
