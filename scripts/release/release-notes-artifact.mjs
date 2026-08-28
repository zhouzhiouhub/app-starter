import { readFile } from "node:fs/promises";
import { releaseEvidenceCheckSchemaVersion } from "./release-check-artifact.mjs";

const releaseArtifactStatuses = new Set(["ready", "blocked"]);
const releaseArtifactVisualStatuses = new Set([
  "accepted",
  "invalid",
  "needs-evidence",
]);
const releaseArtifactIssueSeverities = new Set(["error", "warning"]);

export async function readReleaseEvidenceCheckArtifact(path) {
  const artifact = JSON.parse(await readFile(path, "utf8"));
  assertReleaseEvidenceCheckArtifact(artifact);
  return artifact;
}

export function assertReleaseEvidenceCheckArtifact(artifact) {
  if (!isPlainRecord(artifact)) {
    throw new Error("Release check artifact must be an object.");
  }

  if (artifact.schemaVersion !== releaseEvidenceCheckSchemaVersion) {
    throw new Error(
      `Release check artifact schemaVersion must be ${releaseEvidenceCheckSchemaVersion}.`,
    );
  }

  assertEnum(artifact.status, releaseArtifactStatuses, "status");
  if (typeof artifact.releaseReady !== "boolean") {
    throw new Error("Release check artifact releaseReady must be boolean.");
  }
  assertStatusMatchesReleaseReady(artifact);

  if (!isPlainRecord(artifact.smoke) || !isPlainRecord(artifact.visual)) {
    throw new Error(
      "Release check artifact must include smoke and visual objects.",
    );
  }

  assertBlockers(artifact.blockers);
  assertSmokeArtifact(artifact.smoke);
  assertVisualArtifact(artifact.visual);
  assertReleaseReadinessConsistency(artifact);
}

function assertStatusMatchesReleaseReady(artifact) {
  const expected = artifact.releaseReady ? "ready" : "blocked";

  if (artifact.status !== expected) {
    throw new Error("Release check artifact status must match releaseReady.");
  }
}

function assertBlockers(blockers) {
  if (!Array.isArray(blockers)) {
    throw new Error("Release check artifact blockers must be an array.");
  }

  for (const blocker of blockers) {
    if (!isPlainRecord(blocker)) {
      throw new Error("Release check artifact blockers must contain objects.");
    }

    assertString(blocker.action, "blocker.action");
    assertString(blocker.area, "blocker.area");
    assertString(blocker.label, "blocker.label");
  }
}

function assertReleaseReadinessConsistency(artifact) {
  assertNonNegativeNumber(artifact.blockerCount, "blockerCount");

  if (artifact.blockerCount < artifact.blockers.length) {
    throw new Error(
      "Release check artifact blockerCount must cover serialized blockers.",
    );
  }

  if (!artifact.releaseReady) {
    return;
  }

  if (artifact.blockerCount !== 0 || artifact.blockers.length !== 0) {
    throw new Error("Release check artifact ready evidence must have no blockers.");
  }

  if (
    artifact.smoke.releaseReady !== true ||
    artifact.smoke.status !== "ready" ||
    artifact.smoke.summary.productionReady !== true ||
    artifact.smoke.summary.failedCheckCount !== 0
  ) {
    throw new Error(
      "Release check artifact ready evidence must include ready production smoke.",
    );
  }

  if (
    artifact.visual.status !== "accepted" ||
    artifact.visual.acceptedComponentCount !== artifact.visual.componentCount ||
    artifact.visual.acceptedViewportCount !== artifact.visual.viewportCount ||
    artifact.visual.errorCount !== 0
  ) {
    throw new Error(
      "Release check artifact ready evidence must include accepted visual evidence.",
    );
  }
}

