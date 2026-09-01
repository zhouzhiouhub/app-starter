import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseEvidenceCheck,
  createReleaseEvidenceCheckArtifact,
} from "./release-check.mjs";
import { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact-validation.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
  createPendingVisualManifest,
} from "./release-check-test-fixtures.mjs";

test("release check artifact carries structured missing smoke evidence", () => {
  const check = createReleaseEvidenceCheck({
    smokeError: new Error("No smoke reports found."),
    visualManifest: createPendingVisualManifest(),
  });
  const artifact = createReleaseEvidenceCheckArtifact(check, {
    generatedAt: "2026-08-31T00:00:00.000Z",
  });

  assertReleaseEvidenceCheckArtifact(artifact);
  assert.equal(artifact.smoke.status, "blocked");
  assert.equal(artifact.smoke.missingEvidence.status, "blocked");
  assert.equal(artifact.smoke.missingEvidence.summaryStatus, "missing");
  assert.equal(artifact.smoke.missingEvidence.requiredEvidenceCount, 15);
  assert.equal(artifact.smoke.missingEvidence.inputSourceCount, 7);
  assert.equal(artifact.smoke.missingEvidence.workflowInputCount, 14);
  assert.deepEqual(
    artifact.smoke.missingEvidence.requiredEvidence[0],
    {
      label: "Production smoke request",
      value: "pnpm smoke:request",
    },
  );
  assert.deepEqual(artifact.smoke.missingEvidence.requiredEvidence[1], {
    label: "Dispatch inputs output",
    value: "artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  });
  assert.deepEqual(artifact.smoke.missingEvidence.requiredEvidence[2], {
    label: "Dispatch inputs table output",
    value: "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv",
  });
  assert.deepEqual(artifact.smoke.missingEvidence.requiredEvidence[3], {
    label: "Dispatch inputs JSON output",
    value: "artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  });
  assert.match(
    artifact.smoke.missingEvidence.requiredEvidence[4].value,
    /^pnpm smoke:dispatch -- --require-complete /u,
  );
  assert.match(
    artifact.smoke.missingEvidence.requiredEvidence[5].value,
    /^gh workflow run production-smoke\.yml --ref main /u,
  );
  assert.deepEqual(artifact.smoke.missingEvidence.requiredEvidence[11], {
    label: "Smoke artifact",
    value: "production-smoke-report-<run_number>",
  });
  assert.deepEqual(artifact.smoke.missingEvidence.workflowInputs[0], {
    description: "safe JSON output path",
    name: "report_path",
    required: true,
    value: "artifacts/production-smoke/smoke-report.json",
  });
  assert.deepEqual(artifact.smoke.missingEvidence.inputSources[0], {
    name: "visual_artifact_name",
    source: "Page Builder Visual workflow artifact after visual evidence passes",
    value: "page-builder-visual-fixture-<run_number>",
  });
});

test("release check artifact omits missing smoke evidence when smoke is ready", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualEvidenceRoot: evidenceRoot,
    visualManifest: manifest,
    visualManifestPath: "reports/visual/accepted.json",
  });
  const artifact = createReleaseEvidenceCheckArtifact(check);

  assertReleaseEvidenceCheckArtifact(artifact);
  assert.equal(artifact.smoke.status, "ready");
  assert.equal(artifact.smoke.missingEvidence, undefined);
});

test("release check artifact validates missing smoke evidence counts", () => {
  const check = createReleaseEvidenceCheck({
    smokeError: new Error("No smoke reports found."),
    visualManifest: createPendingVisualManifest(),
  });
  const artifact = createReleaseEvidenceCheckArtifact(check);

  artifact.smoke.missingEvidence.requiredEvidenceCount = 0;

  assert.throws(
    () => assertReleaseEvidenceCheckArtifact(artifact),
    /requiredEvidenceCount must match requiredEvidence length/,
  );

  artifact.smoke.missingEvidence.requiredEvidenceCount =
    artifact.smoke.missingEvidence.requiredEvidence.length;
  artifact.smoke.missingEvidence.inputSourceCount = 0;
  assert.throws(
    () => assertReleaseEvidenceCheckArtifact(artifact),
    /inputSourceCount must match inputSources length/,
  );
});
