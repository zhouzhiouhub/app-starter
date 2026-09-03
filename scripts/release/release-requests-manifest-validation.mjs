import {
  releaseRequestsManifestSchemaVersion,
} from "./release-requests-manifest-schema.mjs";
import {
  assertProjectCompletion,
} from "./release-requests-manifest-project-validation.mjs";
import {
  assertProductionSmoke,
} from "./release-requests-manifest-smoke-validation.mjs";
import {
  assertBoolean,
  assertEnum,
  assertIsoTimestamp,
  assertNonNegativeNumber,
  assertNullableString,
  assertRecord,
  assertString,
  assertStringList,
  assertStringMap,
  fail,
} from "./release-requests-manifest-validation-primitives.mjs";

const manifestStatuses = new Set(["needs-evidence", "ready"]);
const releaseDecisions = new Set(["not-ready", "ready-to-release"]);
const projectStatuses = new Set(["needs-evidence", "release-ready"]);

export function assertReleaseRequestsManifest(manifest) {
  assertRecord(manifest, "root");

  if (manifest.schemaVersion !== releaseRequestsManifestSchemaVersion) {
    fail("schemaVersion", `must be ${releaseRequestsManifestSchemaVersion}`);
  }

  assertString(manifest.command, "command");
  assertIsoTimestamp(manifest.generatedAt, "generatedAt");
  assertEnum(manifest.status, manifestStatuses, "status");
  assertRecord(manifest.outputPaths, "outputPaths");
  assertPageBuilderVisual(manifest.pageBuilderVisual);
  assertProjectCompletion(manifest.projectCompletion);
  assertProductionSmoke(manifest.productionSmoke);
  assertReleaseEvidence(manifest.releaseEvidence);
  assertReleaseStateConsistency(manifest);
}

function assertPageBuilderVisual(visual) {
  assertRecord(visual, "pageBuilderVisual");
  assertRecord(visual.commands, "pageBuilderVisual.commands");
  assertStringMap(visual.commands, "pageBuilderVisual.commands");
  assertNullableString(
    visual.firstMissingReference,
    "pageBuilderVisual.firstMissingReference",
  );
  assertNullableString(
    visual.firstMissingReferenceReason,
    "pageBuilderVisual.firstMissingReferenceReason",
  );
  assertNullableString(
    visual.firstMissingReferencePreview,
    "pageBuilderVisual.firstMissingReferencePreview",
  );
  assertNonNegativeNumber(
    visual.failedMeasurementCount,
    "pageBuilderVisual.failedMeasurementCount",
  );
  assertNonNegativeNumber(
    visual.failedMeasurementViewportCount,
    "pageBuilderVisual.failedMeasurementViewportCount",
  );
  assertNullableString(
    visual.firstFailedMeasurement,
    "pageBuilderVisual.firstFailedMeasurement",
  );
  assertNonNegativeNumber(visual.missingCount, "pageBuilderVisual.missingCount");
  assertStringList(visual.missingReferences, "pageBuilderVisual.missingReferences");
  assertNonNegativeNumber(
    visual.requiredReferenceCount,
    "pageBuilderVisual.requiredReferenceCount",
  );
  assertNullableString(
    visual.referenceExportManifestPath,
    "pageBuilderVisual.referenceExportManifestPath",
  );
  assertNullableString(
    visual.referenceExportTablePath,
    "pageBuilderVisual.referenceExportTablePath",
  );
  assertNullableString(
    visual.referenceHandoffOutputDir,
    "pageBuilderVisual.referenceHandoffOutputDir",
  );
  assertNullableString(
    visual.referenceHandoffReadmePath,
    "pageBuilderVisual.referenceHandoffReadmePath",
  );
  assertNullableString(
    visual.referenceRequestPath,
    "pageBuilderVisual.referenceRequestPath",
  );
  assertString(visual.status, "pageBuilderVisual.status");

  if (visual.missingCount !== visual.missingReferences.length) {
    fail("pageBuilderVisual.missingCount", "must match missingReferences length");
  }

  if (visual.failedMeasurementViewportCount > visual.requiredReferenceCount) {
    fail(
      "pageBuilderVisual.failedMeasurementViewportCount",
      "must not exceed requiredReferenceCount",
    );
  }

  if (
    visual.firstMissingReference !== null &&
    visual.firstMissingReference !== visual.missingReferences[0]
  ) {
    fail(
      "pageBuilderVisual.firstMissingReference",
      "must match the first missing reference",
    );
  }

  if (
    visual.firstMissingReference === null &&
    (visual.firstMissingReferenceReason != null ||
      visual.firstMissingReferencePreview != null)
  ) {
    fail(
      "pageBuilderVisual.firstMissingReferenceReason",
      "and firstMissingReferencePreview must be null when there is no first missing reference",
    );
  }
}

function assertReleaseEvidence(evidence) {
  assertRecord(evidence, "releaseEvidence");
  assertNonNegativeNumber(evidence.blockerCount, "releaseEvidence.blockerCount");
  assertEnum(evidence.decision, releaseDecisions, "releaseEvidence.decision");
  assertBoolean(evidence.ready, "releaseEvidence.ready");
  assertNullableString(evidence.requestPath, "releaseEvidence.requestPath");
  assertEnum(evidence.status, projectStatuses, "releaseEvidence.status");
}

function assertReleaseStateConsistency(manifest) {
  const expectedStatus = manifest.releaseEvidence.ready
    ? "ready"
    : "needs-evidence";
  const expectedDecision = manifest.releaseEvidence.ready
    ? "ready-to-release"
    : "not-ready";
  const expectedProjectStatus = manifest.releaseEvidence.ready
    ? "release-ready"
    : "needs-evidence";

  if (manifest.status !== expectedStatus) {
    fail("status", "must match releaseEvidence.ready");
  }

  if (manifest.releaseEvidence.decision !== expectedDecision) {
    fail("releaseEvidence.decision", "must match releaseEvidence.ready");
  }

  if (manifest.projectCompletion.releaseReady !== manifest.releaseEvidence.ready) {
    fail(
      "projectCompletion.releaseReady",
      "must match releaseEvidence.ready",
    );
  }

  if (manifest.projectCompletion.releaseDecision !== expectedDecision) {
    fail(
      "projectCompletion.releaseDecision",
      "must match releaseEvidence.ready",
    );
  }

  if (manifest.projectCompletion.releaseEvidenceStatus !== expectedStatus) {
    fail(
      "projectCompletion.releaseEvidenceStatus",
      "must match releaseEvidence.ready",
    );
  }

  if (manifest.projectCompletion.status !== expectedProjectStatus) {
    fail("projectCompletion.status", "must match releaseEvidence.ready");
  }

  if (manifest.productionSmoke.readyToDispatch && manifest.productionSmoke.missingInputCount > 0) {
    fail(
      "productionSmoke.readyToDispatch",
      "must not be true while inputs are missing",
    );
  }
}