function assertSmokeArtifact(smoke) {
  assertBoolean(smoke.releaseReady, "smoke.releaseReady");
  assertEnum(smoke.status, releaseArtifactStatuses, "smoke.status");

  if (!isPlainRecord(smoke.summary)) {
    throw new Error("Release check artifact smoke.summary must be an object.");
  }

  assertNonNegativeNumber(smoke.summary.checkCount, "smoke.summary.checkCount");
  assertNonNegativeNumber(
    smoke.summary.failedCheckCount,
    "smoke.summary.failedCheckCount",
  );
  assertBoolean(smoke.summary.productionReady, "smoke.summary.productionReady");
  assertString(smoke.summary.status, "smoke.summary.status");

  if (!Array.isArray(smoke.traceability)) {
    throw new Error("Release check artifact smoke.traceability must be an array.");
  }

  for (const group of smoke.traceability) {
    if (!isPlainRecord(group)) {
      throw new Error(
        "Release check artifact smoke.traceability must contain objects.",
      );
    }

    assertNullableString(group.action, "smoke.traceability.action");
    assertString(group.label, "smoke.traceability.label");
    assertString(group.status, "smoke.traceability.status");
  }
}

function assertVisualArtifact(visual) {
  assertEnum(visual.status, releaseArtifactVisualStatuses, "visual.status");
  assertNonNegativeNumber(
    visual.acceptedComponentCount,
    "visual.acceptedComponentCount",
  );
  assertNonNegativeNumber(
    visual.acceptedViewportCount,
    "visual.acceptedViewportCount",
  );
  assertNonNegativeNumber(visual.componentCount, "visual.componentCount");
  assertNonNegativeNumber(visual.viewportCount, "visual.viewportCount");
  assertNonNegativeNumber(visual.errorCount, "visual.errorCount");
  assertNonNegativeNumber(visual.warningCount, "visual.warningCount");
  assertOptionalNonNegativeNumber(visual.issueCount, "visual.issueCount");
  assertCountDoesNotExceed(
    visual.acceptedComponentCount,
    visual.componentCount,
    "visual.acceptedComponentCount",
    "visual.componentCount",
  );
  assertCountDoesNotExceed(
    visual.acceptedViewportCount,
    visual.viewportCount,
    "visual.acceptedViewportCount",
    "visual.viewportCount",
  );
  assertNullableString(visual.manifestPath, "visual.manifestPath");
  assertOptionalStringList(visual.pendingComponents, "visual.pendingComponents");
  assertOptionalStringList(visual.pendingViewports, "visual.pendingViewports");
  assertOptionalVisualIssues(visual.issues);
}

function assertOptionalVisualIssues(issues) {
  if (issues === undefined) {
    return;
  }

  if (!Array.isArray(issues)) {
    throw new Error("Release check artifact visual.issues must be an array.");
  }

  for (const issue of issues) {
    if (!isPlainRecord(issue)) {
      throw new Error(
        "Release check artifact visual.issues must contain objects.",
      );
    }

    assertString(issue.code, "visual.issues.code");
    assertNullableString(issue.component, "visual.issues.component");
    assertString(issue.message, "visual.issues.message");
    assertEnum(
      issue.severity,
      releaseArtifactIssueSeverities,
      "visual.issues.severity",
    );
    assertNullableString(issue.viewport, "visual.issues.viewport");
  }
}

function assertOptionalStringList(value, label) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    throw new Error(`Release check artifact ${label} must be a string array.`);
  }
}

function assertOptionalNonNegativeNumber(value, label) {
  if (value !== undefined) {
    assertNonNegativeNumber(value, label);
  }
}

function assertNonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Release check artifact ${label} must be a non-negative number.`,
    );
  }
}

function assertCountDoesNotExceed(value, max, label, maxLabel) {
  if (value > max) {
    throw new Error(
      `Release check artifact ${label} must not exceed ${maxLabel}.`,
    );
  }
}

function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new Error(
      `Release check artifact ${label} must be one of: ${[...allowed].join(
        ", ",
      )}.`,
    );
  }
}

function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`Release check artifact ${label} must be boolean.`);
  }
}

function assertString(value, label) {
  if (!isNonEmptyString(value)) {
    throw new Error(`Release check artifact ${label} must be a string.`);
  }
}

function assertNullableString(value, label) {
  if (value !== null && value !== undefined && !isNonEmptyString(value)) {
    throw new Error(`Release check artifact ${label} must be a string or null.`);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
