import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxProjectLineLength = 420;

export function formatProjectStatusArtifact(artifact) {
  const lines = [
    `Project status (${artifact.schemaVersion})`,
    `  Phase: ${artifact.phase}`,
    `  Status: ${artifact.status}`,
    `  Release ready: ${artifact.releaseReady ? "yes" : "no"}`,
    "  Completed milestones:",
    ...artifact.completedMilestones.map((milestone) => `    - ${milestone}`),
    "  Release gate:",
    `    - Production Smoke: ${artifact.releaseGate.smoke.status} (${artifact.releaseGate.smoke.summaryStatus})`,
    `    - Page Builder Visual: ${formatVisualGate(artifact.releaseGate.visual)}`,
    `    - Blockers: ${artifact.releaseGate.blockerCount}`,
    "  Next actions:",
    ...formatProjectNextActions(artifact),
  ];

  return lines.map(formatProjectLine);
}

export async function writeProjectStatusArtifact(outputPath, artifact) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

function formatVisualGate(visual) {
  return [
    `${visual.status}`,
    `components ${visual.acceptedComponentCount}/${visual.componentCount}`,
    `viewports ${visual.acceptedViewportCount}/${visual.viewportCount}`,
    `pending tasks ${visual.pendingTaskCount}`,
    visual.artifactStatus ? `artifact ${visual.artifactStatus}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatProjectNextActions(artifact) {
  if (!Array.isArray(artifact.nextActions) || artifact.nextActions.length === 0) {
    return ["    - None"];
  }

  const lines = artifact.nextActions.map(
    (action) => `    - ${action.area}: ${action.label} - ${action.action}`,
  );
  const hiddenCount = artifact.nextActionCount - artifact.nextActions.length;

  if (hiddenCount > 0) {
    lines.push(`    - ... and ${hiddenCount} more next actions`);
  }

  return lines;
}

function formatProjectLine(line) {
  const prefix = line.match(/^ */u)?.[0] ?? "";
  const maxLength = Math.max(3, maxProjectLineLength - prefix.length);

  return `${prefix}${formatSmokeText(line.slice(prefix.length), {
    maxLength,
  })}`;
}
