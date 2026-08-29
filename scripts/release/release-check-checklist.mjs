import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { defaultPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check.mjs";
import { createReleaseNotesHandoffSteps } from "./release-notes-handoff-steps.mjs";

const maxChecklistLineLength = 420;
const maxVisibleVisualTasks = 2;

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

export function formatReleaseEvidenceReadinessChecklist(checklist, options = {}) {
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
      detail: `Report path: ${check.smoke.path ?? "latest archive"}`,
      label: "Production Smoke report",
      status: "ready",
    };
  }

  return {
    action: readFirstBlockerAction(check, "Production Smoke"),
    detail: `Report path: ${check.smoke.path ?? "latest archive"}`,
    label: "Production Smoke report",
    status: "blocked",
  };
}

function createVisualChecklistItem(check, options) {
  const detail = [
    `${check.visual.acceptedComponentCount}/${check.visual.componentCount} components`,
    `${check.visual.acceptedViewportCount}/${check.visual.viewportCount} viewports`,
    check.visualArtifact ? `artifact ${check.visualArtifact.status}` : null,
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

function readVisibleVisualTasks(checklist, options) {
  const tasks = readPendingVisualTasks(checklist);

  if (tasks.length === 0) {
    return null;
  }

  const visibleTaskCount = options.includeAllVisualTasks
    ? tasks.length
    : maxVisibleVisualTasks;

  return {
    hiddenCount: Math.max(0, tasks.length - visibleTaskCount),
    items: tasks.slice(0, visibleTaskCount).map(createVisualTaskSummary),
  };
}

function readPendingVisualTasks(checklist) {
  if (!Array.isArray(checklist?.components)) {
    return [];
  }

  return checklist.components.flatMap((component) =>
    Array.isArray(component.viewports)
      ? component.viewports.filter((viewport) => viewport.ready !== true)
      : [],
  );
}

function createVisualTaskSummary(task) {
  return {
    acceptPassing: task.commands?.acceptPassing ?? null,
    capture: task.commands?.capture ?? null,
    component: task.component,
    expectedDesignReference: task.expectedDesignReference,
    expectedPreviewScreenshot: task.expectedPreviewScreenshot,
    importReference: task.commands?.importReference ?? null,
    measure: task.commands?.measure ?? null,
    missing: Array.isArray(task.missing) ? task.missing : [],
    referenceReport: task.commands?.referenceReport ?? null,
    verify: task.commands?.verify ?? null,
    viewport: task.viewport,
  };
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

function formatVisualTasks(item) {
  if (!item.tasks || item.tasks.items.length === 0) {
    return [];
  }

  const lines = ["    Visual tasks:"];

  for (const task of item.tasks.items) {
    lines.push(
      `      - ${task.component}.${task.viewport}: missing ${task.missing.join(
        ", ",
      )}`,
    );
    lines.push(`        Reference: ${task.expectedDesignReference}`);
    lines.push(`        Preview: ${task.expectedPreviewScreenshot}`);
    lines.push(`        Capture: ${task.capture}`);
    if (task.referenceReport) {
      lines.push(`        Reference report: ${task.referenceReport}`);
    }
    lines.push(`        Import: ${task.importReference}`);
    lines.push(`        Measure: ${task.measure}`);
    if (task.acceptPassing) {
      lines.push(`        Accept passing: ${task.acceptPassing}`);
    }
    lines.push(`        Verify: ${task.verify}`);
  }

  if (item.tasks.hiddenCount > 0) {
    lines.push(
      `      - ... and ${item.tasks.hiddenCount} more visual viewport tasks. Use --all-visual-tasks with --checklist to list every visual task.`,
    );
  }

  return lines;
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
