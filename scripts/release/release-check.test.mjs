import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createReleaseEvidenceCheckArtifact,
  createReleaseEvidenceCheck,
  formatReleaseEvidenceCheck,
  readReleaseCheckCliConfig,
  readReleaseEvidenceCheck,
} from "./release-check.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
  createPendingVisualManifest,
  createVisualArtifactCheck,
} from "./release-check-test-fixtures.mjs";
import { mvpPageBuilderComponents } from "../visual/page-builder-visual-acceptance.mjs";

test("release check accepts complete smoke and visual evidence", () => {
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

  assert.equal(check.releaseReady, true);
  assert.equal(check.smoke.releaseReady, true);
  assert.equal(check.visual.status, "accepted");
  assert.equal(
    formatReleaseEvidenceCheck(check).includes(
      "  Evidence is ready for release notes.",
    ),
    true,
  );
});

test("release check accepts a complete visual artifact", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualArtifact: createVisualArtifactCheck({ status: "complete" }),
    visualArtifactDir: "reports/visual/page-builder-fixture",
    visualEvidenceRoot: evidenceRoot,
    visualManifest: manifest,
    visualManifestPath: "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  });

  assert.equal(check.releaseReady, true);
  assert.equal(check.visualArtifact.status, "complete");
  assert.equal(
    formatReleaseEvidenceCheck(check).some((line) =>
      line.includes(
        "Visual artifact: complete (reports/visual/page-builder-fixture, 0 issues, 6/6 files, 12/12 screenshots, references ready, 0 missing)",
      ),
    ),
    true,
  );
});

test("release check creates bounded JSON artifacts", () => {
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
  const artifact = createReleaseEvidenceCheckArtifact(check, {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(artifact.schemaVersion, "release-evidence-check.v1");
  assert.equal(artifact.generatedAt, "2026-08-28T00:00:00.000Z");
  assert.equal(artifact.status, "ready");
  assert.equal(artifact.releaseReady, true);
  assert.equal(
    artifact.smoke.path,
    "artifacts/production-smoke/smoke-report.json",
  );
  assert.equal(
    artifact.smoke.source.workflowRunUrl,
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
  );
  assert.deepEqual(
    artifact.smoke.traceability.map(
      (group) => `${group.label}:${group.status}`,
    ),
    ["R2/CDN:passed", "Admin static app:passed", "Publish flow:passed"],
  );
  assert.equal(artifact.visual.status, "accepted");
  assert.equal(artifact.visual.acceptedViewportCount, 12);
  assert.deepEqual(artifact.visual.issues, []);
  assert.deepEqual(artifact.visual.pendingComponents, []);
  assert.deepEqual(artifact.visual.pendingViewports, []);
  assert.equal(artifact.blockerCount, 0);
});

test("release check artifact records visual artifact completeness", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
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
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(artifact.visual.artifactCheck.status, "complete");
  assert.equal(artifact.visual.artifactCheck.artifactDir, "reports/visual/page-builder-fixture");
  assert.equal(artifact.visual.artifactCheck.presentRequiredFileCount, 6);
  assert.equal(artifact.visual.artifactCheck.presentScreenshotCount, 12);
  assert.equal(artifact.visual.artifactCheck.referenceImport.status, "ready");
  assert.equal(artifact.visual.artifactCheck.referenceImport.missingCount, 0);
  assert.deepEqual(artifact.visual.artifactCheck.issues, []);
});

test("release check blocks invalid visual artifacts", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualArtifact: createVisualArtifactCheck({ status: "invalid" }),
    visualArtifactDir: "reports/visual/page-builder-fixture",
    visualEvidenceRoot: evidenceRoot,
    visualManifest: manifest,
    visualManifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  });
  const artifact = createReleaseEvidenceCheckArtifact(check, {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(check.releaseReady, false);
  assert.equal(check.visual.status, "accepted");
  assert.equal(check.blockers.some((blocker) => blocker.area === "Page Builder Visual" && blocker.label === "Visual artifact invalid"), true);
  assert.equal(artifact.visual.artifactCheck.status, "invalid");
  assert.equal(artifact.visual.artifactCheck.issueCount, 1);
  assert.equal(artifact.visual.artifactCheck.referenceImport.status, "invalid");
  assert.equal(artifact.visual.artifactCheck.referenceImport.missingCount, 12);
  assert.equal(artifact.visual.artifactCheck.referenceImport.missingReferences[0], "docs/visual/page-builder-references/hero-banner-desktop.png");
  assert.match(formatReleaseEvidenceCheck(check).join("\n"), /first missing docs\/visual\/page-builder-references\/hero-banner-desktop\.png/);
  assert.equal(
    artifact.blockers.some(
      (blocker) => blocker.label === "Visual artifact invalid",
    ),
    true,
  );
});

