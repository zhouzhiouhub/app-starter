import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseEvidenceCheck,
  createReleaseEvidenceCheckArtifact,
  formatReleaseEvidenceCheck,
} from "./release-check.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
  createVisualArtifactCheck,
} from "./release-check-test-fixtures.mjs";
import { createMissingSmokeReportMarkdownCompanion } from "../smoke/smoke-report-markdown-companion.mjs";

test("release check blocks missing smoke Markdown companion evidence", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const path = "artifacts/production-smoke/smoke-report.json";
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      markdown: createMissingSmokeReportMarkdownCompanion(path),
      path,
      report: createCompleteReleaseReport(),
    },
    visualArtifact: createVisualArtifactCheck({ status: "complete" }),
    visualArtifactDir: "reports/visual/page-builder-fixture",
    visualEvidenceRoot: evidenceRoot,
    visualManifest: manifest,
    visualManifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  });
  const artifact = createReleaseEvidenceCheckArtifact(check, {
    generatedAt: "2026-08-30T00:00:00.000Z",
  });
  const lines = formatReleaseEvidenceCheck(check);

  assert.equal(check.releaseReady, false);
  assert.equal(check.visual.status, "accepted");
  assert.equal(artifact.smoke.markdown.status, "missing");
  assert.equal(
    check.blockers.some(
      (blocker) =>
        blocker.area === "Production Smoke" &&
        blocker.label === "Smoke report Markdown missing",
    ),
    true,
  );
  assert.equal(
    lines.some((line) =>
      line.includes(
        "Smoke Markdown: artifacts/production-smoke/smoke-report.md missing",
      ),
    ),
    true,
  );
});
