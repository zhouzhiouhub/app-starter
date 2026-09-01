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
  assert.deepEqual(
    manifest.pageBuilderVisual.missingReferences,
    input.visualExportManifest.references
      .filter((reference) => reference.status === "missing")
      .map((reference) => reference.expectedPath),
  );
  assertPageBuilderVisualCommands(manifest.pageBuilderVisual.commands, input);
  assertProductionSmokeHandoff(manifest.productionSmoke, input);
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
