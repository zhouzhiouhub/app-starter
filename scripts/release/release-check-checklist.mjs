import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxChecklistLineLength = 420;
const maxVisibleVisualTasks = 2;

export function createReleaseEvidenceReadinessChecklist(check) {
  return {
    items: [
      createSmokeChecklistItem(check),
      createVisualChecklistItem(check),
      createReleaseNotesChecklistItem(check),
    ],
    releaseReady: check.releaseReady,
  };
}

export function formatReleaseEvidenceReadinessChecklist(checklist) {
  const lines = ["Release readiness checklist:"];

  for (const item of checklist.items) {
    lines.push(`  - ${item.label}: ${item.status}`);

    if (item.detail) {
      lines.push(`    Detail: ${item.detail}`);
    }

    if (item.action) {
      lines.push(`    Action: ${item.action}`);
    }

    lines.push(...formatVisualTasks(item));
  }

  return lines.map(formatChecklistLine);
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

function createVisualChecklistItem(check) {
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
    detail,
    label: "Page Builder Visual evidence",
    status: check.visual.status,
    tasks: readVisibleVisualTasks(check.visualChecklist),
  };
}

function createReleaseNotesChecklistItem(check) {
  if (check.releaseReady) {
    return {
      action:
        "Run pnpm release:notes with release tag, workflow run URL, artifact names, storefront URL, and rollback target.",
      label: "Release notes record",
      status: "ready to generate",
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

function readVisibleVisualTasks(checklist) {
  const tasks = readPendingVisualTasks(checklist);

  if (tasks.length === 0) {
    return null;
  }

  return {
    hiddenCount: Math.max(0, tasks.length - maxVisibleVisualTasks),
    items: tasks.slice(0, maxVisibleVisualTasks).map(createVisualTaskSummary),
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
    capture: task.commands?.capture ?? null,
    component: task.component,
    expectedDesignReference: task.expectedDesignReference,
    expectedPreviewScreenshot: task.expectedPreviewScreenshot,
    importReference: task.commands?.importReference ?? null,
    measure: task.commands?.measure ?? null,
    missing: Array.isArray(task.missing) ? task.missing : [],
    verify: task.commands?.verify ?? null,
    viewport: task.viewport,
  };
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
    lines.push(`        Import: ${task.importReference}`);
    lines.push(`        Measure: ${task.measure}`);
    lines.push(`        Verify: ${task.verify}`);
  }

  if (item.tasks.hiddenCount > 0) {
    lines.push(
      `      - ... and ${item.tasks.hiddenCount} more visual viewport tasks`,
    );
  }

  return lines;
}

function formatChecklistLine(line) {
  const prefix = line.match(/^ */u)?.[0] ?? "";
  const maxLength = Math.max(3, maxChecklistLineLength - prefix.length);

  return `${prefix}${formatSmokeText(line.slice(prefix.length), {
    maxLength,
  })}`;
}
