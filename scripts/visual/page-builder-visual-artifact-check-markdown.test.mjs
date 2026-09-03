import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { runPageBuilderVisualArtifactCheckCli } from "../page-builder-visual-artifact-check.mjs";
import {
  createPageBuilderVisualArtifactCheckMarkdown,
  formatPageBuilderVisualArtifactCheckUsage,
} from "./page-builder-visual-artifact-check.mjs";

test("visual artifact check Markdown summarizes complete bundles", () => {
  const markdown = createPageBuilderVisualArtifactCheckMarkdown(
    createArtifactCheckReport(),
  );

  assert.match(markdown, /^# Page Builder Visual Artifact Check/m);
  assert.match(markdown, /Status: `complete`/);
  assert.match(markdown, /Issues: 0/);
  assert.match(markdown, /Required files: 6\/6/);
  assert.match(markdown, /Screenshots: 12\/12/);
  assert.match(markdown, /Manifest design references: 0 linked/);
  assert.match(markdown, /Reference import: `ready`/);
  assert.match(
    markdown,
    /Reference source dir: `docs\/visual\/page-builder-references` \(ready\)/,
  );
  assert.match(markdown, /Reference missing: 0/);
  assert.match(markdown, /Reference updates: 0/);
  assert.match(markdown, /Required source references: 12\/12 available \(12 ready\)/);
  assert.doesNotMatch(markdown, /Reference missing files:/);
  assert.match(
    markdown,
    /Artifact manifest: `reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(
    markdown,
    /Reference import report: `reports\/visual\/page-builder-fixture\/visual-reference-import-report\.json`/,
  );
  assert.match(
    markdown,
    /Reference import Markdown: `reports\/visual\/page-builder-fixture\/visual-reference-import-report\.md`/,
  );
  assert.match(
    markdown,
    /Acceptance Markdown: `reports\/visual\/page-builder-fixture\/visual-acceptance-report\.md`/,
  );
  assert.match(markdown, /## Issues/);
  assert.match(markdown, /- None/);
  assert.match(markdown, /Keep this bundle with the release evidence review/);
});

test("visual artifact check Markdown lists issues and repair command", () => {
  const markdown = createPageBuilderVisualArtifactCheckMarkdown(
    createArtifactCheckReport({
      issues: [
        {
          code: "missing_artifact_file",
          message:
            "capture report is missing: https://example.test/report?token=abcdefghijklmnopqrstuvwxyz123456",
          severity: "error",
        },
      ],
    presentRequiredFileCount: 4,
    presentScreenshotCount: 11,
    referenceImport: createReferenceImportSummary({
      complete: false,
      firstMissingReferencePreview:
        "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png (1440x1000)",
      missingCount: 12,
      missingReferences: [
        "docs/visual/page-builder-references/hero-banner-desktop.png",
      ],
      requiredReferenceStatusCounts: {
        invalid: 0,
        missing: 12,
        ready: 0,
        updated: 0,
        wouldUpdate: 0,
      },
      status: "invalid",
    }),
    status: "invalid",
  }),
  );

  assert.match(markdown, /Status: `invalid`/);
  assert.match(markdown, /Issues: 1/);
  assert.match(markdown, /missing_artifact_file/);
  assert.doesNotMatch(markdown, /abcdefghijklmnopqrstuvwxyz123456/);
  assert.match(markdown, /Reference missing files: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/);
  assert.match(
    markdown,
    /First missing reference preview: `reports\/visual\/page-builder-fixture\/page-builder-visual-fixture-hero-banner-desktop\.png \(1440x1000\)`/,
  );
  assert.match(markdown, /Required source references: 0\/12 available \(12 missing\)/);
  assert.match(markdown, /pnpm visual:artifact-bundle -- --artifact-dir/);
  assert.match(markdown, /--output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.json/);
  assert.match(markdown, /--markdown-output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.md/);
});

test("visual artifact check CLI writes JSON and Markdown output", async () => {
  const outputRoot = `tmp/visual-artifact-check-markdown-${process.pid}-${Date.now()}`;
  const jsonOutputPath = `${outputRoot}/visual-artifact-check-report.json`;
  const markdownOutputPath = `${outputRoot}/visual-artifact-check-report.md`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runPageBuilderVisualArtifactCheckCli(
      [
        "--output",
        jsonOutputPath,
        "--markdown-output",
        markdownOutputPath,
      ],
      {
        checkArtifact: () => createArtifactCheckReport(),
        stdout: (line) => stdout.push(line),
      },
    );
    const artifact = JSON.parse(await readFile(jsonOutputPath, "utf8"));
    const markdown = await readFile(markdownOutputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.equal(artifact.status, "complete");
    assert.match(markdown, /Page Builder Visual Artifact Check/);
    assert.match(stdout.join("\n"), /Artifact is complete/);
    assert.match(
      stdout.join("\n"),
      new RegExp(
        `Visual artifact check Markdown written: ${escapeRegExp(markdownOutputPath)}`,
      ),
    );
    assert.match(
      stdout.join("\n"),
      new RegExp(
        `Visual artifact check artifact written: ${escapeRegExp(jsonOutputPath)}`,
      ),
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

test("visual artifact check usage documents Markdown output", () => {
  const usage = formatPageBuilderVisualArtifactCheckUsage().join("\n");

  assert.match(usage, /--markdown-output/);
  assert.match(usage, /--output/);
  assert.match(usage, /visual-artifact-check-report\.json/);
  assert.match(usage, /visual-artifact-check-report\.md/);
});

function createArtifactCheckReport(overrides = {}) {
  const issues = overrides.issues ?? [];
  const referenceImport =
    overrides.referenceImport ?? createReferenceImportSummary();

  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: overrides.issueCount ?? issues.length,
    issues,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    presentDesignReferenceCount: 0,
    referenceImport,
    referencedDesignReferenceCount: 0,
    requiredFileCount: 6,
    status: "complete",
    ...overrides,
  };
}

function createReferenceImportSummary(overrides = {}) {
  return {
    complete: true,
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    missingCount: 0,
    missingReferences: [],
    requiredReferenceCount: 12,
    requiredReferenceEntryCount: 12,
    requiredReferenceStatusCounts: {
      invalid: 0,
      missing: 0,
      ready: 12,
      updated: 0,
      wouldUpdate: 0,
    },
    sourceDir: "docs/visual/page-builder-references",
    sourceDirStatus: "ready",
    status: "ready",
    updated: false,
    updateCount: 0,
    ...overrides,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
