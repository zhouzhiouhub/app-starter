import {
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
import { assertOptionalVisualArtifactCheck } from "./release-notes-visual-artifact-validation.mjs";

const releaseArtifactVisualStatuses = new Set([
  "accepted",
  "invalid",
  "needs-evidence",
]);
const releaseArtifactIssueSeverities = new Set(["error", "warning"]);

export function assertVisualArtifact(visual) {
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
  assertOptionalVisualArtifactCheck(visual.artifactCheck);
  assertOptionalVisualIssues(visual.issues);
  assertVisualIssueCountConsistency(visual);
  assertAcceptedVisualConsistency(visual);
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
