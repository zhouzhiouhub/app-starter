import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { readPendingVisualTasks } from "./project-status-next-actions.mjs";

const maxChecklistTextLength = 420;
const maxChecklistStepTextLength = 1200;

export function createProjectCompletionChecklist(check, nextActions = []) {
  const items = [
    createLocalMvpScopeItem(),
    createProductionSmokeItem(check, nextActions),
    createPageBuilderVisualItem(check, nextActions),
    ...createVisualArtifactItems(check, nextActions),
  ];

  return {
    completeCount: countChecklistStatus(items, "complete"),
    itemCount: items.length,
    items,
    needsEvidenceCount: countChecklistStatus(items, "needs-evidence"),
  };
}

function createLocalMvpScopeItem() {
  return createChecklistItem({
    evidence:
      "MVP page management, Page Builder, preview, publish, SEO, media, audit logs, and starter pages are implemented.",
    label: "Local MVP implementation scope",
    status: "complete",
  });
}

function createProductionSmokeItem(check, nextActions) {
  const complete = check.smoke?.releaseReady === true;

  return createChecklistItem({
    evidence: complete
      ? `Production Smoke report retained at ${check.smoke.path}.`
      : "No retained production Smoke report has passed the release gate.",
    label: "Production Smoke release evidence",
    nextAction: complete
      ? null
      : readBlockerAction(check, "Production Smoke"),
    nextSteps: complete
      ? []
      : readActionSteps(nextActions, "Production Smoke", [
          "Production smoke artifact missing",
        ]),
    status: complete ? "complete" : "needs-evidence",
  });
}

function createPageBuilderVisualItem(check, nextActions) {
  const complete = check.visual?.status === "accepted";
  const pendingTaskCount = readPendingVisualTasks(check.visualChecklist).length;

  return createChecklistItem({
    evidence: complete
      ? `${check.visual.acceptedComponentCount}/${check.visual.componentCount} components and ${check.visual.acceptedViewportCount}/${check.visual.viewportCount} viewports are accepted.`
      : `${pendingTaskCount} Page Builder visual viewport tasks still need accepted evidence.`,
    label: "Page Builder visual acceptance evidence",
    nextAction: complete
      ? null
      : readBlockerAction(check, "Page Builder Visual", [
          "Visual acceptance invalid",
          "Visual acceptance pending",
        ]),
    nextSteps: complete
      ? []
      : readActionSteps(nextActions, "Page Builder Visual", [
          "Visual acceptance invalid",
          "Visual acceptance pending",
        ]),
    status: complete ? "complete" : "needs-evidence",
  });
}

function createVisualArtifactItems(check, nextActions) {
  if (!check.visualArtifact) {
    return [];
  }

  const artifact = check.visualArtifact;
  const complete = artifact.status === "complete";

  return [
    createChecklistItem({
      evidence: [
        `Artifact check is ${artifact.status}.`,
        formatArtifactCounts(artifact),
        artifact.artifactDir ? `Artifact dir: ${artifact.artifactDir}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      label: "Page Builder visual artifact bundle",
      nextAction: complete
        ? null
        : readBlockerAction(check, "Page Builder Visual", [
            "Visual artifact invalid",
          ]),
      nextSteps: complete
        ? []
        : readActionSteps(nextActions, "Page Builder Visual", [
            "Visual artifact invalid",
          ]),
      status: complete ? "complete" : "needs-evidence",
    }),
  ];
}

function formatArtifactCounts(artifact) {
  const files = formatCount(
    artifact.presentRequiredFileCount,
    artifact.requiredFileCount,
    "files",
  );
  const screenshots = formatCount(
    artifact.presentScreenshotCount,
    artifact.expectedScreenshotCount,
    "screenshots",
  );

  const counts = [files, screenshots].filter(Boolean).join(", ");

  return counts.length > 0 ? `${counts}.` : null;
}

function formatCount(present, expected, label) {
  if (!Number.isFinite(present) || !Number.isFinite(expected)) {
    return null;
  }

  return `${present}/${expected} ${label}`;
}

function readBlockerAction(check, area, labels = []) {
  const blocker = check.blockers.find(
    (item) =>
      item.area === area &&
      (labels.length === 0 || labels.includes(item.label)),
  );

  return blocker?.action;
}

function readActionSteps(nextActions, area, labels) {
  const action = nextActions.find(
    (item) => item.area === area && labels.includes(item.label),
  );

  return Array.isArray(action?.steps) ? action.steps : [];
}

function createChecklistItem(input) {
  return {
    evidence: readText(input.evidence) ?? "unknown",
    label: readText(input.label) ?? "unknown",
    nextAction: readText(input.nextAction),
    nextSteps: normalizeNextSteps(input.nextSteps),
    status: input.status,
  };
}

function normalizeNextSteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step) => ({
      label: readText(step?.label) ?? "unknown",
      value: readStepText(step?.value) ?? "unknown",
    }))
    .filter((step) => step.label !== "unknown" && step.value !== "unknown");
}

function countChecklistStatus(items, status) {
  return items.filter((item) => item.status === status).length;
}

function readText(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxChecklistTextLength });
}

function readStepText(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxChecklistStepTextLength });
}
