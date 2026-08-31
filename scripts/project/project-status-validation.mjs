import { projectStatusSchemaVersion } from "./project-status-artifact.mjs";
import {
  assertBoolean,
  assertEnum,
  assertIsoTimestamp,
  assertNonNegativeNumber,
  assertString,
  assertStringList,
  isRecord,
} from "./project-status-validation-primitives.mjs";
import { assertCompletionChecklist } from "./project-status-completion-checklist-validation.mjs";
import { assertVisualGate } from "./project-status-visual-gate-validation.mjs";
import { assertSmokeGate } from "./project-status-smoke-gate-validation.mjs";

const commandStatuses = new Set(["configured"]);
const localMvpScopeStatuses = new Set(["implemented"]);
const projectStatuses = new Set(["needs-evidence", "release-ready"]);
const releaseDecisions = new Set(["not-ready", "ready-to-release"]);
const releaseEvidenceStatuses = new Set(["needs-evidence", "ready"]);

export function assertProjectStatusArtifact(artifact) {
  if (!isRecord(artifact)) {
    throw new Error("Project status artifact must be an object.");
  }

  if (artifact.schemaVersion !== projectStatusSchemaVersion) {
    throw new Error(
      `Project status artifact schemaVersion must be ${projectStatusSchemaVersion}.`,
    );
  }

  assertString(artifact.phase, "phase");
  assertIsoTimestamp(artifact.generatedAt, "generatedAt");
  assertEnum(artifact.status, projectStatuses, "status");
  assertBoolean(artifact.releaseReady, "releaseReady");
  assertStatusMatchesReleaseReady(artifact);
  assertCompletionSummary(artifact.completionSummary, artifact.releaseReady);
  assertCompletionChecklist(
    artifact.completionChecklist,
    artifact.releaseReady,
  );
  assertStringList(artifact.completedMilestones, "completedMilestones");
  assertLocalVerification(artifact.localVerification);
  assertReleaseGate(artifact.releaseGate);
  assertNextActions(artifact);
}

function assertCompletionSummary(summary, releaseReady) {
  if (!isRecord(summary)) {
    throw new Error(
      "Project status artifact completionSummary must be an object.",
    );
  }

  assertEnum(
    summary.localMvpScope,
    localMvpScopeStatuses,
    "completionSummary.localMvpScope",
  );
  assertEnum(
    summary.releaseDecision,
    releaseDecisions,
    "completionSummary.releaseDecision",
  );
  assertEnum(
    summary.releaseEvidenceStatus,
    releaseEvidenceStatuses,
    "completionSummary.releaseEvidenceStatus",
  );
  assertString(summary.summary, "completionSummary.summary");

  const expectedDecision = releaseReady ? "ready-to-release" : "not-ready";
  const expectedEvidenceStatus = releaseReady ? "ready" : "needs-evidence";

  if (summary.releaseDecision !== expectedDecision) {
    throw new Error(
      "Project status artifact completionSummary.releaseDecision must match releaseReady.",
    );
  }

  if (summary.releaseEvidenceStatus !== expectedEvidenceStatus) {
    throw new Error(
      "Project status artifact completionSummary.releaseEvidenceStatus must match releaseReady.",
    );
  }
}

function assertLocalVerification(localVerification) {
  if (!isRecord(localVerification)) {
    throw new Error(
      "Project status artifact localVerification must be an object.",
    );
  }

  assertString(localVerification.source, "localVerification.source");
  assertLocalVerificationShortcut(localVerification);
  assertNonNegativeNumber(
    localVerification.commandCount,
    "localVerification.commandCount",
  );

  if (!Array.isArray(localVerification.commands)) {
    throw new Error(
      "Project status artifact localVerification.commands must be an array.",
    );
  }

  if (localVerification.commandCount !== localVerification.commands.length) {
    throw new Error(
      "Project status artifact localVerification.commandCount must match commands length.",
    );
  }

  for (const command of localVerification.commands) {
    assertCommand(command);
  }
}

function assertLocalVerificationShortcut(localVerification) {
  if (localVerification.shortcut !== undefined) {
    assertString(localVerification.shortcut, "localVerification.shortcut");
  }

  if (localVerification.handoff === undefined) {
    return;
  }

  if (!isRecord(localVerification.handoff)) {
    throw new Error(
      "Project status artifact localVerification.handoff must be an object.",
    );
  }

  assertString(
    localVerification.handoff.jsonPath,
    "localVerification.handoff.jsonPath",
  );
  assertString(
    localVerification.handoff.markdownPath,
    "localVerification.handoff.markdownPath",
  );
}

function assertReleaseGate(releaseGate) {
  if (!isRecord(releaseGate)) {
    throw new Error("Project status artifact releaseGate must be an object.");
  }

  assertNonNegativeNumber(releaseGate.blockerCount, "releaseGate.blockerCount");
  assertSmokeGate(releaseGate.smoke);
  assertVisualGate(releaseGate.visual);
}

function assertNextActions(artifact) {
  assertNonNegativeNumber(artifact.nextActionCount, "nextActionCount");
  assertNonNegativeNumber(artifact.nextActionLimit, "nextActionLimit");
  assertNonNegativeNumber(
    artifact.truncatedNextActionCount,
    "truncatedNextActionCount",
  );

  if (!Array.isArray(artifact.nextActions)) {
    throw new Error("Project status artifact nextActions must be an array.");
  }

  if (artifact.nextActionCount < artifact.nextActions.length) {
    throw new Error(
      "Project status artifact nextActionCount must cover serialized actions.",
    );
  }

  if (artifact.nextActionLimit < artifact.nextActions.length) {
    throw new Error(
      "Project status artifact nextActionLimit must cover serialized actions.",
    );
  }

  if (
    artifact.truncatedNextActionCount !==
    artifact.nextActionCount - artifact.nextActions.length
  ) {
    throw new Error(
      "Project status artifact truncatedNextActionCount must match hidden actions.",
    );
  }

  for (const action of artifact.nextActions) {
    if (!isRecord(action)) {
      throw new Error(
        "Project status artifact nextActions must contain objects.",
      );
    }

    assertString(action.action, "nextActions.action");
    assertString(action.area, "nextActions.area");
    assertString(action.label, "nextActions.label");
    assertNextActionSteps(action.steps);
  }
}

function assertNextActionSteps(steps) {
  if (steps === undefined) {
    return;
  }

  if (!Array.isArray(steps)) {
    throw new Error(
      "Project status artifact nextActions.steps must be an array.",
    );
  }

  for (const step of steps) {
    if (!isRecord(step)) {
      throw new Error(
        "Project status artifact nextActions.steps must contain objects.",
      );
    }

    assertString(step.label, "nextActions.steps.label");
    assertString(step.value, "nextActions.steps.value");
  }
}

function assertCommand(command) {
  if (!isRecord(command)) {
    throw new Error(
      "Project status artifact localVerification.commands must contain objects.",
    );
  }

  assertString(command.command, "localVerification.commands.command");
  assertString(command.label, "localVerification.commands.label");
  assertEnum(
    command.status,
    commandStatuses,
    "localVerification.commands.status",
  );
}

function assertStatusMatchesReleaseReady(artifact) {
  const expected = artifact.releaseReady ? "release-ready" : "needs-evidence";

  if (artifact.status !== expected) {
    throw new Error("Project status artifact status must match releaseReady.");
  }
}
