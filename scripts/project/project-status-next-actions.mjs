import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createProductionSmokeHandoffSteps } from "../smoke/production-smoke-handoff-steps.mjs";
import { createReleaseNotesHandoffSteps } from "../release/release-notes-handoff-steps.mjs";
import { createReleaseEvidenceRequestAction } from "./project-status-release-evidence-action.mjs";
import {
  createPageBuilderVisualActionSteps,
  readVisualTaskActions,
} from "./project-status-visual-next-actions.mjs";

export { readPendingVisualTasks } from "./project-status-visual-next-actions.mjs";

const maxProjectTextLength = 420;

export function createProjectNextActions(check) {
  if (check.releaseReady) {
    return [createReleaseNotesAction()];
  }

  return [
    ...readProjectBlockerActions(check.blockers, {
      smokeReportPath: readText(check.smoke?.path),
      visualArtifactDir:
        readText(check.visualArtifact?.artifactDir) ??
        readText(check.visualArtifactDir),
    }),
    createReleaseEvidenceRequestAction(),
    ...readVisualTaskActions(check.visualChecklist),
  ];
}

function createReleaseNotesAction() {
  return {
    action:
      "Run pnpm release:notes with release tag, workflow run URL, artifact names, storefront URL, and rollback target.",
    area: "Release Notes",
    label: "Generate release record",
    steps: createReleaseNotesHandoffSteps(),
  };
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
    action:
      readActionText(blocker.action) ?? "Review the release evidence blocker.",
    area: readText(blocker.area) ?? "Release",
    label: readText(blocker.label) ?? "Blocked",
  };
  const steps = createBlockerActionSteps(action, context);

  return steps.length > 0 ? { ...action, steps } : action;
}
function createBlockerActionSteps(action, context) {
  const productionSmokeSteps = createProductionSmokeActionSteps(action, context);

  if (productionSmokeSteps.length > 0) {
    return productionSmokeSteps;
  }

  return createPageBuilderVisualActionSteps(action, context);
}

function createProductionSmokeActionSteps(action, context) {
  if (
    action.area !== "Production Smoke" ||
    action.label !== "Production smoke artifact missing"
  ) {
    return [];
  }

  return createProductionSmokeHandoffSteps({
    includeRunWorkflow: true,
    rerunGateCommand: createReleaseCheckCommand(context),
  });
}

function createReleaseCheckCommand(context) {
  const smokeReportPath = context.smokeReportPath ?? "<path>";
  const command = [`pnpm release:check -- --smoke-report ${smokeReportPath}`];

  if (context.visualArtifactDir) {
    command.push(`--visual-artifact-dir ${context.visualArtifactDir}`);
  }

  return command.join(" ");
}

function readText(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxProjectTextLength });
}

function readActionText(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value);
}
