import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { runReleaseCheckCli } from "../release-check.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeDispatchManifestValidationCommand,
} from "../smoke/production-smoke-dispatch-command.mjs";
import {
  createReleaseEvidenceCheck,
  createReleaseEvidenceCheckArtifact,
  createReleaseEvidenceCheckMarkdown,
} from "./release-check.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
  createPendingVisualManifest,
  createVisualArtifactCheck,
} from "./release-check-test-fixtures.mjs";

test("release check Markdown summarizes ready evidence", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const artifact = createReleaseEvidenceCheckArtifact(
    createReleaseEvidenceCheck({
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
    }),
    { generatedAt: "2026-08-29T00:00:00.000Z" },
  );
  const markdown = createReleaseEvidenceCheckMarkdown(artifact);

  assert.match(markdown, /^# Release Evidence Check/m);
  assert.match(markdown, /Generated: `2026-08-29T00:00:00.000Z`/);
  assert.match(markdown, /Status: `ready`/);
  assert.match(markdown, /Release ready: yes/);
  assert.match(
    markdown,
    /Report path: `artifacts\/production-smoke\/smoke-report\.json`/,
  );
  assert.doesNotMatch(markdown, /### Missing Production Smoke Evidence/);
  assert.match(
    markdown,
    /Source workflow URL: https:\/\/github\.com\/zhouzhiouhub\/app-starter\/actions\/runs\/123456789/,
  );
  assert.match(
    markdown,
    /Manifest: `reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(
    markdown,
    /Checklist manifest: `reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(markdown, /Artifact check: complete/);
  assert.match(markdown, /Artifact issue count: 0/);
  assert.match(markdown, /Manifest design references: 12\/12 linked/);
  assert.match(markdown, /Reference import: ready/);
  assert.match(markdown, /Reference missing: 0/);
  assert.match(markdown, /Required source references: 12\/12 available \(12 ready\)/);
  assert.doesNotMatch(markdown, /### Missing Visual References/);
  assert.match(markdown, /## Readiness Checklist/);
  assert.match(markdown, /Release notes record: ready to generate/);
  assert.match(
    markdown,
    / {2}- Steps:\n {4}- Command: `pnpm release:notes -- --release-tag <tag> --workflow-run-url <url> --output docs\/releases\/<tag>\.md`/,
  );
  assert.match(
    markdown,
    / {4}- Evidence args: `--smoke-artifact production-smoke-report-<run_number>/,
  );
  assert.match(markdown, /--local-verification-run-url <main-ci-run-url>/);
  assert.match(
    markdown,
    /--local-verification-artifact local-verification-<run_number>/,
  );
  assert.match(markdown, / {4}- Local verification args:/);
  assert.match(markdown, / {4}- Project and visual args:/);
  assert.match(markdown, / {4}- Keep artifact: `release-notes-<run_number>`/);
  assert.match(markdown, /## Pending Visual Evidence/);
  assert.match(markdown, /- None/);
});

test("release check Markdown lists blockers and visual tasks", () => {
  const dispatchCommand = createProductionSmokeDispatchCommand();
  const validationCommand = createProductionSmokeDispatchManifestValidationCommand();
  const artifact = createReleaseEvidenceCheckArtifact(
    createReleaseEvidenceCheck({
      smokeArtifact: {
        path: "artifacts/production-smoke/smoke-report.json",
        report: createCompleteReleaseReport({
          requireAdminApp: false,
          requireR2Upload: false,
          requireRevalidation: false,
        }),
      },
      visualArtifact: createVisualArtifactCheck({ status: "invalid" }),
      visualArtifactDir: "reports/visual/page-builder-fixture",
      visualManifest: createPendingVisualManifest(),
      visualManifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    }),
    { generatedAt: "2026-08-29T00:00:00.000Z" },
  );
  const markdown = createReleaseEvidenceCheckMarkdown(artifact);

  assert.match(markdown, /Status: `blocked`/);
  assert.match(markdown, /Production Smoke report: blocked/);
  assert.match(markdown, /### Missing Production Smoke Evidence/);
  assert.match(
    markdown,
    /Workflow: `GitHub Actions Production Smoke against the production environment`/,
  );
  assert.match(
    markdown,
    /Workflow manual dispatch: `GitHub Actions > Production Smoke > Run workflow, then use the listed workflow_dispatch inputs\.`/,
  );
  assert.match(
    markdown,
    /Production smoke request: `pnpm smoke:request`/,
  );
  assert.match(
    markdown,
    /Dispatch inputs output: `artifacts\/production-smoke\/production-smoke-dispatch-inputs\.txt`/,
  );
  assert.match(
    markdown,
    /Dispatch inputs table output: `artifacts\/production-smoke\/production-smoke-dispatch-inputs\.tsv`/,
  );
  assert.match(
    markdown,
    /Dispatch inputs JSON output: `artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json`/,
  );
  assert.match(
    markdown,
    new RegExp(
      `Workflow dispatch validation: \`${escapeRegExp(validationCommand)}`,
      "u",
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Workflow dispatch template: \`${escapeRegExp(dispatchCommand)}\``,
      "u",
    ),
  );
  assert.match(
    markdown,
    /Smoke report JSON: `artifacts\/production-smoke\/smoke-report\.json`/,
  );
  assertMissingSmokeEvidenceOrder(markdown);
  assert.match(
    markdown,
    /Smoke report Markdown: `artifacts\/production-smoke\/smoke-report\.md`/,
  );
  assert.match(markdown, /### Production Smoke Workflow Inputs/);
  assert.match(markdown, /### Production Smoke Dispatch Input Replacements/);
  assert.match(markdown, /`visual_artifact_name`: `page-builder-visual-fixture-<run_number>` - missing; replace placeholder page-builder-visual-fixture-<run_number> with Page Builder Visual workflow artifact after visual evidence passes/);
  assert.match(
    markdown,
    /`report_path`: `artifacts\/production-smoke\/smoke-report\.json` \(workflow required; release evidence optional; safe JSON output path\)/,
  );
  assert.match(
    markdown,
    /`local_verification_artifact_name`: `local-verification-<run_number>` \(workflow optional; release evidence required; main CI artifact name for local verification evidence\)/,
  );
  assert.match(
    markdown,
    /`visual_artifact_run_id`: `<Page Builder Visual workflow run id>` \(workflow optional; release evidence required; Page Builder Visual workflow run id\)/,
  );
  assert.match(markdown, /### Production Smoke Evidence Input Sources/);
  assert.match(
    markdown,
    /`visual_artifact_name`: `page-builder-visual-fixture-<run_number>` - Page Builder Visual workflow artifact after visual evidence passes/,
  );
  assert.match(
    markdown,
    /`storefront_url`: `<public HTTPS storefront URL>` - public HTTPS storefront URL for the production release/,
  );
  assert.match(
    markdown,
    /`allow_blocked_release_notes`: `false` \(workflow required; release evidence optional; only true for failure review drafts\)/,
  );
  assert.match(
    markdown,
    /Smoke artifact: `production-smoke-report-<run_number>`/,
  );
  assert.match(
    markdown,
    /Release evidence artifact: `release-evidence-check-<run_number>`/,
  );
  assert.doesNotMatch(markdown, /Production Smoke report: blocked; detail:/u);
  assert.match(
    markdown,
    / {2}- Detail: Report path: artifacts\/production-smoke\/smoke-report\.json/,
  );
  assert.match(
    markdown,
    / {2}- Action: Resolve productionReadiness blockers before marking the release ready\./,
  );
  assert.match(markdown, /Page Builder Visual evidence: needs-evidence/);
  assert.doesNotMatch(
    markdown,
    /Page Builder Visual evidence: needs-evidence; detail:/u,
  );
  assert.match(
    markdown,
    / {2}- Bundle: `pnpm visual:artifact-bundle -- --artifact-dir reports\/visual\/page-builder-fixture`/,
  );
  assert.match(markdown, /Production Smoke: R2 upload smoke required/);
  assert.match(markdown, /Page Builder Visual: Visual artifact invalid/);
  assert.match(markdown, /Artifact issues:/);
  assert.match(markdown, /Reference import: invalid/);
  assert.match(markdown, /Reference missing: 12/);
  assert.match(markdown, /Required source references: 0\/12 available \(12 missing\)/);
  assert.match(markdown, /### Missing Visual References/);
  assert.match(markdown, /Source dir: `docs\/visual\/page-builder-references`/);
  assert.match(markdown, /Missing files: 12/);
  assert.match(markdown, /### Visual Reference Intake Commands/);
  assert.match(
    markdown,
    /Design request: `pnpm visual:references:request`/,
  );
  assert.match(
    markdown,
    /Reference report: `pnpm visual:references:check`/,
  );
  assert.match(
    markdown,
    /Reference missing files: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(markdown, /missing_artifact_file/);
  assert.match(
    markdown,
    /Checklist manifest: `reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(markdown, /hero-banner\.desktop: missing designReference/);
  assert.doesNotMatch(
    markdown,
    /hero-banner\.desktop: missing designReference; reference/u,
  );
  assert.match(
    markdown,
    / {2}- Reference: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    markdown,
    / {2}- Preview: `reports\/visual\/page-builder-fixture\/page-builder-visual-fixture-hero-banner-desktop\.png` \(1440x1000\)/,
  );
  assert.match(
    markdown,
    / {2}- Capture: `pnpm visual:capture:fixture -- --component hero-banner --viewport desktop --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder-fixture --write-manifest`/,
  );
  assert.match(
    markdown,
    / {2}- Reference report: `pnpm visual:references:check`/,
  );
  assert.match(
    markdown,
    / {2}- Import: `pnpm visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete`/,
  );
  assert.match(
    markdown,
    / {2}- Measure: `pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete`/,
  );
  assert.match(
    markdown,
    / {2}- Accept passing: `pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete`/,
  );
  assert.match(
    markdown,
    / {2}- Verify: `pnpm visual:acceptance -- --require-accepted reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
  );
});

test("release check Markdown surfaces visual measurement failures", () => {
  const artifact = createReleaseEvidenceCheckArtifact(
    createReleaseEvidenceCheck({
      smokeArtifact: {
        path: "artifacts/production-smoke/smoke-report.json",
        report: createCompleteReleaseReport(),
      },
      visualManifest: createPendingVisualManifest(),
    }),
    { generatedAt: "2026-08-29T00:00:00.000Z" },
  );
  artifact.visual.failedMeasurementCount = 2;
  artifact.visual.failedMeasurementViewportCount = 1;
  artifact.visual.firstFailedMeasurement =
    "hero-banner.desktop: visualMatchPercent >= 95 (current 0.15)";
  const markdown = createReleaseEvidenceCheckMarkdown(artifact);

  assert.match(
    markdown,
    /Visual measurements: 1 measured viewports failing, 2 failed metrics, first failed hero-banner\.desktop: visualMatchPercent >= 95 \(current 0\.15\)/,
  );
});

test("release check CLI writes Markdown output", async () => {
  const outputRoot = `tmp/release-check-markdown-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/release-check.md`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runReleaseCheckCli(
      ["--markdown-output", outputPath],
      {
        smokeArtifact: {
          path: "artifacts/production-smoke/smoke-report.json",
          report: createCompleteReleaseReport(),
        },
        stdout: (line) => stdout.push(line),
        visualManifest: createPendingVisualManifest(),
      },
    );
    const markdown = await readFile(outputPath, "utf8");

    assert.equal(exitCode, 1);
    assert.match(markdown, /^# Release Evidence Check/m);
    assert.match(markdown, /Release ready: no/);
    assert.match(markdown, /hero-banner\.desktop/);
    assert.match(
      stdout.join("\n"),
      new RegExp(
        `Release evidence Markdown written: ${escapeRegExp(outputPath)}`,
      ),
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function assertMissingSmokeEvidenceOrder(markdown) {
  const section = readMissingSmokeEvidenceSection(markdown);
  const requestIndex = section.indexOf("Production smoke request:");
  const inputsOutputIndex = section.indexOf("Dispatch inputs output:");
  const inputsTableOutputIndex = section.indexOf(
    "Dispatch inputs table output:",
  );
  const inputsJsonOutputIndex = section.indexOf("Dispatch inputs JSON output:");
  const validationIndex = section.indexOf("Workflow dispatch validation:");
  const templateIndex = section.indexOf("Workflow dispatch template:");
  const manualIndex = section.indexOf("Workflow manual dispatch:");
  const replacementsIndex = section.indexOf(
    "### Production Smoke Dispatch Input Replacements",
  );
  const workflowIndex = section.indexOf(
    "Workflow: `GitHub Actions Production Smoke",
  );
  const indices = [
    requestIndex,
    inputsOutputIndex,
    inputsTableOutputIndex,
    inputsJsonOutputIndex,
    validationIndex,
    templateIndex,
    manualIndex,
    replacementsIndex,
    workflowIndex,
  ];

  assert(
    indices.every((index) => index >= 0) &&
      requestIndex < inputsOutputIndex &&
      inputsOutputIndex < inputsTableOutputIndex &&
      inputsTableOutputIndex < inputsJsonOutputIndex &&
      inputsJsonOutputIndex < validationIndex &&
      validationIndex < templateIndex &&
      templateIndex < manualIndex &&
      manualIndex < workflowIndex &&
      workflowIndex < replacementsIndex,
    "missing smoke evidence should list request and validation before workflow execution",
  );
}

function readMissingSmokeEvidenceSection(markdown) {
  const start = markdown.indexOf("### Missing Production Smoke Evidence");
  const end = markdown.indexOf("### Production Smoke Workflow Inputs", start);

  assert(
    start >= 0 && end > start,
    "release check Markdown should include the missing smoke evidence section",
  );

  return markdown.slice(start, end);
}
