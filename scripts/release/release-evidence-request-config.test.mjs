import assert from "node:assert/strict";
import test from "node:test";
import {
  readReleaseEvidenceRequestCliConfig,
} from "./release-evidence-request.mjs";
import {
  createReleaseEvidenceRequestCommand,
  normalizeReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-config.mjs";

test("release evidence request config validates paths and inputs", () => {
  const config = readReleaseEvidenceRequestCliConfig([
    "--",
    "--output",
    String.raw`artifacts\\release\\release-evidence-request.md`,
    "--requests-manifest-output",
    String.raw`tmp\\release-requests-manifest.json`,
    "--project-status-output",
    String.raw`tmp\\project-status.json`,
    "--project-status-markdown",
    String.raw`tmp\\project-status.md`,
    "--visual-source-dir",
    "docs/visual/page-builder-references",
    "--visual-artifact-dir",
    "reports/visual/page-builder-fixture",
    "--visual-output",
    String.raw`tmp\\visual.md`,
    "--visual-missing-output",
    String.raw`tmp\\missing.txt`,
    "--visual-table-output",
    String.raw`tmp\\reference-table.tsv`,
    "--visual-json-output",
    String.raw`tmp\\reference-manifest.json`,
    "--visual-handoff-output",
    String.raw`tmp\\visual-handoff`,
    "--smoke-output",
    String.raw`tmp\\smoke.md`,
    "--smoke-inputs-output",
    String.raw`tmp\\smoke-inputs.txt`,
    "--smoke-inputs-table-output",
    String.raw`tmp\\smoke-inputs.tsv`,
    "--smoke-inputs-json-output",
    String.raw`tmp\\smoke-inputs.json`,
    "--visual-artifact-run-id=33400968157",
  ]);

  assert.equal(config.outputPath, "artifacts/release/release-evidence-request.md");
  assert.equal(config.visualSourceDir, "docs/visual/page-builder-references");
  assert.equal(
    config.visualManifestPath,
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  );
  assert.equal(
    config.releaseCheckConfig.visualArtifactDir,
    "reports/visual/page-builder-fixture",
  );
  assert.equal(
    config.smokeDispatchConfig.inputOverrides.get("visual_artifact_run_id"),
    "33400968157",
  );
  assert.deepEqual(config.requestOutputPaths, {
    productionSmoke: "tmp/smoke.md",
    productionSmokeInputs: "tmp/smoke-inputs.txt",
    productionSmokeInputsManifest: "tmp/smoke-inputs.json",
    productionSmokeInputsTable: "tmp/smoke-inputs.tsv",
    projectStatus: "tmp/project-status.json",
    projectStatusMarkdown: "tmp/project-status.md",
    releaseEvidence: "artifacts/release/release-evidence-request.md",
    releaseRequestsManifest: "tmp/release-requests-manifest.json",
    visualMissingReferences: "tmp/missing.txt",
    visualReference: "tmp/visual.md",
    visualReferenceHandoff: "tmp/visual-handoff",
    visualReferenceManifest: "tmp/reference-manifest.json",
    visualReferenceTable: "tmp/reference-table.tsv",
  });
  assert.equal(config.smokeInputsOutputPath, "tmp/smoke-inputs.txt");
  assert.equal(config.smokeInputsTableOutputPath, "tmp/smoke-inputs.tsv");
  assert.equal(config.smokeInputsJsonOutputPath, "tmp/smoke-inputs.json");
  assert.equal(
    createReleaseEvidenceRequestCommand(),
    "pnpm release:evidence-request",
  );
  assert.equal(
    createReleaseEvidenceRequestCommand(config.requestOutputPaths),
    "pnpm release:evidence-request -- --output artifacts/release/release-evidence-request.md --requests-manifest-output tmp/release-requests-manifest.json --project-status-output tmp/project-status.json --project-status-markdown tmp/project-status.md --visual-output tmp/visual.md --visual-missing-output tmp/missing.txt --visual-table-output tmp/reference-table.tsv --visual-json-output tmp/reference-manifest.json --visual-handoff-output tmp/visual-handoff --smoke-output tmp/smoke.md --smoke-inputs-output tmp/smoke-inputs.txt --smoke-inputs-table-output tmp/smoke-inputs.tsv --smoke-inputs-json-output tmp/smoke-inputs.json",
  );
  assert.equal(
    normalizeReleaseEvidenceRequestOutputPath("tmp/release-request.MD"),
    "tmp/release-request.MD",
  );
  assert.throws(
    () => normalizeReleaseEvidenceRequestOutputPath("README.md"),
    /Release evidence request must (use safe path segments under|be under) docs\/releases, artifacts\/release, reports\/release, tmp\/, or \.tmp\//,
  );
});
