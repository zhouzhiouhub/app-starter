import { formatSmokeText } from "../smoke/smoke-text.mjs";

export const projectStatusSchemaVersion = "project-status.v1";

const maxProjectActionCount = 8;
const maxProjectTextLength = 420;

const productionSmokeArtifactNames = [
  "production-smoke-report-<run_number>",
  "release-preflight-<run_number>",
  "release-evidence-check-<run_number>",
  "project-status-<run_number>",
];

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
];

export function createProjectStatusArtifact(check, input = {}) {
  const nextActions = createProjectNextActions(check);
  const serializedActionCount = input.includeAllActions
    ? nextActions.length
    : maxProjectActionCount;
  const serializedNextActions = nextActions.slice(0, serializedActionCount);

  return {
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

function createLocalVerificationSummary() {
  return {
    commandCount: localVerificationCommands.length,
    commands: localVerificationCommands.map((item) => ({
      command: item.command,
      label: item.label,
      status: "configured",
    })),
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

function createProjectNextActions(check) {
  if (check.releaseReady) {
    return [
      {
        action:
          "Run pnpm release:notes with release tag, workflow run URL, artifact names, storefront URL, and rollback target.",
        area: "Release Notes",
        label: "Generate release record",
      },
    ];
  }

  return [
    ...readProjectBlockerActions(check.blockers, {
      smokeReportPath: readText(check.smoke?.path),
    }),
    ...readVisualTaskActions(check.visualChecklist),
  ];
}

function readProjectBlockerActions(blockers, context = {}) {
  return blockers
    .filter((blocker) => !isVisualRecordWarning(blocker))
    .map((blocker) => createBlockerAction(blocker, context));
}

function isVisualRecordWarning(blocker) {
  return (
    blocker.area === "Page Builder Visual" &&
    typeof blocker.label === "string" &&
    blocker.label.startsWith("record_")
  );
}

function createBlockerAction(blocker, context = {}) {
  const action = {
    action: readText(blocker.action) ?? "Review the release evidence blocker.",
    area: readText(blocker.area) ?? "Release",
    label: readText(blocker.label) ?? "Blocked",
  };
  const steps = createBlockerActionSteps(action, context);

  return steps.length > 0 ? { ...action, steps } : action;
}

function createBlockerActionSteps(action, context) {
  if (
    action.area !== "Production Smoke" ||
    action.label !== "Production smoke artifact missing"
  ) {
    return [];
  }

  return [
    createNextActionStep(
      "Run workflow",
      "GitHub Actions Production Smoke against the production environment",
    ),
    createNextActionStep("Keep artifacts", productionSmokeArtifactNames.join(", ")),
    createNextActionStep(
      "Rerun gate",
      context.smokeReportPath
        ? `pnpm release:check -- --smoke-report ${context.smokeReportPath}`
        : "pnpm release:check -- --smoke-report <path>",
    ),
  ];
}

function readVisualTaskActions(checklist) {
  return readPendingVisualTasks(checklist).map((task) => ({
    action: [
      `Place ${task.expectedDesignReference}.`,
      `Capture ${task.expectedPreviewScreenshot}.`,
      task.commands?.capture ? `Run ${task.commands.capture}.` : null,
      task.commands?.referenceReport
        ? `Run ${task.commands.referenceReport}.`
        : null,
      task.commands?.importReference
        ? `Run ${task.commands.importReference}.`
        : null,
      task.commands?.measure ? `Run ${task.commands.measure}.` : null,
      task.commands?.acceptPassing
        ? `Run ${task.commands.acceptPassing} after review passes.`
        : null,
      task.commands?.verify ? `Verify with ${task.commands.verify}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
    area: "Page Builder Visual",
    label: `${task.component}.${task.viewport}`,
    steps: createVisualTaskActionSteps(task),
  }));
}

function createVisualTaskActionSteps(task) {
  return [
    createNextActionStep("Reference", task.expectedDesignReference),
    createNextActionStep("Preview", task.expectedPreviewScreenshot),
    createNextActionStep("Capture", task.commands?.capture),
    createNextActionStep("Reference report", task.commands?.referenceReport),
    createNextActionStep("Import", task.commands?.importReference),
    createNextActionStep("Measure", task.commands?.measure),
    createNextActionStep("Accept passing", task.commands?.acceptPassing),
    createNextActionStep("Verify", task.commands?.verify),
  ].filter(Boolean);
}

function createNextActionStep(label, value) {
  return typeof value === "string" && value.length > 0
    ? {
        label,
        value,
      }
    : null;
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
