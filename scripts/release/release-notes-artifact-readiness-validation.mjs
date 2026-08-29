import {
  assertBoolean,
  assertNullableString,
  assertOptionalNonNegativeNumber,
  assertString,
  isPlainRecord,
} from "./release-notes-artifact-assertions.mjs";

export function assertOptionalReadinessChecklist(checklist) {
  if (checklist === undefined) {
    return;
  }

  if (!isPlainRecord(checklist)) {
    throw new Error(
      "Release check artifact readinessChecklist must be an object.",
    );
  }

  assertBoolean(
    checklist.releaseReady,
    "readinessChecklist.releaseReady",
  );
  assertOptionalNonNegativeNumber(
    checklist.itemCount,
    "readinessChecklist.itemCount",
  );

  if (!Array.isArray(checklist.items)) {
    throw new Error(
      "Release check artifact readinessChecklist.items must be an array.",
    );
  }

  if (
    checklist.itemCount !== undefined &&
    checklist.itemCount < checklist.items.length
  ) {
    throw new Error(
      "Release check artifact readinessChecklist.itemCount must cover serialized items.",
    );
  }

  for (const item of checklist.items) {
    assertReadinessChecklistItem(item);
  }
}

function assertReadinessChecklistItem(item) {
  if (!isPlainRecord(item)) {
    throw new Error(
      "Release check artifact readinessChecklist.items must contain objects.",
    );
  }

  assertNullableString(item.action, "readinessChecklist.items.action");
  assertNullableString(
    item.bundleCommand,
    "readinessChecklist.items.bundleCommand",
  );
  assertNullableString(item.detail, "readinessChecklist.items.detail");
  assertString(item.label, "readinessChecklist.items.label");
  assertString(item.status, "readinessChecklist.items.status");
  assertReadinessChecklistSteps(item.steps);
}

function assertReadinessChecklistSteps(steps) {
  if (steps === undefined) {
    return;
  }

  if (!Array.isArray(steps)) {
    throw new Error(
      "Release check artifact readinessChecklist.items.steps must be an array.",
    );
  }

  for (const step of steps) {
    if (!isPlainRecord(step)) {
      throw new Error(
        "Release check artifact readinessChecklist.items.steps must contain objects.",
      );
    }

    assertString(step.label, "readinessChecklist.items.steps.label");
    assertString(step.value, "readinessChecklist.items.steps.value");
  }
}
