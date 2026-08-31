import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { defaultPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check.mjs";
import {
  formatVisualTasks,
  readVisibleVisualTasks,
} from "./release-check-checklist-visual-tasks.mjs";
import { createReleaseNotesHandoffSteps } from "./release-notes-handoff-steps.mjs";

const maxChecklistLineLength = 420;

export function createReleaseEvidenceReadinessChecklist(check, options = {}) {
  return {
    items: [
      createSmokeChecklistItem(check),
      createVisualChecklistItem(check, options),
      createReleaseNotesChecklistItem(check),
    ],
    releaseReady: check.releaseReady,
  };
}

export function formatReleaseEvidenceReadinessChecklist(
  checklist,
  options = {},
) {
  const lines = ["Release readiness checklist:"];

  for (const item of checklist.items) {
    lines.push(`  - ${item.label}: ${item.status}`);

    if (item.detail) {
      lines.push(`    Detail: ${item.detail}`);
    }

    if (item.action) {
      lines.push(`    Action: ${item.action}`);
    }

    if (item.bundleCommand) {
      lines.push(`    Bundle: ${item.bundleCommand}`);
    }

    lines.push(...formatChecklistSteps(item.steps));
    lines.push(...formatVisualTasks(item));
  }

  return lines.map((line) => formatChecklistLine(line, options));
}

function createSmokeChecklistItem(check) {
  if (check.smoke.releaseReady) {
    return {
      detail: createSmokeChecklistDetail(check.smoke),
      label: "Production Smoke report",
      status: "ready",
    };
  }

  return {
    action: readFirstBlockerAction(check, "Production Smoke"),
    detail: createSmokeChecklistDetail(check.smoke),
    label: "Production Smoke report",
    status: "blocked",
  };
}

function createSmokeChecklistDetail(smoke) {
  const details = [`Report path: ${smoke.path ?? "latest archive"}`];

  if (smoke.markdown) {
    details.push(
      `Markdown: ${smoke.markdown.status} ${smoke.markdown.path ?? "unknown"}`,
    );
  }

  return details.join(", ");
}

function createVisualChecklistItem(check, options) {
  const detail = [
    `${check.visual.acceptedComponentCount}/${check.visual.componentCount} components`,
    `${check.visual.acceptedViewportCount}/${check.visual.viewportCount} viewports`,
    formatVisualArtifactDetail(check.visualArtifact),
  ]
    .filter(Boolean)
    .join(", ");

  if (check.visual.status === "accepted") {
    return {
      detail,
      label: "Page Builder Visual evidence",
      status: "ready",
    };
  }

  return {
    action: readFirstBlockerAction(check, "Page Builder Visual"),
    bundleCommand: createVisualArtifactBundleCommand(check),
    detail,
    label: "Page Builder Visual evidence",
    status: check.visual.status,
    tasks: readVisibleVisualTasks(check.visualChecklist, options),
  };
}

function createVisualArtifactBundleCommand(check) {
  const artifactDir =
    check.visualArtifact?.artifactDir ??
    check.visualArtifactDir ??
    defaultPageBuilderVisualArtifactDir;

  return `pnpm visual:artifact-bundle -- --artifact-dir ${artifactDir}`;
}

function formatVisualArtifactDetail(artifact) {
  if (!artifact) {
    return null;
  }

  const details = [
    artifact.artifactDir,
    formatVisualArtifactIssueCount(artifact.issueCount),
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
    formatReferenceImport(artifact.referenceImport),
  ].filter(Boolean);

  return `artifact ${artifact.status}${
    details.length > 0 ? ` (${details.join(", ")})` : ""
  }`;
}

function formatVisualArtifactIssueCount(issueCount) {
  return Number.isFinite(issueCount) ? `${issueCount} issues` : null;
}

function formatReferenceImport(referenceImport) {
  if (!referenceImport) {
    return null;
  }

  return `references ${referenceImport.status} (${[
    formatReferenceImportCount(referenceImport.missingCount, "missing"),
    formatReferenceImportCount(referenceImport.updateCount, "updates"),
    formatRequiredReferenceCoverage(referenceImport),
  ]
    .filter(Boolean)
    .join(", ")})`;
}

function formatReferenceImportCount(count, label) {
  return Number.isFinite(count) ? `${count} ${label}` : null;
}

function formatRequiredReferenceCoverage(referenceImport) {
  if (
    !Number.isFinite(referenceImport.requiredReferenceCount) ||
    !Number.isFinite(referenceImport.requiredReferenceEntryCount)
  ) {
    return null;
  }

  return `${referenceImport.requiredReferenceEntryCount}/${referenceImport.requiredReferenceCount} required`;
}

function formatVisualArtifactCount(present, expected, label) {
  if (!Number.isFinite(present) || !Number.isFinite(expected)) {
    return null;
  }

  return `${present}/${expected} ${label}`;
}

function createReleaseNotesChecklistItem(check) {
  if (check.releaseReady) {
    return {
      action:
        "Run pnpm release:notes with release tag, workflow run URL, artifact names, storefront URL, and rollback target.",
      label: "Release notes record",
      status: "ready to generate",
      steps: createReleaseNotesHandoffSteps(),
    };
  }

  return {
    action:
      "Wait until Production Smoke and Page Builder Visual evidence are ready, then run pnpm release:notes.",
    label: "Release notes record",
    status: "waiting for evidence",
  };
}

function readFirstBlockerAction(check, area) {
  return (
    check.blockers.find((blocker) => blocker.area === area)?.action ??
    "Review the release evidence blockers above."
  );
}

function formatChecklistSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return [];
  }

  return [
    "    Steps:",
    ...steps.map((step) => `      ${step.label}: ${step.value}`),
  ];
}

function formatChecklistLine(line, options) {
  const prefix = line.match(/^ */u)?.[0] ?? "";
  const maxLength =
    options.truncateLines === false
      ? null
      : Math.max(3, maxChecklistLineLength - prefix.length);

  return `${prefix}${formatSmokeText(line.slice(prefix.length), {
    maxLength,
  })}`;
}
