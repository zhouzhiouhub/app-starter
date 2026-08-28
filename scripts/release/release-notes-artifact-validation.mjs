import { releaseEvidenceCheckSchemaVersion } from "./release-check-artifact.mjs";
import { hasInvalidVisualArtifactCheck } from "./release-notes-visual-artifact-validation.mjs";
import {
  assertBoolean,
  assertEnum,
  assertNonNegativeNumber,
  assertNullableString,
  assertString,
  isPlainRecord,
} from "./release-notes-artifact-assertions.mjs";
import { assertOptionalReadinessChecklist } from "./release-notes-artifact-readiness-validation.mjs";
import {
  assertSmokeSourceArtifact,
  hasReadySmokeSourceArtifact,
} from "./release-notes-smoke-source-validation.mjs";
import { assertVisualArtifact } from "./release-notes-visual-evidence-validation.mjs";

const releaseArtifactStatuses = new Set(["ready", "blocked"]);

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

  if (!hasReadySmokeSourceArtifact(artifact.smoke.source)) {
    throw new Error(
      "Release check artifact ready evidence must include production smoke source metadata.",
    );
  }

  if (
    artifact.visual.status !== "accepted" ||
    artifact.visual.acceptedComponentCount !== artifact.visual.componentCount ||
    artifact.visual.acceptedViewportCount !== artifact.visual.viewportCount ||
    artifact.visual.errorCount !== 0 ||
    hasInvalidVisualArtifactCheck(artifact.visual.artifactCheck)
  ) {
    throw new Error(
      "Release check artifact ready evidence must include accepted visual evidence.",
    );
  }
}

function assertSmokeArtifact(smoke) {
  assertBoolean(smoke.releaseReady, "smoke.releaseReady");
  assertSmokeSourceArtifact(smoke.source);
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
