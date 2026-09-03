import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseEvidenceCheck,
  formatReleaseEvidenceCheck,
} from "./release-check.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
  createPendingVisualManifest,
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
  assert.match(lines, /--local-verification-run-url <main-ci-run-url>/);
  assert.match(
    lines,
    /--local-verification-artifact local-verification-<run_number>/,
  );
  assert.match(lines, /Local verification args:/);
  assert.match(lines, /Project and visual args:/);
  assert.match(lines, /Review args: --storefront-url <url>/);
  assert.match(lines, /Keep artifact: release-notes-<run_number>/);
  assert.match(lines, /Formal mode: Run without --allow-blocked/);
});

test("release check report points blocked users to full handoff commands", () => {
  const manifest = createPendingVisualManifest();
  manifest.records[0].viewports.desktop.visualMatchPercent = 0.15;
  manifest.records[0].viewports.desktop.maxColorDeltaE = 149.09;
  const lines = formatReleaseEvidenceCheck(
    createReleaseEvidenceCheck({
      smokeError: new Error("No smoke reports found."),
      visualManifest: manifest,
    }),
  ).join("\n");

  assert.match(lines, /Status: blocked/);
  assert.match(
    lines,
    /Visual measurements: 1 measured viewports failing, 2 failed metrics, first failed hero-banner\.desktop: visualMatchPercent >= 95 \(current 0\.15\); maxColorDeltaE <= 3 \(current 149\.09\)/,
  );
  assert.match(lines, /Blockers:/);
  assert.match(lines, /Next:/);
  assert.match(lines, /Full checklist: pnpm release:check -- --checklist/);
  assert.match(
    lines,
    /All visual tasks: pnpm release:check -- --checklist --all-visual-tasks/,
  );
  assert.match(
    lines,
    /Markdown handoff: pnpm release:check -- --markdown-output artifacts\/release\/release-check\.md/,
  );
});