test("release check artifact records visual evidence gaps", () => {
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualManifest: createPendingVisualManifest(),
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });
  const artifact = createReleaseEvidenceCheckArtifact(check, {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(artifact.status, "blocked");
  assert.equal(artifact.visual.issueCount, 6);
  assert.equal(artifact.visual.issues[0].code, "record_needs_evidence");
  assert.equal(artifact.visual.issues[0].component, "hero-banner");
  assert.deepEqual(artifact.visual.pendingComponents, mvpPageBuilderComponents);
  assert.equal(artifact.visual.pendingViewports.length, 12);
  assert.deepEqual(artifact.visual.pendingViewports.slice(0, 2), [
    "hero-banner.desktop",
    "hero-banner.mobile",
  ]);
  const pendingTask = artifact.visual.checklist.pendingTasks[0];
  assert.equal(
    artifact.visual.checklist.manifestPath,
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  );
  assert.equal(artifact.visual.checklist.pendingViewportCount, 12);
  assert.equal(artifact.visual.checklist.pendingTaskCount, 12);
  assert.equal(
    pendingTask.expectedDesignReference,
    "docs/visual/page-builder-references/hero-banner-desktop.png",
  );
  assert.equal(
    pendingTask.expectedPreviewScreenshot,
    "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png",
  );
  assert.deepEqual(pendingTask.missing, [
    "designReference",
    "previewScreenshot",
    "visualMatchPercent >= 95",
    "maxLayoutDeltaPx <= 5",
    "maxColorDeltaE <= 3",
    "status=accepted",
  ]);
  assert.match(
    pendingTask.commands.capture,
    /--manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder-fixture/,
  );
  assert.match(
    pendingTask.commands.referenceReport,
    /pnpm visual:references:check/,
  );
  assert.match(
    pendingTask.commands.acceptPassing,
    /--manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete/,
  );
});

test("release check blocks pending Page Builder visual evidence", () => {
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualManifest: createPendingVisualManifest(),
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });

  assert.equal(check.releaseReady, false);
  assert.equal(check.smoke.releaseReady, true);
  assert.equal(check.visual.status, "needs-evidence");
  assert.equal(
    check.blockers.some(
      (blocker) =>
        blocker.area === "Page Builder Visual" &&
        blocker.label === "Visual acceptance pending" &&
        blocker.action.includes("pnpm visual:artifact-bundle") &&
        blocker.action.includes("pnpm visual:acceptance -- --checklist"),
    ),
    true,
  );
});

test("release check keeps invalid status for weak accepted visual evidence", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  manifest.records[0].viewports.desktop.visualMatchPercent = 90;
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualEvidenceRoot: evidenceRoot,
    visualManifest: manifest,
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });

  assert.equal(check.releaseReady, false);
  assert.equal(check.visual.status, "invalid");
  assert.equal(
    check.blockers.some(
      (blocker) =>
        blocker.area === "Page Builder Visual" &&
        blocker.label === "Visual acceptance invalid",
    ),
    true,
  );
});

test("release check summarizes smoke and visual blockers", () => {
  const smokeReport = createCompleteReleaseReport({
    requireAdminApp: false,
    requireR2Upload: false,
    requireRevalidation: false,
  });
  const check = createReleaseEvidenceCheck({
    smokeArtifact: { report: smokeReport },
    visualManifest: createPendingVisualManifest(),
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });
  const lines = formatReleaseEvidenceCheck(check);

  assert.equal(
    lines.some((line) => line.includes("Status: blocked")),
    true,
  );
  assert.equal(
    lines.some((line) => line.includes("Production Smoke")),
    true,
  );
  assert.equal(
    lines.some((line) => line.includes("Page Builder Visual")),
    true,
  );
});

test("release check reports missing smoke and pending visual together", async () => {
  const emptyArchiveRoot = mkdtempSync(path.join(tmpdir(), "release-empty-"));
  const check = await readReleaseEvidenceCheck(readReleaseCheckCliConfig([]), {
    smokeRoots: [emptyArchiveRoot],
    visualManifest: createPendingVisualManifest(),
  });

  assert.equal(check.releaseReady, false);
  assert.equal(
    check.blockers.some(
      (blocker) =>
        blocker.area === "Production Smoke" &&
        blocker.label === "Production smoke artifact missing" &&
        blocker.action.includes("Production Smoke workflow") &&
        blocker.action.includes("production-smoke-report-<run_number>") &&
        blocker.action.includes("release-preflight-<run_number>") &&
        blocker.action.includes("release-evidence-check-<run_number>") &&
        blocker.action.includes("project-status-<run_number>") &&
        blocker.action.includes("--smoke-report <path>"),
    ),
    true,
  );
  assert.equal(
    check.blockers.some((blocker) => blocker.area === "Page Builder Visual"),
    true,
  );
});

test("release check keeps explicit missing smoke report paths visible", async () => {
  const check = await readReleaseEvidenceCheck(
    readReleaseCheckCliConfig([
      "--smoke-report",
      "artifacts/production-smoke/smoke-report.json",
    ]),
    {
      visualManifest: createPendingVisualManifest(),
    },
  );
  const lines = formatReleaseEvidenceCheck(check);

  assert.equal(
    check.smoke.path,
    "artifacts/production-smoke/smoke-report.json",
  );
  assert.equal(
    lines.some((line) =>
      line.includes(
        "Smoke report: artifacts/production-smoke/smoke-report.json",
      ),
    ),
    true,
  );
});

test("release check command is exposed in package, CI, and release docs", async () => {
  const [packageJson, ciWorkflow, releaseChecklist] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile(".github/workflows/ci.yml", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(
    packageJson,
    /"release:check": "node scripts\/release-check\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm release:check -- --help/);
  assert.match(
    releaseChecklist,
    /pnpm release:check -- --smoke-report artifacts\/production-smoke\/smoke-report\.json/,
  );
  assert.match(
    releaseChecklist,
    /--markdown-output artifacts\/release\/release-check\.md/,
  );
  assert.match(
    releaseChecklist,
    /--visual-artifact-dir reports\/visual\/page-builder-fixture/,
  );
  assert.match(
    releaseChecklist,
    /--output artifacts\/release\/release-check\.json/,
  );
  assert.match(releaseChecklist, /release-evidence-check\.v1/);
});
