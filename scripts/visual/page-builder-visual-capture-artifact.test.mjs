import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import test from "node:test";
import {
  createPageBuilderVisualCaptureArtifact,
  writePageBuilderVisualCaptureArtifact,
} from "./page-builder-visual-capture.mjs";

test("visual capture artifact records screenshot evidence", () => {
  const artifact = createPageBuilderVisualCaptureArtifact(createCaptureResult(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(artifact.schemaVersion, "page-builder-visual-capture.v1");
  assert.equal(artifact.generatedAt, "2026-08-28T00:00:00.000Z");
  assert.equal(artifact.outputDir, "reports/visual/page-builder-fixture");
  assert.equal(artifact.screenshotCount, 1);
  assert.deepEqual(artifact.screenshots[0], {
    bytes: 123,
    component: "hero-banner",
    evidencePath:
      "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png",
    viewport: "desktop",
  });
});

test("visual capture artifact records manifest update metadata", () => {
  const artifact = createPageBuilderVisualCaptureArtifact(createCaptureResult());

  assert.deepEqual(artifact.manifestUpdate, {
    manifestPath: "docs/development/page-builder-visual-acceptance.json",
    updateCount: 1,
    updated: true,
    updates: [
      {
        component: "hero-banner",
        previewScreenshot:
          "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png",
        viewport: "desktop",
      },
    ],
  });
});

test("visual capture artifact writer creates parent directories", async () => {
  const root = `tmp/visual-capture-artifact-${process.pid}-${Date.now()}`;
  const outputPath = `${root}/visual-capture-report.json`;

  rmSync(root, { force: true, recursive: true });

  try {
    await writePageBuilderVisualCaptureArtifact(
      outputPath,
      createPageBuilderVisualCaptureArtifact(createCaptureResult()),
    );

    const artifact = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.equal(artifact.schemaVersion, "page-builder-visual-capture.v1");
    assert.equal(artifact.screenshotCount, 1);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function createCaptureResult() {
  const evidencePath =
    "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png";

  return {
    baseUrl: "http://localhost:3000",
    browserPath: "google-chrome",
    buildSkipped: false,
    manifestUpdate: {
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      updated: true,
      updates: [
        {
          component: "hero-banner",
          previewScreenshot: evidencePath,
          viewport: "desktop",
        },
      ],
    },
    outputDir: "reports/visual/page-builder-fixture",
    screenshots: [
      {
        bytes: 123,
        component: "hero-banner",
        evidencePath,
        viewport: "desktop",
      },
    ],
    webPort: 3000,
  };
}
