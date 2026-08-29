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
  assert.match(markdown, /Required files: 4\/4/);
  assert.match(markdown, /Screenshots: 12\/12/);
  assert.match(
    markdown,
    /Artifact manifest: `reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(
    markdown,
    /Reference import Markdown: `reports\/visual\/page-builder-fixture\/visual-reference-import-report\.md`/,
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
      presentRequiredFileCount: 3,
      presentScreenshotCount: 11,
      status: "invalid",
    }),
  );

  assert.match(markdown, /Status: `invalid`/);
  assert.match(markdown, /missing_artifact_file/);
  assert.doesNotMatch(markdown, /abcdefghijklmnopqrstuvwxyz123456/);
  assert.match(markdown, /pnpm visual:artifact-bundle -- --artifact-dir/);
  assert.match(markdown, /--markdown-output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.md/);
});

test("visual artifact check CLI writes Markdown output", async () => {
  const outputRoot = `tmp/visual-artifact-check-markdown-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/visual-artifact-check-report.md`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runPageBuilderVisualArtifactCheckCli(
      ["--markdown-output", outputPath],
      {
        checkArtifact: () => createArtifactCheckReport(),
        stdout: (line) => stdout.push(line),
      },
    );
    const markdown = await readFile(outputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(markdown, /Page Builder Visual Artifact Check/);
    assert.match(stdout.join("\n"), /Artifact is complete/);
    assert.match(
      stdout.join("\n"),
      new RegExp(
        `Visual artifact check Markdown written: ${escapeRegExp(outputPath)}`,
      ),
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

test("visual artifact check usage documents Markdown output", () => {
  const usage = formatPageBuilderVisualArtifactCheckUsage().join("\n");

  assert.match(usage, /--markdown-output/);
  assert.match(usage, /visual-artifact-check-report\.md/);
});

function createArtifactCheckReport(overrides = {}) {
  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issues: [],
    presentRequiredFileCount: 4,
    presentScreenshotCount: 12,
    requiredFileCount: 4,
    status: "complete",
    ...overrides,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
