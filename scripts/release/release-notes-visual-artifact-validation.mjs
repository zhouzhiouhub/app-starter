import {
  assertCountDoesNotExceed,
  assertEnum,
  assertNonNegativeNumber,
  assertNullableString,
  assertOptionalNonNegativeNumber,
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
    check.issueCount,
    "visual.artifactCheck.issueCount",
  );
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
  assertOptionalVisualIssues(check.issues);
  assertVisualArtifactIssueCountConsistency(check);
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
