import {
  assertCountNotGreater,
  assertNonNegativeNumber,
  assertNullableString,
  assertOptionalNonNegativeNumber,
  assertString,
  isRecord,
} from "./project-status-validation-primitives.mjs";

export function assertVisualGate(visual) {
  if (!isRecord(visual)) {
    throw new Error(
      "Project status artifact releaseGate.visual must be an object.",
    );
  }

  assertString(visual.status, "releaseGate.visual.status");
  assertNullableString(
    visual.artifactStatus,
    "releaseGate.visual.artifactStatus",
  );
  assertNullableVisualArtifactCheck(visual);

  for (const field of [
    "acceptedComponentCount",
    "acceptedViewportCount",
    "componentCount",
    "pendingComponentCount",
    "pendingTaskCount",
    "pendingViewportCount",
    "viewportCount",
  ]) {
    assertNonNegativeNumber(visual[field], `releaseGate.visual.${field}`);
  }

  assertCountNotGreater(
    visual.acceptedComponentCount,
    visual.componentCount,
    "releaseGate.visual.acceptedComponentCount",
    "componentCount",
  );
  assertCountNotGreater(
    visual.acceptedViewportCount,
    visual.viewportCount,
    "releaseGate.visual.acceptedViewportCount",
    "viewportCount",
  );
  assertCountNotGreater(
    visual.pendingComponentCount,
    visual.componentCount,
    "releaseGate.visual.pendingComponentCount",
    "componentCount",
  );
  assertCountNotGreater(
    visual.pendingViewportCount,
    visual.viewportCount,
    "releaseGate.visual.pendingViewportCount",
    "viewportCount",
  );
}

function assertNullableVisualArtifactCheck(visual) {
  const check = visual.artifactCheck;

  if (check === null || check === undefined) {
    return;
  }

  if (!isRecord(check)) {
    throw new Error(
      "Project status artifact releaseGate.visual.artifactCheck must be an object or null.",
    );
  }

  assertNullableString(
    check.artifactDir,
    "releaseGate.visual.artifactCheck.artifactDir",
  );
  assertString(check.status, "releaseGate.visual.artifactCheck.status");
  assertOptionalNonNegativeNumber(
    check.issueCount,
    "releaseGate.visual.artifactCheck.issueCount",
  );

  for (const field of [
    "expectedScreenshotCount",
    "presentRequiredFileCount",
    "presentScreenshotCount",
    "requiredFileCount",
  ]) {
    assertNonNegativeNumber(
      check[field],
      `releaseGate.visual.artifactCheck.${field}`,
    );
  }
  assertOptionalNonNegativeNumber(
    check.presentDesignReferenceCount,
    "releaseGate.visual.artifactCheck.presentDesignReferenceCount",
  );
  assertOptionalNonNegativeNumber(
    check.referencedDesignReferenceCount,
    "releaseGate.visual.artifactCheck.referencedDesignReferenceCount",
  );

  if (
    visual.artifactStatus !== null &&
    visual.artifactStatus !== undefined &&
    visual.artifactStatus !== check.status
  ) {
    throw new Error(
      "Project status artifact releaseGate.visual.artifactCheck.status must match artifactStatus.",
    );
  }

  assertCountNotGreater(
    check.presentRequiredFileCount,
    check.requiredFileCount,
    "releaseGate.visual.artifactCheck.presentRequiredFileCount",
    "requiredFileCount",
  );
  assertCountNotGreater(
    check.presentScreenshotCount,
    check.expectedScreenshotCount,
    "releaseGate.visual.artifactCheck.presentScreenshotCount",
    "expectedScreenshotCount",
  );
  if (
    check.presentDesignReferenceCount !== undefined &&
    check.referencedDesignReferenceCount !== undefined
  ) {
    assertCountNotGreater(
      check.presentDesignReferenceCount,
      check.referencedDesignReferenceCount,
      "releaseGate.visual.artifactCheck.presentDesignReferenceCount",
      "referencedDesignReferenceCount",
    );
  }
  if (check.status === "complete" && (check.issueCount ?? 0) > 0) {
    throw new Error(
      "Project status artifact complete releaseGate.visual.artifactCheck must have no issues.",
    );
  }
}
