import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseRequestsCommand,
  createReleaseRequestsOutputSummary,
  runReleaseRequestsCli,
} from "./release-requests.mjs";

test("release requests help and summary expose the bundle command", async () => {
  const stdout = [];

  const exitCode = await runReleaseRequestsCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });
  const help = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.equal(createReleaseRequestsCommand(), "pnpm release:requests");
  assert.equal(
    createReleaseRequestsCommand({
      productionSmoke: "tmp/smoke.md",
      productionSmokeInputs: "tmp/smoke-inputs.txt",
      productionSmokeInputsManifest: "tmp/smoke-inputs.json",
      productionSmokeInputsTable: "tmp/smoke-inputs.tsv",
      releaseEvidence: "tmp/release.md",
      visualMissingReferences: "tmp/missing.txt",
      visualReference: "tmp/visual.md",
      visualReferenceHandoff: "tmp/visual-handoff",
      visualReferenceManifest: "tmp/reference-manifest.json",
      visualReferenceTable: "tmp/reference-table.tsv",
    }),
    "pnpm release:requests -- --release-output tmp/release.md --visual-output tmp/visual.md --visual-missing-output tmp/missing.txt --visual-table-output tmp/reference-table.tsv --visual-json-output tmp/reference-manifest.json --visual-handoff-output tmp/visual-handoff --smoke-output tmp/smoke.md --smoke-inputs-output tmp/smoke-inputs.txt --smoke-inputs-table-output tmp/smoke-inputs.tsv --smoke-inputs-json-output tmp/smoke-inputs.json",
  );
  assert.equal(
    createReleaseRequestsOutputSummary(),
    "artifacts/release/release-evidence-request.md, artifacts/visual/page-builder-reference-request.md, artifacts/visual/page-builder-missing-references.txt, artifacts/visual/page-builder-reference-export-table.tsv, artifacts/visual/page-builder-reference-export-manifest.json, artifacts/visual/page-builder-reference-handoff, artifacts/production-smoke/production-smoke-request.md, artifacts/production-smoke/production-smoke-dispatch-inputs.txt, artifacts/production-smoke/production-smoke-dispatch-inputs.tsv, artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  );
  assert.equal(
    createReleaseRequestsOutputSummary({
      productionSmoke: "tmp/smoke.md",
      productionSmokeInputs: "tmp/smoke-inputs.txt",
      productionSmokeInputsManifest: "tmp/smoke-inputs.json",
      productionSmokeInputsTable: "tmp/smoke-inputs.tsv",
      releaseEvidence: "tmp/release.md",
      visualMissingReferences: "tmp/missing.txt",
      visualReference: "tmp/visual.md",
      visualReferenceHandoff: "tmp/visual-handoff",
      visualReferenceManifest: "tmp/reference-manifest.json",
      visualReferenceTable: "tmp/reference-table.tsv",
    }),
    "tmp/release.md, tmp/visual.md, tmp/missing.txt, tmp/reference-table.tsv, tmp/reference-manifest.json, tmp/visual-handoff, tmp/smoke.md, tmp/smoke-inputs.txt, tmp/smoke-inputs.tsv, tmp/smoke-inputs.json",
  );
  assert.match(help, /refreshes all local evidence request files/);
  assert.match(help, /Custom output paths are also reflected/);
  assert.match(help, /--visual-missing-output <path>/);
  assert.match(help, /--visual-table-output <path>/);
  assert.match(help, /--visual-json-output <path>/);
  assert.match(help, /--visual-handoff-output <dir>/);
  assert.match(help, /--smoke-inputs-output <path>/);
  assert.match(help, /--smoke-inputs-table-output <path>/);
  assert.match(help, /--smoke-inputs-json-output <path>/);
  assert.match(help, /does not import\s+visual references, run\s+Production Smoke/);
});
