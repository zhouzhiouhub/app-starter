export function assertReleaseNotesProjectStatusConsistency(
  releaseArtifact,
  projectStatus,
) {
  assertMatches(
    projectStatus.releaseReady,
    releaseArtifact.releaseReady,
    "releaseReady",
  );
  assertMatches(
    projectStatus.status,
    releaseArtifact.releaseReady ? "release-ready" : "needs-evidence",
    "status",
  );
  assertMatches(
    projectStatus.releaseGate.blockerCount,
    releaseArtifact.blockerCount,
    "releaseGate.blockerCount",
  );
  assertSmokeGateMatches(releaseArtifact.smoke, projectStatus.releaseGate.smoke);
  assertVisualGateMatches(
    releaseArtifact.visual,
    projectStatus.releaseGate.visual,
  );
}

function assertSmokeGateMatches(releaseSmoke, projectSmoke) {
  assertMatches(projectSmoke.status, releaseSmoke.status, "releaseGate.smoke.status");
  assertMatches(projectSmoke.path, releaseSmoke.path ?? null, "releaseGate.smoke.path");
  assertMatches(
    projectSmoke.summaryStatus,
    releaseSmoke.summary.status,
    "releaseGate.smoke.summaryStatus",
  );
}

function assertVisualGateMatches(releaseVisual, projectVisual) {
  const expectedArtifactStatus = releaseVisual.artifactCheck?.status ?? null;

  assertMatches(projectVisual.status, releaseVisual.status, "releaseGate.visual.status");
  assertMatches(
    projectVisual.artifactStatus ?? null,
    expectedArtifactStatus,
    "releaseGate.visual.artifactStatus",
  );
  assertVisualArtifactCheckMatches(
    releaseVisual.artifactCheck,
    projectVisual.artifactCheck,
  );

  for (const field of [
    "acceptedComponentCount",
    "acceptedViewportCount",
    "componentCount",
    "viewportCount",
  ]) {
    assertMatches(
      projectVisual[field],
      releaseVisual[field],
      `releaseGate.visual.${field}`,
    );
  }

  assertMatches(
    projectVisual.pendingComponentCount,
    releaseVisual.pendingComponents.length,
    "releaseGate.visual.pendingComponentCount",
  );
  assertMatches(
    projectVisual.pendingViewportCount,
    readPendingViewportCount(releaseVisual),
    "releaseGate.visual.pendingViewportCount",
  );
  assertMatches(
    projectVisual.pendingTaskCount,
    releaseVisual.checklist?.pendingTaskCount ?? 0,
    "releaseGate.visual.pendingTaskCount",
  );
}

function assertVisualArtifactCheckMatches(releaseCheck, projectCheck) {
  if (!projectCheck) {
    return;
  }

  if (!releaseCheck) {
    throw new Error(
      "Release notes project status releaseGate.visual.artifactCheck must match release-evidence-check.v1.",
    );
  }

  for (const field of [
    "artifactDir",
    "expectedScreenshotCount",
    "presentRequiredFileCount",
    "presentScreenshotCount",
    "presentDesignReferenceCount",
    "referencedDesignReferenceCount",
    "requiredFileCount",
    "status",
  ]) {
    assertMatches(
      projectCheck[field],
      releaseCheck[field],
      `releaseGate.visual.artifactCheck.${field}`,
    );
  }
  assertOptionalArtifactIssueCountMatches(releaseCheck, projectCheck);
  assertOptionalReferenceImportMatches(releaseCheck, projectCheck);
}

function assertOptionalArtifactIssueCountMatches(releaseCheck, projectCheck) {
  if (projectCheck.issueCount === undefined) {
    return;
  }

  assertMatches(
    projectCheck.issueCount,
    releaseCheck.issueCount,
    "releaseGate.visual.artifactCheck.issueCount",
  );
}

function assertOptionalReferenceImportMatches(releaseCheck, projectCheck) {
  if (projectCheck.referenceImport === undefined) {
    return;
  }

  if (!releaseCheck.referenceImport) {
    throw new Error(
      "Release notes project status releaseGate.visual.artifactCheck.referenceImport must match release-evidence-check.v1.",
    );
  }

  for (const field of [
    "complete",
    "manifestPath",
    "missingCount",
    "requiredReferenceCount",
    "requiredReferenceEntryCount",
    "sourceDir",
    "sourceDirStatus",
    "status",
    "updated",
    "updateCount",
  ]) {
    assertMatches(
      projectCheck.referenceImport[field],
      releaseCheck.referenceImport[field],
      `releaseGate.visual.artifactCheck.referenceImport.${field}`,
    );
  }
  assertOptionalStringListMatches(
    projectCheck.referenceImport.missingReferences,
    releaseCheck.referenceImport.missingReferences,
    "releaseGate.visual.artifactCheck.referenceImport.missingReferences",
  );
  assertOptionalStatusCountsMatch(
    projectCheck.referenceImport.requiredReferenceStatusCounts,
    releaseCheck.referenceImport.requiredReferenceStatusCounts,
  );
}

function readPendingViewportCount(visual) {
  return visual.checklist?.pendingViewportCount ?? visual.pendingViewports.length;
}

function assertMatches(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Release notes project status ${label} must match release-evidence-check.v1.`,
    );
  }
}

function assertOptionalStringListMatches(actual, expected, label) {
  if (actual === undefined) {
    return;
  }

  if (!Array.isArray(actual) || !Array.isArray(expected)) {
    throw new Error(`Release notes project status ${label} must match release-evidence-check.v1.`);
  }

  assertMatches(actual.join("\n"), expected.join("\n"), label);
}

function assertOptionalStatusCountsMatch(actual, expected) {
  if (actual === undefined) {
    return;
  }

  if (!actual || !expected) {
    throw new Error(
      "Release notes project status releaseGate.visual.artifactCheck.referenceImport.requiredReferenceStatusCounts must match release-evidence-check.v1.",
    );
  }

  for (const field of [
    "invalid",
    "missing",
    "ready",
    "updated",
    "wouldUpdate",
  ]) {
    assertMatches(
      actual[field],
      expected[field],
      `releaseGate.visual.artifactCheck.referenceImport.requiredReferenceStatusCounts.${field}`,
    );
  }
}
