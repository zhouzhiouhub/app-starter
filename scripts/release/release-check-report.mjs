import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createReleaseNotesHandoffSteps } from "./release-notes-handoff-steps.mjs";

const maxReleaseBlockerCount = 12;
const maxReleaseLineLength = 420;
const maxReleaseValueLength = 160;

export function formatReleaseEvidenceCheck(check) {
  const lines = [
    "Release evidence gate",
    `  Status: ${check.releaseReady ? "ready" : "blocked"}`,
    `  Production Smoke: ${check.smoke.releaseReady ? "ready" : "blocked"}`,
    `  Page Builder Visual: ${check.visual.status}`,
    `  Smoke report: ${formatReleaseValue(check.smoke.path, "latest archive")}`,
    `  Visual manifest: ${formatReleaseValue(check.visualManifestPath, "unknown")}`,
  ];

  if (check.visualArtifact) {
    lines.push(
      `  Visual artifact: ${check.visualArtifact.status} ` +
        formatVisualArtifactDetails(check.visualArtifact),
    );
  }

  if (check.blockers.length > 0) {
    lines.push("  Blockers:");
    lines.push(...formatReleaseBlockers(check.blockers));
  } else {
    lines.push("  Evidence is ready for release notes.");
    lines.push("  Release notes handoff:");
    lines.push(...formatReleaseNotesHandoffSteps());
  }

  return lines.map(formatReleaseLine);
}

function formatReleaseNotesHandoffSteps() {
  return createReleaseNotesHandoffSteps().map(
    (step) => `    ${step.label}: ${step.value}`,
  );
}

function formatReleaseBlockers(blockers) {
  const visible = blockers.slice(0, maxReleaseBlockerCount);
  const hidden = blockers.length - visible.length;
  const lines = visible.map(
    (blocker) => `    - ${blocker.area}: ${blocker.label}: ${blocker.action}`,
  );

  if (hidden > 0) {
    lines.push(`    - ... and ${hidden} more release evidence blockers`);
  }

  return lines;
}

function formatVisualArtifactDetails(artifact) {
  const detailText = [
    formatReleaseValue(artifact.artifactDir, "unknown"),
    formatVisualArtifactCount(
      artifact.presentRequiredFileCount,
      artifact.requiredFileCount,
      "files",
    ),
    formatVisualArtifactCount(
      artifact.presentScreenshotCount,
      artifact.expectedScreenshotCount,
      "screenshots",
    ),
  ].filter(Boolean);

  return detailText.length > 0 ? `(${detailText.join(", ")})` : "";
}

function formatVisualArtifactCount(present, expected, label) {
  if (!Number.isFinite(present) || !Number.isFinite(expected)) {
    return null;
  }

  return `${present}/${expected} ${label}`;
}

function formatReleaseValue(value, fallback) {
  return formatSmokeText(hasText(value) ? value : fallback, {
    maxLength: maxReleaseValueLength,
  });
}

function formatReleaseLine(line) {
  const prefix = line.match(/^ */u)?.[0] ?? "";
  const maxLength = Math.max(3, maxReleaseLineLength - prefix.length);

  return `${prefix}${formatSmokeText(line.slice(prefix.length), {
    maxLength,
  })}`;
}

function hasText(value) {
  return typeof value === "string" && value.length > 0;
}
