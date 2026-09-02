import {
  assertBoolean,
  assertEnum,
  assertNonNegativeNumber,
  assertNullableString,
  assertRecord,
  assertString,
  fail,
} from "./release-requests-manifest-validation-primitives.mjs";

const checklistStatuses = new Set(["complete", "needs-evidence"]);
const projectStatuses = new Set(["needs-evidence", "release-ready"]);
const releaseDecisions = new Set(["not-ready", "ready-to-release"]);
const releaseEvidenceStatuses = new Set(["needs-evidence", "ready"]);

export function assertProjectCompletion(project) {
  assertRecord(project, "projectCompletion");
  assertNonNegativeNumber(
    project.completedMilestoneCount,
    "projectCompletion.completedMilestoneCount",
  );
  assertCompletionChecklist(project.completionChecklist);
  assertString(project.localMvpScope, "projectCompletion.localMvpScope");
  assertNonNegativeNumber(
    project.nextActionCount,
    "projectCompletion.nextActionCount",
  );
  assertNextActionPreview(project);
  assertString(project.phase, "projectCompletion.phase");
  assertEnum(
    project.releaseDecision,
    releaseDecisions,
    "projectCompletion.releaseDecision",
  );
  assertEnum(
    project.releaseEvidenceStatus,
    releaseEvidenceStatuses,
    "projectCompletion.releaseEvidenceStatus",
  );
  assertBoolean(project.releaseReady, "projectCompletion.releaseReady");
  assertEnum(project.status, projectStatuses, "projectCompletion.status");
  assertString(project.summary, "projectCompletion.summary");
  assertNonNegativeNumber(
    project.truncatedNextActionCount,
    "projectCompletion.truncatedNextActionCount",
  );

  if (project.nextActionCount < project.nextActionPreview.length) {
    fail(
      "projectCompletion.nextActionCount",
      "must cover nextActionPreview length",
    );
  }
}

function assertCompletionChecklist(checklist) {
  assertRecord(checklist, "projectCompletion.completionChecklist");
  assertNonNegativeNumber(
    checklist.completeCount,
    "projectCompletion.completionChecklist.completeCount",
  );
  assertNonNegativeNumber(
    checklist.itemCount,
    "projectCompletion.completionChecklist.itemCount",
  );
  assertNonNegativeNumber(
    checklist.needsEvidenceCount,
    "projectCompletion.completionChecklist.needsEvidenceCount",
  );

  if (!Array.isArray(checklist.items)) {
    fail("projectCompletion.completionChecklist.items", "must be an array");
  }

  if (checklist.itemCount !== checklist.items.length) {
    fail(
      "projectCompletion.completionChecklist.itemCount",
      "must match items length",
    );
  }

  const completeCount = countItemsWithStatus(checklist.items, "complete");
  const needsEvidenceCount = countItemsWithStatus(
    checklist.items,
    "needs-evidence",
  );

  if (checklist.completeCount !== completeCount) {
    fail(
      "projectCompletion.completionChecklist.completeCount",
      "must match complete items",
    );
  }

  if (checklist.needsEvidenceCount !== needsEvidenceCount) {
    fail(
      "projectCompletion.completionChecklist.needsEvidenceCount",
      "must match needs-evidence items",
    );
  }
}

function countItemsWithStatus(items, status) {
  return items.filter((item) => {
    assertRecord(item, "projectCompletion.completionChecklist.items");
    assertString(
      item.evidence,
      "projectCompletion.completionChecklist.items.evidence",
    );
    assertString(item.label, "projectCompletion.completionChecklist.items.label");
    assertNullableString(
      item.nextAction,
      "projectCompletion.completionChecklist.items.nextAction",
    );
    assertEnum(
      item.status,
      checklistStatuses,
      "projectCompletion.completionChecklist.items.status",
    );

    return item.status === status;
  }).length;
}

function assertNextActionPreview(project) {
  if (!Array.isArray(project.nextActionPreview)) {
    fail("projectCompletion.nextActionPreview", "must be an array");
  }

  assertNonNegativeNumber(
    project.nextActionPreviewCount,
    "projectCompletion.nextActionPreviewCount",
  );

  if (project.nextActionPreviewCount !== project.nextActionPreview.length) {
    fail(
      "projectCompletion.nextActionPreviewCount",
      "must match nextActionPreview length",
    );
  }

  for (const action of project.nextActionPreview) {
    assertRecord(action, "projectCompletion.nextActionPreview");
    assertString(action.action, "projectCompletion.nextActionPreview.action");
    assertString(action.area, "projectCompletion.nextActionPreview.area");
    assertString(action.label, "projectCompletion.nextActionPreview.label");
    assertNonNegativeNumber(
      action.stepCount,
      "projectCompletion.nextActionPreview.stepCount",
    );
    assertNullableNextActionStep(action.firstStep);
  }
}

function assertNullableNextActionStep(step) {
  if (step === null) {
    return;
  }

  assertRecord(step, "projectCompletion.nextActionPreview.firstStep");
  assertString(step.label, "projectCompletion.nextActionPreview.firstStep.label");
  assertString(step.value, "projectCompletion.nextActionPreview.firstStep.value");
}
