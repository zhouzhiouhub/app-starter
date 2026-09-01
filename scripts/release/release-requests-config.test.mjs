import assert from "node:assert/strict";
import test from "node:test";
import { readReleaseRequestsCliConfig } from "./release-requests.mjs";

test("release requests config routes shared evidence inputs", () => {
  const config = readReleaseRequestsCliConfig([
    "--",
    "--release-output",
    "tmp/release.md",
    "--requests-manifest-output",
    "tmp/release-requests-manifest.json",
    "--visual-output=tmp/visual.md",
    "--visual-missing-output",
    "tmp/missing.txt",
    "--visual-table-output",
    "tmp/reference-table.tsv",
    "--visual-json-output",
    "tmp/reference-manifest.json",
    "--visual-handoff-output",
    "tmp/visual-handoff",
    "--smoke-output",
    "tmp/smoke.md",
    "--smoke-inputs-output",
    "tmp/smoke-inputs.txt",
    "--smoke-inputs-table-output",
    "tmp/smoke-inputs.tsv",
    "--smoke-inputs-json-output",
    "tmp/smoke-inputs.json",
    "--source-dir",
    "docs/visual/page-builder-references",
    "--visual-manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    "--smoke-report",
    "artifacts/production-smoke/smoke-report.json",
    "--visual-artifact-dir",
    "reports/visual/page-builder-fixture",
    "--visual-artifact",
    "page-builder-visual-fixture-123",
    "--visual-artifact-run-id",
    "123",
    "--local-verification-run-url",
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/122",
    "--local-verification-artifact",
    "local-verification-122",
    "--release-tag",
    "v0.1.0",
    "--rollback-target",
    "main@abcdef1",
    "--storefront-url",
    "https://store.brand.com",
  ]);

  assert.deepEqual(config.outputPaths, {
    productionSmoke: "tmp/smoke.md",
    productionSmokeInputs: "tmp/smoke-inputs.txt",
    productionSmokeInputsManifest: "tmp/smoke-inputs.json",
    productionSmokeInputsTable: "tmp/smoke-inputs.tsv",
    releaseEvidence: "tmp/release.md",
    releaseRequestsManifest: "tmp/release-requests-manifest.json",
    visualMissingReferences: "tmp/missing.txt",
    visualReference: "tmp/visual.md",
    visualReferenceHandoff: "tmp/visual-handoff",
    visualReferenceManifest: "tmp/reference-manifest.json",
    visualReferenceTable: "tmp/reference-table.tsv",
  });
  assert.deepEqual(config.visualReferenceArgs, [
    "--output",
    "tmp/visual.md",
    "--missing-output",
    "tmp/missing.txt",
    "--table-output",
    "tmp/reference-table.tsv",
    "--json-output",
    "tmp/reference-manifest.json",
    "--source-dir",
    "docs/visual/page-builder-references",
    "--manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  ]);
  assert.deepEqual(config.visualHandoffArgs, [
    "--output-dir",
    "tmp/visual-handoff",
    "--source-dir",
    "docs/visual/page-builder-references",
    "--manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  ]);
  assert.equal(readOptionValue(config.productionSmokeArgs, "--output"), "tmp/smoke.md");
  assert.equal(
    readOptionValue(config.productionSmokeArgs, "--inputs-output"),
    "tmp/smoke-inputs.txt",
  );
  assert.equal(
    readOptionValue(config.productionSmokeArgs, "--inputs-table-output"),
    "tmp/smoke-inputs.tsv",
  );
  assert.equal(
    readOptionValue(config.productionSmokeArgs, "--inputs-json-output"),
    "tmp/smoke-inputs.json",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--requests-manifest-output"),
    "tmp/release-requests-manifest.json",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-output"),
    "tmp/visual.md",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-missing-output"),
    "tmp/missing.txt",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-table-output"),
    "tmp/reference-table.tsv",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-json-output"),
    "tmp/reference-manifest.json",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-handoff-output"),
    "tmp/visual-handoff",
  );
  assert.equal(
    readOptionValue(config.visualReferenceArgs, "--table-output"),
    "tmp/reference-table.tsv",
  );
  assert.equal(
    readOptionValue(config.visualReferenceArgs, "--json-output"),
    "tmp/reference-manifest.json",
  );
  assert.equal(
    readOptionValue(config.visualHandoffArgs, "--output-dir"),
    "tmp/visual-handoff",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--smoke-output"),
    "tmp/smoke.md",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--smoke-inputs-output"),
    "tmp/smoke-inputs.txt",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--smoke-inputs-table-output"),
    "tmp/smoke-inputs.tsv",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--smoke-inputs-json-output"),
    "tmp/smoke-inputs.json",
  );
  assert.ok(config.releaseEvidenceArgs.includes("--smoke-report"));
  assert.ok(config.releaseEvidenceArgs.includes("--visual-artifact-dir"));
  assert.ok(config.releaseEvidenceArgs.includes("--visual-artifact"));
  assert.ok(config.productionSmokeArgs.includes("--visual-artifact"));
  assert.ok(!config.visualReferenceArgs.includes("--visual-artifact"));
  assert.equal(
    config.visualReferenceArgs.filter((arg) => arg === "--manifest").length,
    1,
  );

  const artifactDirConfig = readReleaseRequestsCliConfig([
    "--visual-artifact-dir",
    "reports/visual/page-builder-fixture",
    "--visual-manifest",
    "reports/visual/alternate/page-builder-visual-acceptance.json",
  ]);

  assert.deepEqual(artifactDirConfig.visualReferenceArgs, [
    "--missing-output",
    "artifacts/visual/page-builder-missing-references.txt",
    "--table-output",
    "artifacts/visual/page-builder-reference-export-table.tsv",
    "--json-output",
    "artifacts/visual/page-builder-reference-export-manifest.json",
    "--manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  ]);
  assert.deepEqual(artifactDirConfig.visualHandoffArgs, [
    "--output-dir",
    "artifacts/visual/page-builder-reference-handoff",
    "--manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  ]);
});

function readOptionValue(args, option) {
  const index = args.indexOf(option);

  return index === -1 ? null : args[index + 1];
}
