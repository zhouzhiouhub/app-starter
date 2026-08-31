import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { runPageBuilderVisualAcceptanceCli } from "../page-builder-visual-acceptance.mjs";
import { createPendingVisualManifest } from "../release/release-check-test-fixtures.mjs";
import {
  createPageBuilderVisualAcceptanceChecklist,
  createPageBuilderVisualAcceptanceMarkdown,
  normalizeVisualAcceptanceMarkdownOutputPath,
  validatePageBuilderVisualAcceptanceManifest,
} from "./page-builder-visual-acceptance.mjs";

test("visual acceptance Markdown summarizes pending viewport tasks", () => {
  const manifest = createPendingVisualManifest();
  const report = validatePageBuilderVisualAcceptanceManifest(manifest);
  const checklist = createPageBuilderVisualAcceptanceChecklist(manifest);
  const markdown = createPageBuilderVisualAcceptanceMarkdown(report, checklist, {
    manifestPath: "docs/development/page-builder-visual-acceptance.json",
  });

  assert.match(markdown, /^# Page Builder Visual Acceptance/m);
  assert.match(
    markdown,
    /Manifest: `docs\/development\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(markdown, /Status: `needs-evidence`/);
  assert.match(markdown, /Viewport evidence accepted: 0\/12/);
  assert.match(markdown, /Pending viewports: 12/);
  assert.match(markdown, /### hero-banner/);
  assert.match(markdown, /Expected design reference: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/);
  assert.match(
    markdown,
    /Reference report: `pnpm visual:references -- --output artifacts\/visual\/visual-reference-import-report\.json --markdown-output artifacts\/visual\/visual-reference-import-report\.md --require-complete`/,
  );
  assert.match(markdown, /Capture: `pnpm visual:capture:fixture/);
  assert.match(markdown, /## Issues/);
  assert.match(markdown, /hero-banner is needs-evidence/);
});

test("visual acceptance CLI writes a Markdown checklist", async () => {
  const outputRoot = `tmp/visual-acceptance-markdown-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/visual-acceptance-report.md`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runPageBuilderVisualAcceptanceCli(
      ["--markdown-output", outputPath],
      {
        manifest: createPendingVisualManifest(),
        stdout: (line) => stdout.push(line),
      },
    );
    const markdown = await readFile(outputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(markdown, /spec-table/);
    assert.match(markdown, /pnpm visual:measure -- --write --require-complete/);
    assert.doesNotMatch(stdout.join("\n"), /Evidence checklist:/);
    assert.match(
      stdout.join("\n"),
      new RegExp(`Visual acceptance Markdown written: ${escapeRegExp(outputPath)}`),
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

test("visual acceptance Markdown output path is constrained", () => {
  assert.equal(
    normalizeVisualAcceptanceMarkdownOutputPath(
      "reports\\visual\\page-builder-fixture\\visual-acceptance-report.md",
    ),
    "reports/visual/page-builder-fixture/visual-acceptance-report.md",
  );
  assert.throws(
    () => normalizeVisualAcceptanceMarkdownOutputPath("reports/visual/report.json"),
    /must end with \.md/,
  );
  assert.throws(
    () => normalizeVisualAcceptanceMarkdownOutputPath("docs/releases/report.md"),
    /must be under docs\/visual/,
  );
  assert.throws(
    () =>
      normalizeVisualAcceptanceMarkdownOutputPath(
        "reports/visual/../report.md",
      ),
    /safe path segments/,
  );
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
