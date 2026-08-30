import {
  assertEnum,
  assertNonNegativeNumber,
  assertNullableString,
  assertString,
  isRecord,
} from "./project-status-validation-primitives.mjs";

const completionChecklistStatuses = new Set(["complete", "needs-evidence"]);

export function assertCompletionChecklist(checklist, releaseReady) {
  if (checklist === undefined) {
    return;
  }

  if (!isRecord(checklist)) {
    throw new Error(
      "Project status artifact completionChecklist must be an object.",
    );
  }

  assertNonNegativeNumber(checklist.itemCount, "completionChecklist.itemCount");
  assertNonNegativeNumber(
    checklist.completeCount,
    "completionChecklist.completeCount",
  );
  assertNonNegativeNumber(
    checklist.needsEvidenceCount,
    "completionChecklist.needsEvidenceCount",
  );

  if (!Array.isArray(checklist.items)) {
    throw new Error(
      "Project status artifact completionChecklist.items must be an array.",
    );
  }

  if (checklist.itemCount !== checklist.items.length) {
    throw new Error(
      "Project status artifact completionChecklist.itemCount must match items length.",
    );
  }

  for (const item of checklist.items) {
    assertCompletionChecklistItem(item);
  }

  assertCompletionChecklistCounts(checklist);
  assertCompletionChecklistReleaseReady(checklist, releaseReady);
}

function assertCompletionChecklistItem(item) {
  if (!isRecord(item)) {
    throw new Error(
      "Project status artifact completionChecklist.items must contain objects.",
    );
  }

  assertString(item.evidence, "completionChecklist.items.evidence");
  assertString(item.label, "completionChecklist.items.label");
  assertNullableString(item.nextAction, "completionChecklist.items.nextAction");
  assertEnum(
    item.status,
    completionChecklistStatuses,
    "completionChecklist.items.status",
  );
}

function assertCompletionChecklistCounts(checklist) {
  const completeCount = countCompletionChecklistStatus(checklist, "complete");
  const needsEvidenceCount = countCompletionChecklistStatus(
    checklist,
    "needs-evidence",
  );

  if (checklist.completeCount !== completeCount) {
    throw new Error(
      "Project status artifact completionChecklist.completeCount must match complete items.",
    );
  }

  if (checklist.needsEvidenceCount !== needsEvidenceCount) {
    throw new Error(
      "Project status artifact completionChecklist.needsEvidenceCount must match needs-evidence items.",
    );
  }
}

function assertCompletionChecklistReleaseReady(checklist, releaseReady) {
  if (releaseReady && checklist.needsEvidenceCount !== 0) {
    throw new Error(
      "Project status artifact release-ready completionChecklist must have zero needs-evidence items.",
    );
  }
}

function countCompletionChecklistStatus(checklist, status) {
  return checklist.items.filter((item) => item.status === status).length;
}
