import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeManualDispatchInstruction,
} from "../smoke/production-smoke-dispatch-command.mjs";
import { defaultPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check.mjs";
import { formatRequiredSourceReferenceAvailability } from "../visual/page-builder-visual-reference-summary-format.mjs";
import {
  formatVisualTasks,
  readVisibleVisualTasks,
} from "./release-check-checklist-visual-tasks.mjs";
import { createReleaseNotesHandoffSteps } from "./release-notes-handoff-steps.mjs";

const maxChecklistLineLength = 520;
const productionSmokeArtifactNames = [
  "production-smoke-report-<run_number>",
  "release-preflight-<run_number>",
  "release-evidence-check-<run_number>",
  "project-status-<run_number>",
];
const productionSmokeDispatchCommand = createProductionSmokeDispatchCommand();
const productionSmokeManualDispatch =
  createProductionSmokeManualDispatchInstruction();
const productionSmokeLocalVerificationInputs = [
  "local_verification_run_url=<main CI run URL>",
  "local_verification_artifact_name=local-verification-<run_number>",
];
const productionSmokeReleaseNoteInputs = [
  "release_tag=<tag>",
  "rollback_target=<target>",
  "storefront_url=<public HTTPS storefront URL>",
];
const productionSmokeVisualInputs = [
  "visual_artifact_name=page-builder-visual-fixture-<run_number>",
  "visual_artifact_run_id=<Page Builder Visual workflow run id>",
];

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
    steps: createSmokeChecklistSteps(check),
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

function createSmokeChecklistSteps(check) {
  return [
    createChecklistStep("Manual dispatch", productionSmokeManualDispatch),
    createChecklistStep("Dispatch template", productionSmokeDispatchCommand),
    createChecklistStep(
      "Local verification inputs",
      productionSmokeLocalVerificationInputs.join(", "),
    ),
    createChecklistStep(
      "Visual evidence inputs",
      productionSmokeVisualInputs.join(", "),
    ),
    createChecklistStep(
      "Release note inputs",
      productionSmokeReleaseNoteInputs.join(", "),
    ),
    createChecklistStep(
      "Keep artifacts",
      productionSmokeArtifactNames.join(", "),
    ),
    createChecklistStep("Rerun gate", createReleaseCheckCommand(check)),
  ];
}

function createReleaseCheckCommand(check) {
  const smokeReportPath = check.smoke.path ?? "<path>";
  const command = [`pnpm release:check -- --smoke-report ${smokeReportPath}`];
  const visualArtifactDir =
    check.visualArtifact?.artifactDir ??
    check.visualArtifactDir ??
    defaultPageBuilderVisualArtifactDir;

  if (visualArtifactDir) {
    command.push(`--visual-artifact-dir ${visualArtifactDir}`);
  }

  return command.join(" ");
}

function createChecklistStep(label, value) {
  return {
    label,
    value,
  };
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
  const coverage = formatRequiredSourceReferenceAvailability(referenceImport, {
    includeStatusCounts: false,
  });

  return coverage;
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
