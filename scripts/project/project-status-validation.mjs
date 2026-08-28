import { projectStatusSchemaVersion } from "./project-status-artifact.mjs";

const commandStatuses = new Set(["configured"]);
const projectStatuses = new Set(["needs-evidence", "release-ready"]);
const smokeStatuses = new Set(["blocked", "ready"]);

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
  assertStringList(artifact.completedMilestones, "completedMilestones");
  assertLocalVerification(artifact.localVerification);
  assertReleaseGate(artifact.releaseGate);
  assertNextActions(artifact);
}

function assertLocalVerification(localVerification) {
  if (!isRecord(localVerification)) {
    throw new Error(
      "Project status artifact localVerification must be an object.",
    );
  }

  assertString(localVerification.source, "localVerification.source");
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

function assertReleaseGate(releaseGate) {
  if (!isRecord(releaseGate)) {
    throw new Error("Project status artifact releaseGate must be an object.");
  }

  assertNonNegativeNumber(releaseGate.blockerCount, "releaseGate.blockerCount");
  assertSmokeGate(releaseGate.smoke);
  assertVisualGate(releaseGate.visual);
}

function assertSmokeGate(smoke) {
  if (!isRecord(smoke)) {
    throw new Error("Project status artifact releaseGate.smoke must be an object.");
  }

  assertNonNegativeNumber(smoke.blockerCount, "releaseGate.smoke.blockerCount");
  assertNullableString(smoke.path, "releaseGate.smoke.path");
  assertEnum(smoke.status, smokeStatuses, "releaseGate.smoke.status");
  assertString(smoke.summaryStatus, "releaseGate.smoke.summaryStatus");

  if (smoke.status === "ready" && smoke.blockerCount !== 0) {
    throw new Error(
      "Project status artifact ready smoke gate must have zero blockers.",
    );
  }
}

function assertVisualGate(visual) {
  if (!isRecord(visual)) {
    throw new Error(
      "Project status artifact releaseGate.visual must be an object.",
    );
  }

  assertString(visual.status, "releaseGate.visual.status");
  assertNullableString(
    visual.artifactStatus,
    "releaseGate.visual.artifactStatus",
  );

  for (const field of [
    "acceptedComponentCount",
    "acceptedViewportCount",
    "componentCount",
    "pendingComponentCount",
    "pendingTaskCount",
    "pendingViewportCount",
    "viewportCount",
  ]) {
    assertNonNegativeNumber(visual[field], `releaseGate.visual.${field}`);
  }

  assertCountNotGreater(
    visual.acceptedComponentCount,
    visual.componentCount,
    "releaseGate.visual.acceptedComponentCount",
    "componentCount",
  );
  assertCountNotGreater(
    visual.acceptedViewportCount,
    visual.viewportCount,
    "releaseGate.visual.acceptedViewportCount",
    "viewportCount",
  );
  assertCountNotGreater(
    visual.pendingComponentCount,
    visual.componentCount,
    "releaseGate.visual.pendingComponentCount",
    "componentCount",
  );
  assertCountNotGreater(
    visual.pendingViewportCount,
    visual.viewportCount,
    "releaseGate.visual.pendingViewportCount",
    "viewportCount",
  );
}

function assertNextActions(artifact) {
  assertNonNegativeNumber(artifact.nextActionCount, "nextActionCount");

  if (!Array.isArray(artifact.nextActions)) {
    throw new Error("Project status artifact nextActions must be an array.");
  }

  if (artifact.nextActionCount < artifact.nextActions.length) {
    throw new Error(
      "Project status artifact nextActionCount must cover serialized actions.",
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
    throw new Error(
      "Project status artifact status must match releaseReady.",
    );
  }
}

function assertStringList(value, label) {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    throw new Error(`Project status artifact ${label} must be a string array.`);
  }
}

function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`Project status artifact ${label} must be boolean.`);
  }
}

function assertCountNotGreater(value, max, label, maxLabel) {
  if (value > max) {
    throw new Error(
      `Project status artifact ${label} must not exceed ${maxLabel}.`,
    );
  }
}

function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new Error(
      `Project status artifact ${label} must be one of: ${[...allowed].join(
        ", ",
      )}.`,
    );
  }
}

function assertIsoTimestamp(value, label) {
  assertString(value, label);

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error(
      `Project status artifact ${label} must be a canonical ISO timestamp.`,
    );
  }
}

function assertNonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Project status artifact ${label} must be a non-negative number.`,
    );
  }
}

function assertNullableString(value, label) {
  if (value !== null && value !== undefined && !isNonEmptyString(value)) {
    throw new Error(
      `Project status artifact ${label} must be a string or null.`,
    );
  }
}

function assertString(value, label) {
  if (!isNonEmptyString(value)) {
    throw new Error(`Project status artifact ${label} must be a string.`);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
