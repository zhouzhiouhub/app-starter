import {
  assertCountDoesNotExceed,
  assertEnum,
  assertNonNegativeNumber,
  assertNullableString,
  assertString,
  isPlainRecord,
} from "./release-notes-artifact-assertions.mjs";

const visualChecklistTaskStatuses = new Set([
  "accepted",
  "blocked",
  "missing",
  "needs-evidence",
]);

export function assertOptionalVisualChecklist(checklist) {
  if (checklist === undefined) {
    return;
  }

  if (!isPlainRecord(checklist)) {
    throw new Error("Release check artifact visual.checklist must be an object.");
  }

  assertNonNegativeNumber(
    checklist.pendingViewportCount,
    "visual.checklist.pendingViewportCount",
  );
  assertNonNegativeNumber(
    checklist.readyViewportCount,
    "visual.checklist.readyViewportCount",
  );
  assertNonNegativeNumber(checklist.viewportCount, "visual.checklist.viewportCount");
  assertNonNegativeNumber(
    checklist.pendingTaskCount,
    "visual.checklist.pendingTaskCount",
  );
  assertCountDoesNotExceed(
    checklist.readyViewportCount,
    checklist.viewportCount,
    "visual.checklist.readyViewportCount",
    "visual.checklist.viewportCount",
  );
  assertVisualChecklistTasks(checklist);
}

function assertVisualChecklistTasks(checklist) {
  if (!Array.isArray(checklist.pendingTasks)) {
    throw new Error(
      "Release check artifact visual.checklist.pendingTasks must be an array.",
    );
  }

  if (checklist.pendingTaskCount < checklist.pendingTasks.length) {
    throw new Error(
      "Release check artifact visual.checklist.pendingTaskCount must cover serialized pending tasks.",
    );
  }

  if (checklist.pendingViewportCount < checklist.pendingTasks.length) {
    throw new Error(
      "Release check artifact visual.checklist.pendingViewportCount must cover serialized pending tasks.",
    );
  }

  for (const task of checklist.pendingTasks) {
    assertVisualChecklistTask(task);
  }
}

function assertVisualChecklistTask(task) {
  if (!isPlainRecord(task)) {
    throw new Error(
      "Release check artifact visual.checklist.pendingTasks must contain objects.",
    );
  }

  assertString(task.component, "visual.checklist.pendingTasks.component");
  assertString(task.viewport, "visual.checklist.pendingTasks.viewport");
  assertEnum(
    task.status,
    visualChecklistTaskStatuses,
    "visual.checklist.pendingTasks.status",
  );
  assertNullableString(
    task.designReference,
    "visual.checklist.pendingTasks.designReference",
  );
  assertNullableString(
    task.previewScreenshot,
    "visual.checklist.pendingTasks.previewScreenshot",
  );
  assertString(
    task.expectedDesignReference,
    "visual.checklist.pendingTasks.expectedDesignReference",
  );
  assertString(
    task.expectedPreviewScreenshot,
    "visual.checklist.pendingTasks.expectedPreviewScreenshot",
  );
  assertNonNegativeNumber(
    task.missingCount,
    "visual.checklist.pendingTasks.missingCount",
  );
  assertVisualChecklistMissingTasks(task);
  assertVisualChecklistCommands(task.commands);
}

function assertVisualChecklistMissingTasks(task) {
  if (!Array.isArray(task.missing)) {
    throw new Error(
      "Release check artifact visual.checklist.pendingTasks.missing must be an array.",
    );
  }

  if (task.missingCount < task.missing.length) {
    throw new Error(
      "Release check artifact visual.checklist.pendingTasks.missingCount must cover serialized missing tasks.",
    );
  }

  for (const item of task.missing) {
    assertString(item, "visual.checklist.pendingTasks.missing");
  }
}

function assertVisualChecklistCommands(commands) {
  if (!isPlainRecord(commands)) {
    throw new Error(
      "Release check artifact visual.checklist.pendingTasks.commands must be an object.",
    );
  }

  assertString(commands.capture, "visual.checklist.pendingTasks.commands.capture");
  assertString(
    commands.importReference,
    "visual.checklist.pendingTasks.commands.importReference",
  );
  assertString(commands.measure, "visual.checklist.pendingTasks.commands.measure");
  if (commands.acceptPassing !== undefined) {
    assertString(
      commands.acceptPassing,
      "visual.checklist.pendingTasks.commands.acceptPassing",
    );
  }
  if (commands.referenceReport !== undefined) {
    assertString(
      commands.referenceReport,
      "visual.checklist.pendingTasks.commands.referenceReport",
    );
  }
  assertString(commands.verify, "visual.checklist.pendingTasks.commands.verify");
}
