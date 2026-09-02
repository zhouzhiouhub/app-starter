import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseRequestsCommand,
  createReleaseRequestsOutputSummary,
  runReleaseRequestsCli,
} from "./release-requests.mjs";
import {
  printReleaseRequestsManifestSummary,
} from "./release-requests-summary.mjs";

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
      releaseRequestsManifest: "tmp/release-requests-manifest.json",
      visualMissingReferences: "tmp/missing.txt",
      visualReference: "tmp/visual.md",
      visualReferenceHandoff: "tmp/visual-handoff",
      visualReferenceManifest: "tmp/reference-manifest.json",
      visualReferenceTable: "tmp/reference-table.tsv",
    }),
    "pnpm release:requests -- --release-output tmp/release.md --requests-manifest-output tmp/release-requests-manifest.json --visual-output tmp/visual.md --visual-missing-output tmp/missing.txt --visual-table-output tmp/reference-table.tsv --visual-json-output tmp/reference-manifest.json --visual-handoff-output tmp/visual-handoff --smoke-output tmp/smoke.md --smoke-inputs-output tmp/smoke-inputs.txt --smoke-inputs-table-output tmp/smoke-inputs.tsv --smoke-inputs-json-output tmp/smoke-inputs.json",
  );
  assert.equal(
    createReleaseRequestsOutputSummary(),
    "artifacts/release/release-evidence-request.md, artifacts/release/release-requests-manifest.json, artifacts/visual/page-builder-reference-request.md, artifacts/visual/page-builder-missing-references.txt, artifacts/visual/page-builder-reference-export-table.tsv, artifacts/visual/page-builder-reference-export-manifest.json, artifacts/visual/page-builder-reference-handoff, artifacts/visual/page-builder-reference-handoff/README.md, artifacts/production-smoke/production-smoke-request.md, artifacts/production-smoke/production-smoke-dispatch-inputs.txt, artifacts/production-smoke/production-smoke-dispatch-inputs.tsv, artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  );
  assert.equal(
    createReleaseRequestsOutputSummary({
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
    }),
    "tmp/release.md, tmp/release-requests-manifest.json, tmp/visual.md, tmp/missing.txt, tmp/reference-table.tsv, tmp/reference-manifest.json, tmp/visual-handoff, tmp/visual-handoff/README.md, tmp/smoke.md, tmp/smoke-inputs.txt, tmp/smoke-inputs.tsv, tmp/smoke-inputs.json",
  );
  assert.match(help, /refreshes all local evidence request files/);
  assert.match(help, /Custom output paths are also reflected/);
  assert.match(help, /--requests-manifest-output <path>/);
  assert.match(help, /--visual-missing-output <path>/);
  assert.match(help, /--visual-table-output <path>/);
  assert.match(help, /--visual-json-output <path>/);
  assert.match(help, /--visual-handoff-output <dir>/);
  assert.match(help, /--smoke-inputs-output <path>/);
  assert.match(help, /--smoke-inputs-table-output <path>/);
  assert.match(help, /--smoke-inputs-json-output <path>/);
  assert.match(help, /does not import\s+visual references, run\s+Production Smoke/);
});

test("release requests manifest summary prints project completion context", () => {
  const stdout = [];

  printReleaseRequestsManifestSummary(
    {
      projectCompletion: {
        completionChecklist: {
          completeCount: 1,
          itemCount: 3,
          needsEvidenceCount: 2,
        },
        nextActionCount: 15,
        nextActionPreview: [
          {
            area: "Production Smoke",
            firstStep: {
              label: "Smoke request",
              value: "pnpm smoke:request",
            },
            label: "Production smoke artifact missing",
          },
        ],
        nextActionPreviewCount: 3,
        releaseDecision: "not-ready",
        releaseEvidenceStatus: "needs-evidence",
        status: "needs-evidence",
      },
    },
    (line) => stdout.push(line),
  );

  assert.deepEqual(stdout, [
    "Project completion: needs-evidence (1/3 complete, 2 need evidence)",
    "Release decision: not-ready; release evidence: needs-evidence",
    "Next action preview: 3/15",
    "  - Production Smoke: Production smoke artifact missing",
    "    First step: Smoke request: pnpm smoke:request",
  ]);
});
