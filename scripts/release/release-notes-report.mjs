import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { assertReleaseNotesProjectStatusConsistency } from "./release-notes-project-status-consistency.mjs";
import { assertReleaseNotesSourceConsistency } from "./release-notes-source-consistency.mjs";
import { formatProjectNextActions } from "./release-notes-project-actions-report.mjs";
import { formatProjectCompletionChecklist } from "./release-notes-project-completion-report.mjs";
import { formatReadinessChecklistMarkdown } from "./release-readiness-checklist-markdown.mjs";
import { formatVisualChecklist } from "./release-notes-visual-checklist-report.mjs";

const maxBlockerLines = 12;
const maxTextLength = 180;
const maxVisualArtifactIssueLines = 12;
const maxVisualIssueLines = 12;

export function createReleaseNotesMarkdown(config, artifact, projectStatus) {
  if (!config.allowBlocked && artifact.releaseReady !== true) {
    throw new Error(
      "Release notes require a ready release-evidence-check.v1 artifact. Pass --allow-blocked only for failure review drafts.",
    );
  }

  assertReleaseNotesSourceConsistency(config, artifact);
  if (projectStatus) {
    assertReleaseNotesProjectStatusConsistency(artifact, projectStatus);
  }

  const lines = [
    `# Release ${formatInline(config.releaseTag)}`,
    "",
    `Generated: ${formatInline(artifact.generatedAt ?? new Date().toISOString())}`,
    `Status: ${artifact.releaseReady ? "ready" : "blocked"}`,
    `Mode: ${readReleaseNotesMode(config, artifact)}`,
    ...formatReleaseNotesWarning(config, artifact),
    "",
    "## Evidence",
    "",
    `- Workflow run: ${config.workflowRunUrl}`,
    `- Local verification run: ${config.localVerificationRunUrl}`,
    `- Local verification artifact: \`${formatInline(
      config.localVerificationArtifact,
    )}\``,
    `- Production smoke artifact: \`${formatInline(config.smokeArtifact)}\``,
    `- Production smoke preflight artifact: \`${formatInline(
      config.preflightArtifact,
    )}\``,
    `- Production smoke source: ${formatSmokeSource(artifact.smoke.source)}`,
    `- Combined release artifact: \`${formatInline(config.releaseArtifact)}\``,
    `- Project status artifact: \`${formatInline(config.projectStatusArtifact)}\``,
    `- Project status source: \`${formatInline(config.projectStatusPath)}\``,
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
    ...formatProjectStatusGate(projectStatus),
    ...formatVisualArtifactGate(artifact.visual.artifactCheck),
    "",
    ...formatProjectCompletionChecklist(projectStatus),
    "",
    "## Readiness Checklist",
    "",
    ...formatReadinessChecklistMarkdown(artifact.readinessChecklist, {
      maxActionLength: maxTextLength,
      maxStepTextLength: 420,
      maxTextLength,
    }),
    ...formatProjectNextActions(projectStatus, artifact),
    "## Visual Evidence",
    "",
    ...formatVisualEvidence(artifact.visual),
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

function formatVisualEvidence(visual) {
  return [
    `- Manifest: \`${formatInline(visual.manifestPath)}\``,
    `- Pending components: ${formatInlineList(visual.pendingComponents)}`,
    `- Pending viewports: ${formatInlineList(visual.pendingViewports)}`,
    ...formatVisualChecklist(visual.checklist),
    ...formatVisualArtifactCheck(visual.artifactCheck),
    ...formatVisualIssues(visual.issues),
  ];
}

function formatVisualArtifactGate(check) {
  if (!check) {
    return [];
  }

  return [
    `- Page Builder Visual Artifact: ${formatInline(check.status)} (${formatInline(
      check.artifactDir,
    )}, ${check.presentRequiredFileCount}/${check.requiredFileCount} files, ${check.presentScreenshotCount}/${check.expectedScreenshotCount} screenshots)`,
  ];
}

function formatProjectStatusGate(projectStatus) {
  if (!projectStatus) {
    return [];
  }

  const lines = [
    `- Project Status: ${formatInline(projectStatus.status)} (${projectStatus.releaseGate.blockerCount} blockers, ${projectStatus.nextActionCount} next actions)`,
  ];
  const summary = projectStatus.completionSummary;

  if (summary) {
    lines.push(
      `- Project Completion: ${formatInline(summary.releaseDecision)} (${formatInline(
        summary.localMvpScope,
      )} local MVP scope, ${formatInline(summary.releaseEvidenceStatus)} evidence)`,
    );
  }

  return lines;
}

function formatSmokeSource(source) {
  if (!source?.commitSha || !source?.runId || !source?.workflowRunUrl) {
    return "missing";
  }

  return `${formatInline(source.workflowRunUrl)} (${formatInline(
    source.commitSha.slice(0, 7),
  )}, run ${formatInline(source.runId)})`;
}

function formatVisualArtifactCheck(check) {
  if (!check) {
    return ["- Artifact check: not recorded"];
  }

  return [
    `- Artifact check: ${formatInline(check.status)}`,
    `- Artifact dir: \`${formatInline(check.artifactDir)}\``,
    `- Artifact files: ${check.presentRequiredFileCount}/${check.requiredFileCount}`,
    `- Artifact screenshots: ${check.presentScreenshotCount}/${check.expectedScreenshotCount}`,
    ...formatVisualArtifactIssues(check.issues),
  ];
}

function formatVisualArtifactIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return ["- Artifact issues: none"];
  }

  const visible = issues
    .slice(0, maxVisualArtifactIssueLines)
    .map((issue) => `- Artifact issue: ${formatVisualIssue(issue)}`);
  const hidden = issues.length - visible.length;

  if (hidden > 0) {
    visible.push(`- Artifact issue: ... and ${hidden} more artifact issues`);
  }

  return visible;
}

function formatVisualIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return ["- Visual issues: none"];
  }

  const visible = issues
    .slice(0, maxVisualIssueLines)
    .map((issue) => `- Visual issue: ${formatVisualIssue(issue)}`);
  const hidden = issues.length - visible.length;

  if (hidden > 0) {
    visible.push(`- Visual issue: ... and ${hidden} more visual issues`);
  }

  return visible;
}

function formatVisualIssue(issue) {
  const label = formatIssueTarget(issue);
  const code = formatInline(issue.code);
  const severity = formatInline(issue.severity);
  const message = formatInline(issue.message);

  return formatInline(`${label}: ${code} (${severity}) - ${message}`);
}

function formatIssueTarget(issue) {
  const component = formatInline(issue.component);
  const viewport = formatInline(issue.viewport);

  if (component === "unknown") {
    return viewport;
  }

  return viewport === "unknown" ? component : `${component}.${viewport}`;
}

function formatBlockers(blockers) {
  if (!Array.isArray(blockers) || blockers.length === 0) {
    return ["- None"];
  }

  const visible = blockers
    .slice(0, maxBlockerLines)
    .map(
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

function readReleaseNotesMode(config, artifact) {
  if (artifact.releaseReady) {
    return "release sign-off";
  }

  return config.allowBlocked ? "failure review draft" : "blocked";
}

function formatReleaseNotesWarning(config, artifact) {
  if (artifact.releaseReady || !config.allowBlocked) {
    return [];
  }

  return [
    "Warning: This record is for failed evidence review only and must not be used as release sign-off.",
  ];
}

function formatInlineList(values) {
  const list = Array.isArray(values) ? values.filter(hasText) : [];

  if (list.length === 0) {
    return "none";
  }

  return formatInline(list.join(", "));
}

function formatInline(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxTextLength,
  });
}

function hasText(value) {
  return typeof value === "string" && value.length > 0;
}
