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

const releaseArtifactIssueSeverities = new Set(["error", "warning"]);
const releaseArtifactVisualArtifactStatuses = new Set(["complete", "invalid"]);

export function assertOptionalVisualArtifactCheck(check) {
  if (check === undefined) {
    return;
  }

  if (!isPlainRecord(check)) {
    throw new Error(
      "Release check artifact visual.artifactCheck must be an object.",
    );
  }

  assertNullableString(check.artifactDir, "visual.artifactCheck.artifactDir");
  assertEnum(
    check.status,
    releaseArtifactVisualArtifactStatuses,
    "visual.artifactCheck.status",
  );
  assertNonNegativeNumber(
    check.expectedScreenshotCount,
    "visual.artifactCheck.expectedScreenshotCount",
  );
  assertNonNegativeNumber(
    check.presentScreenshotCount,
    "visual.artifactCheck.presentScreenshotCount",
  );
  assertNonNegativeNumber(
    check.requiredFileCount,
    "visual.artifactCheck.requiredFileCount",
  );
  assertNonNegativeNumber(
    check.presentRequiredFileCount,
    "visual.artifactCheck.presentRequiredFileCount",
  );
  assertOptionalNonNegativeNumber(
    check.presentDesignReferenceCount,
    "visual.artifactCheck.presentDesignReferenceCount",
  );
  assertOptionalNonNegativeNumber(
    check.referencedDesignReferenceCount,
    "visual.artifactCheck.referencedDesignReferenceCount",
  );
  assertOptionalNonNegativeNumber(
    check.issueCount,
    "visual.artifactCheck.issueCount",
  );
  assertOptionalReferenceImport(check.referenceImport);
  assertCountDoesNotExceed(
    check.presentScreenshotCount,
    check.expectedScreenshotCount,
    "visual.artifactCheck.presentScreenshotCount",
    "visual.artifactCheck.expectedScreenshotCount",
  );
  assertCountDoesNotExceed(
    check.presentRequiredFileCount,
    check.requiredFileCount,
    "visual.artifactCheck.presentRequiredFileCount",
    "visual.artifactCheck.requiredFileCount",
  );
  assertOptionalCountDoesNotExceed(
    check.presentDesignReferenceCount,
    check.referencedDesignReferenceCount,
    "visual.artifactCheck.presentDesignReferenceCount",
    "visual.artifactCheck.referencedDesignReferenceCount",
  );
  assertOptionalVisualIssues(check.issues);
  assertVisualArtifactIssueCountConsistency(check);
}

function assertOptionalReferenceImport(referenceImport) {
  if (referenceImport === undefined) {
    return;
  }

  if (!isPlainRecord(referenceImport)) {
    throw new Error(
      "Release check artifact visual.artifactCheck.referenceImport must be an object.",
    );
  }

  assertBoolean(
    referenceImport.complete,
    "visual.artifactCheck.referenceImport.complete",
  );
  assertNullableString(
    referenceImport.manifestPath,
    "visual.artifactCheck.referenceImport.manifestPath",
  );
  assertNonNegativeNumber(
    referenceImport.missingCount,
    "visual.artifactCheck.referenceImport.missingCount",
  );
  assertOptionalMissingReferences(referenceImport);
  assertOptionalRequiredReferenceSummary(referenceImport);
  assertNullableString(
    referenceImport.sourceDir,
    "visual.artifactCheck.referenceImport.sourceDir",
  );
  assertString(
    referenceImport.sourceDirStatus,
    "visual.artifactCheck.referenceImport.sourceDirStatus",
  );
  assertString(
    referenceImport.status,
    "visual.artifactCheck.referenceImport.status",
  );
  assertBoolean(
    referenceImport.updated,
    "visual.artifactCheck.referenceImport.updated",
  );
  assertNonNegativeNumber(
    referenceImport.updateCount,
    "visual.artifactCheck.referenceImport.updateCount",
  );

  if (referenceImport.complete && referenceImport.missingCount > 0) {
    throw new Error(
      "Release check artifact complete referenceImport must have no missing references.",
    );
  }
}

