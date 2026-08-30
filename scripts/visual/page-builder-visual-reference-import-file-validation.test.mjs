import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createTestPng } from "./page-builder-visual-artifact-check-test-fixtures.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";
import {
  formatPageBuilderVisualReferenceImportReport,
  importPageBuilderVisualReferences,
} from "./page-builder-visual-reference-import.mjs";

test("visual reference import rejects unreadable PNG references", () => {
  const root = createFixtureRoot();
  const manifest = createManifest();
  writeReferenceFiles(root, {
    override: {
      body: Buffer.from("not a png"),
      fileName: "hero-banner-desktop.png",
    },
  });
  const report = importPageBuilderVisualReferences(
    {
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      requireComplete: true,
      sourceDir: "docs/visual/page-builder-references",
      write: false,
    },
    { cwd: root, manifest },
  );
  const lines = formatPageBuilderVisualReferenceImportReport(report).join("\n");

  assert.equal(report.status, "invalid");
  assert.equal(report.missing.length, 1);
  assert.deepEqual(report.missing[0], {
    component: "hero-banner",
    reason:
      "hero-banner-desktop.png must be a readable PNG: " +
      path.join(
        root,
        "docs/visual/page-builder-references/hero-banner-desktop.png",
      ) +
      " is not a PNG image.",
    viewport: "desktop",
  });
  assert.match(
    lines,
    /hero-banner\.desktop: hero-banner-desktop\.png must be a readable PNG:/,
  );
});

function createManifest() {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "needs-evidence",
      viewports: Object.fromEntries(
        pageBuilderVisualAcceptanceViewports.map((viewport) => [
          viewport,
          {
            designReference: null,
            maxColorDeltaE: null,
            maxLayoutDeltaPx: null,
            previewScreenshot: null,
            status: "needs-evidence",
            visualMatchPercent: null,
          },
        ]),
      ),
    })),
    schemaVersion: pageBuilderVisualAcceptanceSchemaVersion,
    targets: {
      components: mvpPageBuilderComponents,
      maxColorDeltaE: 3,
      maxLayoutDeltaPx: 5,
      minVisualMatchPercent: 95,
      viewports: pageBuilderVisualAcceptanceViewports,
    },
  };
}

function createFixtureRoot() {
  return mkdtempSync(path.join(tmpdir(), "visual-reference-validation-"));
}

function writeReferenceFiles(root, options = {}) {
  const sourceDir = path.join(root, "docs/visual/page-builder-references");
  mkdirSync(sourceDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      const fileName = `${component}-${viewport}.png`;
      const body =
        options.override?.fileName === fileName
          ? options.override.body
          : createTestPng(2, 1);

      writeFileSync(path.join(sourceDir, fileName), body);
    }
  }
}
