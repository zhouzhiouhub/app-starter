import assert from "node:assert/strict";

export function assertReleaseRequestsManifestHandoff(input) {
  const manifest = input.releaseRequestsManifest;

  assert.equal(manifest.schemaVersion, "release-requests-manifest.v1");
  assert.equal(manifest.status, "needs-evidence");
  assert.equal(manifest.releaseEvidence.ready, false);
  assert.equal(
    manifest.outputPaths.releaseRequestsManifest,
    input.releaseRequestsManifestOutput,
  );
  assert.equal(manifest.pageBuilderVisual.missingCount, 12);
  assert.equal(
    manifest.pageBuilderVisual.firstMissingReference,
    "docs/visual/page-builder-references/hero-banner-desktop.png",
  );
  assert.equal(
    manifest.pageBuilderVisual.referenceHandoffReadmePath,
    `${input.visualHandoffOutput}/README.md`,
  );
  assert.deepEqual(
    manifest.pageBuilderVisual.missingReferences,
    input.visualExportManifest.references
      .filter((reference) => reference.status === "missing")
      .map((reference) => reference.expectedPath),
  );
  assertProjectCompletionHandoff(manifest.projectCompletion);
  assertPageBuilderVisualCommands(manifest.pageBuilderVisual.commands, input);
  assertProductionSmokeHandoff(manifest.productionSmoke, input);
}

function assertProjectCompletionHandoff(projectCompletion) {
  assert.equal(projectCompletion.phase, "MVP release verification");
  assert.equal(projectCompletion.status, "needs-evidence");
  assert.equal(projectCompletion.releaseReady, false);
  assert.equal(projectCompletion.localMvpScope, "implemented");
  assert.equal(projectCompletion.releaseEvidenceStatus, "needs-evidence");
  assert.equal(projectCompletion.releaseDecision, "not-ready");
  assert.match(projectCompletion.summary, /release verification/);
  assert.equal(projectCompletion.completedMilestoneCount, 5);
  assert.equal(
    projectCompletion.completionChecklist.itemCount,
    projectCompletion.completionChecklist.items.length,
  );
  assert.equal(projectCompletion.completionChecklist.completeCount, 1);
  assert.equal(projectCompletion.completionChecklist.needsEvidenceCount, 2);
  assertCompletionChecklistItem(projectCompletion, {
    label: "Production Smoke release evidence",
    status: "needs-evidence",
  });
  assertCompletionChecklistItem(projectCompletion, {
    label: "Page Builder visual acceptance evidence",
    status: "needs-evidence",
  });
  assert.equal(
    readChecklistStep(projectCompletion, "Production Smoke release evidence")
      ?.label,
    "Smoke request",
  );
  assert.equal(
    readChecklistStep(projectCompletion, "Page Builder visual acceptance evidence")
      ?.label,
    "Reference source",
  );
  assert.equal(projectCompletion.nextActionCount, 15);
  assert.equal(projectCompletion.nextActionPreviewCount, 3);
  assert.equal(projectCompletion.nextActionPreview[0].area, "Production Smoke");
  assert.equal(
    projectCompletion.nextActionPreview[0].firstStep.label,
    "Smoke request",
  );
  assert.equal(projectCompletion.nextActionPreview[1].area, "Page Builder Visual");
  assert.equal(projectCompletion.nextActionPreview[2].area, "Release Evidence");
  assert.deepEqual(projectCompletion.projectStatusHandoff, {
    command:
      "pnpm project:status -- --all-actions --output tmp/project-status.json --markdown-output tmp/project-status-handoff.md",
    jsonPath: "tmp/project-status.json",
    markdownPath: "tmp/project-status-handoff.md",
    shortcut: "pnpm run verify:local",
  });
  assert.ok(
    projectCompletion.nextActionCount >= projectCompletion.nextActionPreviewCount,
  );
  assert.ok(projectCompletion.truncatedNextActionCount >= 0);
}

function assertCompletionChecklistItem(projectCompletion, expected) {
  const item = projectCompletion.completionChecklist.items.find(
    (candidate) => candidate.label === expected.label,
  );

  assert.ok(item, `Expected completion checklist item ${expected.label}`);
  assert.equal(item.status, expected.status);
  assert.ok(Array.isArray(item.nextSteps));
}

function readChecklistStep(projectCompletion, label) {
  const item = projectCompletion.completionChecklist.items.find(
    (candidate) => candidate.label === label,
  );

  return item?.nextSteps[0];
}

function assertPageBuilderVisualCommands(commands, input) {
  assert.equal(
    commands.missingPaths,
    `pnpm --silent visual:references -- --manifest ${input.visualManifestPath} --missing-paths`,
  );
  assert.equal(
    commands.request,
    `pnpm visual:references:request -- --manifest ${input.visualManifestPath} --output ${input.visualOutput} --missing-output ${input.visualMissingOutput} --table-output ${input.visualTableOutput} --json-output ${input.visualJsonOutput}`,
  );
  assert.equal(
    commands.handoff,
    `pnpm visual:references:handoff -- --manifest ${input.visualManifestPath} --output-dir ${input.visualHandoffOutput}`,
  );
  assert.equal(
    commands.importReferences,
    `pnpm visual:references -- --manifest ${input.visualManifestPath} --write --require-complete`,
  );
  assert.equal(
    commands.verifyAccepted,
    `pnpm visual:acceptance -- --require-accepted ${input.visualManifestPath}`,
  );
}

function assertProductionSmokeHandoff(productionSmoke, input) {
  assert.deepEqual(
    productionSmoke.dispatchManifestContext,
    input.smokeInputsManifest.dispatchManifestContext,
  );
  assert.equal(productionSmoke.workflowFile, "production-smoke.yml");
  assert.equal(productionSmoke.ref, "main");
  assert.equal(
    productionSmoke.validationCommand,
    `pnpm smoke:dispatch -- --inputs-json ${input.smokeInputsJsonOutput} --require-complete`,
  );
  assert.match(
    productionSmoke.dispatchCommand,
    /^gh workflow run production-smoke\.yml --ref main /,
  );
  assert.deepEqual(productionSmoke.inputs, input.smokeInputsManifest.inputs);
  assert.deepEqual(
    productionSmoke.inputSources,
    input.smokeInputsManifest.inputSources,
  );
  assert.deepEqual(
    productionSmoke.workflowInputs,
    input.smokeInputsManifest.workflowInputs,
  );
  assert.deepEqual(
    productionSmoke.requiredEvidence,
    input.smokeInputsManifest.requiredEvidence,
  );
  assert.deepEqual(productionSmoke.missingInputs, [
    "visual_artifact_name",
    "visual_artifact_run_id",
    "local_verification_run_url",
    "local_verification_artifact_name",
    "release_tag",
    "rollback_target",
    "storefront_url",
  ]);
}
