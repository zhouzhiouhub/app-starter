import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createTestPng } from "./page-builder-visual-artifact-check-test-fixtures.mjs";
import {
  createPageBuilderVisualReferenceImportMarkdown,
  importPageBuilderVisualReferences,
} from "./page-builder-visual-reference-import.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
} from "./page-builder-visual-acceptance.mjs";

test("visual reference import Markdown lists required source files", () => {
  const root = createFixtureRoot();
  const manifest = createManifest({ accepted: false });
  writeReferenceFiles(root, { skip: "faq-mobile.png" });
  const report = importPageBuilderVisualReferences(
    {
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      markdownOutputPath:
        "reports/visual/page-builder-fixture/visual-reference-import-report.md",
      requireComplete: true,
      sourceDir: "docs/visual/page-builder-references",
      write: false,
    },
    { cwd: root, manifest },
  );
  const markdown = createPageBuilderVisualReferenceImportMarkdown(report);

  assert.match(markdown, /^# Page Builder Visual Reference Import/m);
  assert.match(markdown, /Status: `invalid`/);
  assert.match(markdown, /Source dir status: `ready`/);
  assert.match(markdown, /References updated: 11/);
  assert.match(markdown, /Missing references: 1/);
  assert.match(markdown, /## Required Source Files/);
  assertRequiredSourceFiles(markdown);
  assert.match(markdown, /## Missing References/);
  assert.match(
    markdown,
    /faq\.mobile: faq-mobile\.png is missing; expected `docs\/visual\/page-builder-references\/faq-mobile\.png`/,
  );
  assert.match(
    markdown,
    /pnpm visual:references -- --source-dir docs\/visual\/page-builder-references --write --require-complete/,
  );
});

function assertRequiredSourceFiles(markdown) {
  const requiredSourceFiles = readMarkdownSection(
    markdown,
    "## Required Source Files",
    "## Updates",
  );

  assert.equal((requiredSourceFiles.match(/^- /gm) ?? []).length, 12);
  assert.match(
    requiredSourceFiles,
    /hero-banner\.desktop: would-update; `docs\/visual\/page-builder-references\/hero-banner-desktop\.png` - imports `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    requiredSourceFiles,
    /faq\.mobile: missing; `docs\/visual\/page-builder-references\/faq-mobile\.png` - faq-mobile\.png is missing/,
  );
  assert.match(
    requiredSourceFiles,
    /spec-table\.mobile: would-update; `docs\/visual\/page-builder-references\/spec-table-mobile\.png` - imports `docs\/visual\/page-builder-references\/spec-table-mobile\.png`/,
  );
}

function readMarkdownSection(markdown, startHeader, endHeader) {
  const start = markdown.indexOf(startHeader);
  const end = markdown.indexOf(endHeader, start + startHeader.length);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  return markdown.slice(start, end);
}

function createManifest({ accepted }) {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: accepted ? "accepted" : "needs-evidence",
      viewports: {
        desktop: createViewport(component, "desktop", accepted),
        mobile: createViewport(component, "mobile", accepted),
      },
    })),
    schemaVersion: pageBuilderVisualAcceptanceSchemaVersion,
    targets: {
      components: mvpPageBuilderComponents,
      maxColorDeltaE: 3,
      maxLayoutDeltaPx: 5,
      minVisualMatchPercent: 95,
      viewports: ["desktop", "mobile"],
    },
  };
}

function createViewport(component, viewport, accepted) {
  return {
    designReference: `docs/old/${component}-${viewport}.png`,
    maxColorDeltaE: accepted ? 2 : null,
    maxLayoutDeltaPx: accepted ? 4 : null,
    previewScreenshot: `artifacts/visual/${component}-${viewport}.png`,
    status: accepted ? "accepted" : "needs-evidence",
    visualMatchPercent: accepted ? 98 : null,
  };
}

function createFixtureRoot() {
  return mkdtempSync(path.join(tmpdir(), "visual-reference-import-markdown-"));
}

function writeReferenceFiles(root, options = {}) {
  const sourceDir = path.join(root, "docs/visual/page-builder-references");
  mkdirSync(sourceDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of ["desktop", "mobile"]) {
      const fileName = `${component}-${viewport}.png`;

      if (fileName !== options.skip) {
        writeFileSync(path.join(sourceDir, fileName), createTestPng(2, 1));
      }
    }
  }
}
