import assert from "node:assert/strict";
import test from "node:test";
import {
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportMarkdown,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
  createPageBuilderVisualReferenceReportCommand,
  formatPageBuilderVisualReferenceImportReport,
} from "./page-builder-visual-reference-import.mjs";

const artifactReport = {
  manifestPath:
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  sourceDir: "docs/visual/page-builder-references",
};

test("visual reference commands keep artifact manifest context", () => {
  assert.equal(
    createPageBuilderVisualReferenceCaptureCommand(artifactReport),
    "pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest",
  );
  assert.equal(
    createPageBuilderVisualReferenceImportWriteCommand(artifactReport),
    "pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete",
  );
  assert.equal(
    createPageBuilderVisualReferenceReportCommand(artifactReport),
    "pnpm visual:references:check",
  );
  assert.equal(
    createPageBuilderVisualReferenceMeasureCommand(artifactReport),
    "pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete",
  );
  assert.equal(
    createPageBuilderVisualReferenceAcceptPassingCommand(artifactReport),
    "pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete",
  );
  assert.equal(
    createPageBuilderVisualReferenceAcceptanceCommand(artifactReport),
    "pnpm visual:acceptance -- --require-accepted reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  );
});

test("visual reference Markdown keeps artifact follow-up commands", () => {
  const markdown = createPageBuilderVisualReferenceImportMarkdown({
    ...artifactReport,
    missing: [],
    status: "updated",
    updates: [
      {
        component: "hero-banner",
        designReference:
          "docs/visual/page-builder-references/hero-banner-desktop.png",
        viewport: "desktop",
      },
    ],
  });

  assert.match(
    markdown,
    /pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete/,
  );
  assert.match(
    markdown,
    /pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete/,
  );
  assert.match(
    markdown,
    /pnpm visual:capture:fixture -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder-fixture --report reports\/visual\/page-builder-fixture\/visual-capture-report\.json --write-manifest/,
  );
  assert.match(
    markdown,
    /pnpm visual:acceptance -- --require-accepted reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/,
  );
});

test("visual reference commands keep non-default source dirs explicit", () => {
  const customReport = {
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    sourceDir: "artifacts/visual/design-references",
  };

  assert.equal(
    createPageBuilderVisualReferenceImportWriteCommand(customReport),
    "pnpm visual:references -- --source-dir artifacts/visual/design-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete",
  );
  assert.equal(
    createPageBuilderVisualReferenceReportCommand(customReport),
    "pnpm visual:references -- --source-dir artifacts/visual/design-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output reports/visual/page-builder-fixture/visual-reference-import-report.json --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md --require-complete",
  );
});

test("visual reference reports list expected files and artifact write command", () => {
  const report = {
    ...artifactReport,
    missing: [
      {
        component: "faq",
        reason: "faq-mobile.png is missing",
        viewport: "mobile",
      },
    ],
    status: "would-update",
    updates: [],
  };
  const text = formatPageBuilderVisualReferenceImportReport(report).join("\n");
  const markdown = createPageBuilderVisualReferenceImportMarkdown(report);

  assert.match(
    text,
    /expected docs\/visual\/page-builder-references\/faq-mobile\.png/,
  );
  assert.match(
    text,
    /visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete/,
  );
  assert.match(
    markdown,
    /visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete/,
  );
});