function assertOptionalRequiredReferenceSummary(referenceImport) {
  if (
    referenceImport.requiredReferenceCount === undefined &&
    referenceImport.requiredReferenceEntryCount === undefined &&
    referenceImport.requiredReferenceStatusCounts === undefined
  ) {
    return;
  }

  assertNonNegativeNumber(
    referenceImport.requiredReferenceCount,
    "visual.artifactCheck.referenceImport.requiredReferenceCount",
  );
  assertNonNegativeNumber(
    referenceImport.requiredReferenceEntryCount,
    "visual.artifactCheck.referenceImport.requiredReferenceEntryCount",
  );
  assertRequiredReferenceStatusCounts(referenceImport);
}

function assertRequiredReferenceStatusCounts(referenceImport) {
  const counts = referenceImport.requiredReferenceStatusCounts;

  if (!isPlainRecord(counts)) {
    throw new Error(
      "Release check artifact visual.artifactCheck.referenceImport.requiredReferenceStatusCounts must be an object.",
    );
  }

  for (const field of [
    "invalid",
    "missing",
    "ready",
    "updated",
    "wouldUpdate",
  ]) {
    assertNonNegativeNumber(
      counts[field],
      `visual.artifactCheck.referenceImport.requiredReferenceStatusCounts.${field}`,
    );
  }

  if (
    sumRequiredReferenceStatusCounts(counts) !==
    referenceImport.requiredReferenceEntryCount
  ) {
    throw new Error(
      "Release check artifact visual.artifactCheck.referenceImport.requiredReferenceStatusCounts must match requiredReferenceEntryCount.",
    );
  }
}

function sumRequiredReferenceStatusCounts(counts) {
  return (
    counts.invalid +
    counts.missing +
    counts.ready +
    counts.updated +
    counts.wouldUpdate
  );
}

function assertOptionalMissingReferences(referenceImport) {
  assertOptionalStringList(
    referenceImport.missingReferences,
    "visual.artifactCheck.referenceImport.missingReferences",
  );
  if (referenceImport.missingReferences === undefined) {
    return;
  }

  assertCountDoesNotExceed(
    referenceImport.missingReferences.length,
    referenceImport.missingCount,
    "visual.artifactCheck.referenceImport.missingReferences.length",
    "missingCount",
  );
}

function assertOptionalCountDoesNotExceed(value, max, label, maxLabel) {
  if (value !== undefined && max !== undefined) {
    assertCountDoesNotExceed(value, max, label, maxLabel);
  }
}

export function hasInvalidVisualArtifactCheck(check) {
  return Boolean(
    check &&
      (check.status !== "complete" ||
        (check.issueCount ?? 0) > 0 ||
        hasItems(check.issues)),
  );
}

function assertVisualArtifactIssueCountConsistency(check) {
  const issues = Array.isArray(check.issues) ? check.issues : [];

  if (check.issueCount !== undefined && check.issueCount < issues.length) {
    throw new Error(
      "Release check artifact visual.artifactCheck.issueCount must cover serialized issues.",
    );
  }

  if (check.status === "complete" && (check.issueCount ?? 0) > 0) {
    throw new Error(
      "Release check artifact complete visual.artifactCheck must have no issues.",
    );
  }
}

function assertOptionalVisualIssues(issues) {
  if (issues === undefined) {
    return;
  }

  if (!Array.isArray(issues)) {
    throw new Error(
      "Release check artifact visual.artifactCheck.issues must be an array.",
    );
  }

  for (const issue of issues) {
    if (!isPlainRecord(issue)) {
      throw new Error(
        "Release check artifact visual.artifactCheck.issues must contain objects.",
      );
    }

    assertString(issue.code, "visual.artifactCheck.issues.code");
    assertNullableString(
      issue.component,
      "visual.artifactCheck.issues.component",
    );
    assertString(issue.message, "visual.artifactCheck.issues.message");
    assertEnum(
      issue.severity,
      releaseArtifactIssueSeverities,
      "visual.artifactCheck.issues.severity",
    );
    assertNullableString(
      issue.viewport,
      "visual.artifactCheck.issues.viewport",
    );
  }
}
