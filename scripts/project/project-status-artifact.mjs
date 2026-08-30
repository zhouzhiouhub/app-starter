import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createProjectCompletionChecklist } from "./project-status-completion-checklist.mjs";
import {
  createProjectNextActions,
  readPendingVisualTasks,
} from "./project-status-next-actions.mjs";

export const projectStatusSchemaVersion = "project-status.v1";

const maxProjectActionCount = 8;
const maxProjectTextLength = 420;
const localVerificationShortcut = "pnpm run verify:local";
const localVerificationHandoff = {
  jsonPath: "tmp/project-status.json",
  markdownPath: "tmp/project-status-handoff.md",
};

const completedMilestones = [
  "Monorepo apps, shared packages, and extension/custom directories are scaffolded.",
  "MVP page management, Page Builder, preview, publish, rollback, SEO, media, audit logs, and starter pages are implemented.",
  "Commerce and multi-locale expansion remain explicit disabled placeholders for MVP.",
  "Production smoke, visual acceptance, release evidence, and release notes tooling are wired.",
  "Production deployment, environment variable matrix, and rollback runbook are documented for the MVP release path.",
];

const localVerificationCommands = [
  {
    command: "pnpm install --frozen-lockfile",
    label: "Install",
  },
  {
    command: "pnpm run check:file-size",
    label: "File size guard",
  },
  {
    command: "pnpm typecheck",
    label: "TypeScript",
  },
  {
    command: "pnpm lint",
    label: "Lint",
  },
  {
    command: "pnpm test",
    label: "Tests",
  },
  {
    command: "pnpm build",
    label: "Build",
  },
  {
    command:
      "pnpm project:status -- --all-actions --output tmp/project-status.json --markdown-output tmp/project-status-handoff.md",
    label: "Project status handoff",
  },
];

export function createProjectStatusArtifact(check, input = {}) {
  const nextActions = createProjectNextActions(check);
  const serializedActionCount = input.includeAllActions
    ? nextActions.length
    : maxProjectActionCount;
  const serializedNextActions = nextActions.slice(0, serializedActionCount);

  return {
    completionSummary: createCompletionSummary(check),
    completionChecklist: createProjectCompletionChecklist(check, nextActions),
    completedMilestones,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    localVerification: createLocalVerificationSummary(),
    nextActionCount: nextActions.length,
    nextActionLimit: serializedActionCount,
    nextActions: serializedNextActions,
    phase: "MVP release verification",
    releaseGate: createReleaseGateSummary(check),
    releaseReady: check.releaseReady,
    schemaVersion: projectStatusSchemaVersion,
    status: check.releaseReady ? "release-ready" : "needs-evidence",
    truncatedNextActionCount: nextActions.length - serializedNextActions.length,
  };
}

function createCompletionSummary(check) {
  const releaseReady = check.releaseReady === true;

  return {
    localMvpScope: "implemented",
    releaseDecision: releaseReady ? "ready-to-release" : "not-ready",
    releaseEvidenceStatus: releaseReady ? "ready" : "needs-evidence",
    summary: releaseReady
      ? "MVP implementation and retained release evidence are ready for release notes."
      : "MVP implementation is in release verification; final completion still requires retained production smoke and Page Builder visual acceptance evidence.",
  };
}

function createLocalVerificationSummary() {
  return {
    commandCount: localVerificationCommands.length,
    commands: localVerificationCommands.map((item) => ({
      command: item.command,
      label: item.label,
      status: "configured",
    })),
    handoff: localVerificationHandoff,
    shortcut: localVerificationShortcut,
    source: "CI verify job and local package scripts",
  };
}

function createReleaseGateSummary(check) {
  return {
    blockerCount: check.blockers.length,
    smoke: {
      blockerCount: countBlockers(check, "Production Smoke"),
      path: readText(check.smoke.path),
      status: check.smoke.releaseReady ? "ready" : "blocked",
      summaryStatus: readText(check.smoke.summary?.status) ?? "unknown",
    },
    visual: {
      acceptedComponentCount: check.visual.acceptedComponentCount,
      acceptedViewportCount: check.visual.acceptedViewportCount,
      artifactCheck: createVisualArtifactCheckSummary(check.visualArtifact),
      artifactStatus: readText(check.visualArtifact?.status),
      componentCount: check.visual.componentCount,
      pendingComponentCount: readPendingCount(check.visual.records),
      pendingTaskCount: readVisualPendingTaskCount(check.visualChecklist),
      pendingViewportCount: readVisualPendingViewportCount(check.visualChecklist),
      status: check.visual.status,
      viewportCount: check.visual.viewportCount,
    },
  };
}

function createVisualArtifactCheckSummary(check) {
  if (!check) {
    return null;
  }

  return {
    artifactDir: readText(check.artifactDir),
    expectedScreenshotCount: readCount(check.expectedScreenshotCount),
    presentRequiredFileCount: readCount(check.presentRequiredFileCount),
    presentScreenshotCount: readCount(check.presentScreenshotCount),
    requiredFileCount: readCount(check.requiredFileCount),
    status: readText(check.status) ?? "unknown",
  };
}

function readPendingCount(records) {
  return Array.isArray(records)
    ? records.filter((record) => record.accepted !== true).length
    : 0;
}

function readVisualPendingTaskCount(checklist) {
  return readPendingVisualTasks(checklist).length;
}

function readVisualPendingViewportCount(checklist) {
  return typeof checklist?.pendingViewportCount === "number"
    ? checklist.pendingViewportCount
    : readVisualPendingTaskCount(checklist);
}

function countBlockers(check, area) {
  return check.blockers.filter((blocker) => blocker.area === area).length;
}

function readText(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxProjectTextLength });
}

function readCount(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
