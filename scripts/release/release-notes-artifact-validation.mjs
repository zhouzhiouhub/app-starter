import { releaseEvidenceCheckSchemaVersion } from "./release-check-artifact.mjs";
import {
  assertBoolean,
  assertCountDoesNotExceed,
  assertEnum,
  assertNonNegativeNumber,
  assertNullableString,
  assertOptionalNonNegativeNumber,
  assertOptionalStringList,
  assertString,
  hasItems,
  isPlainRecord,
} from "./release-notes-artifact-assertions.mjs";
import { assertOptionalReadinessChecklist } from "./release-notes-artifact-readiness-validation.mjs";

const releaseArtifactStatuses = new Set(["ready", "blocked"]);
const releaseArtifactVisualStatuses = new Set(["accepted", "invalid", "needs-evidence"]);
const releaseArtifactIssueSeverities = new Set(["error", "warning"]);

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
  assertBoolean(artifact.releaseReady, "releaseReady");
  assertStatusMatchesReleaseReady(artifact);

  if (!isPlainRecord(artifact.smoke) || !isPlainRecord(artifact.visual)) {
    throw new Error(
      "Release check artifact must include smoke and visual objects.",
    );
  }

  assertBlockers(artifact.blockers);
  assertOptionalReadinessChecklist(artifact.readinessChecklist);
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

  if (
    artifact.readinessChecklist !== undefined &&
    artifact.readinessChecklist.releaseReady !== artifact.releaseReady
  ) {
    throw new Error(
      "Release check artifact readinessChecklist.releaseReady must match releaseReady.",
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
  assertStatusValueMatchesBoolean(
    smoke.status,
    smoke.releaseReady,
    "smoke.status",
    "smoke.releaseReady",
  );

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
  assertSmokeReadySummaryConsistency(smoke);

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
  assertNonNegativeNumber(visual.acceptedComponentCount, "visual.acceptedComponentCount");
  assertNonNegativeNumber(visual.acceptedViewportCount, "visual.acceptedViewportCount");
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
  assertVisualIssueCountConsistency(visual);
  assertAcceptedVisualConsistency(visual);
}

function assertStatusValueMatchesBoolean(status, ready, statusLabel, readyLabel) {
  const expected = ready ? "ready" : "blocked";

  if (status !== expected) {
    throw new Error(
      `Release check artifact ${statusLabel} must match ${readyLabel}.`,
    );
  }
}

function assertSmokeReadySummaryConsistency(smoke) {
  if (!smoke.releaseReady) {
    return;
  }

  if (
    smoke.summary.productionReady !== true ||
    smoke.summary.failedCheckCount !== 0
  ) {
    throw new Error(
      "Release check artifact ready smoke must have productionReady true and zero failed checks.",
    );
  }
}

function assertVisualIssueCountConsistency(visual) {
  const issues = Array.isArray(visual.issues) ? visual.issues : [];

  if (visual.issueCount !== undefined && visual.issueCount < issues.length) {
    throw new Error(
      "Release check artifact visual.issueCount must cover serialized visual issues.",
    );
  }

  const serializedErrorCount = issues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const serializedWarningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  if (visual.errorCount < serializedErrorCount) {
    throw new Error(
      "Release check artifact visual.errorCount must cover serialized visual errors.",
    );
  }

  if (visual.warningCount < serializedWarningCount) {
    throw new Error(
      "Release check artifact visual.warningCount must cover serialized visual warnings.",
    );
  }
}

function assertAcceptedVisualConsistency(visual) {
  if (visual.status !== "accepted") {
    return;
  }

  const hasPending =
    hasItems(visual.pendingComponents) || hasItems(visual.pendingViewports);
  const hasIssues =
    (visual.issueCount ?? 0) > 0 ||
    hasItems(visual.issues) ||
    visual.errorCount > 0 ||
    visual.warningCount > 0;

  if (
    visual.acceptedComponentCount !== visual.componentCount ||
    visual.acceptedViewportCount !== visual.viewportCount ||
    hasPending ||
    hasIssues
  ) {
    throw new Error(
      "Release check artifact accepted visual evidence must have full counts, no pending evidence, and no issues.",
    );
  }
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
