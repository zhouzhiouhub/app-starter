import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseEvidenceCheck,
  formatReleaseEvidenceCheck,
} from "./release-check.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
} from "./release-check-test-fixtures.mjs";

test("release check report prints release notes handoff steps when ready", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const lines = formatReleaseEvidenceCheck(
    createReleaseEvidenceCheck({
      smokeArtifact: {
        path: "artifacts/production-smoke/smoke-report.json",
        report: createCompleteReleaseReport(),
      },
      visualEvidenceRoot: evidenceRoot,
      visualManifest: manifest,
      visualManifestPath: "reports/visual/accepted.json",
    }),
  ).join("\n");

  assert.match(lines, /Evidence is ready for release notes\./);
  assert.match(lines, /Release notes handoff:/);
  assert.match(lines, /Command: pnpm release:notes -- --release-tag <tag>/);
  assert.match(
    lines,
    /Evidence args: --smoke-artifact production-smoke-report-<run_number>/,
  );
  assert.match(lines, /Review args: --storefront-url <url>/);
  assert.match(lines, /Keep artifact: release-notes-<run_number>/);
  assert.match(lines, /Formal mode: Run without --allow-blocked/);
});
