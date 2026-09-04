import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";
import { runPageBuilderVisualDesignReferenceFreezeCli } from "../page-builder-visual-design-reference-freeze.mjs";
import {
  createPageBuilderVisualFixtureScreenshotFileName,
  freezePageBuilderVisualDesignReferences,
} from "./page-builder-visual-design-reference-freeze.mjs";
import { createRgbaTestPng, createTestPng } from "./png-test-fixtures.mjs";

test("design reference freeze copies approved fixture screenshots", () => {
  const root = createRoot();
  writeFixtureScreenshots(root, createSectionDesignPng);
  const result = freezePageBuilderVisualDesignReferences(
    createConfig(),
    createRuntime(root),
  );

  assert.equal(result.status, "updated");
  assert.equal(result.exports.length, 12);
  assert.equal(
    result.exports[0].outputPath,
    "docs/visual/page-builder-references/hero-banner-desktop.png",
  );
  assert.deepEqual(
    readFileSync(
      path.join(root, "docs/visual/page-builder-references/hero-banner-desktop.png"),
    ),
    readFileSync(
      path.join(
        root,
        "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png",
      ),
    ),
  );
});

test("design reference freeze rejects placeholder fixture screenshots", () => {
  const root = createRoot();
  writeFixtureScreenshots(root, createPlaceholderPng);

  assert.throws(
    () =>
      freezePageBuilderVisualDesignReferences(createConfig(), {
        cwd: root,
        height: 100,
        viewportWidths: {
          desktop: 100,
          mobile: 100,
        },
      }),
    /appears to be a generated placeholder/,
  );
});

test("design reference freeze rejects the wrong screenshot size", () => {
  const root = createRoot();
  writeFixtureScreenshots(root, () => createTestPng(8, 8));

  assert.throws(
    () =>
      freezePageBuilderVisualDesignReferences(
        createConfig(),
        createRuntime(root),
      ),
    /must be 20x16, received 8x8/,
  );
});

test("design reference freeze CLI writes the exported reference list", () => {
  const root = createRoot();
  writeFixtureScreenshots(root, createSectionDesignPng);
  const lines = [];

  const code = runPageBuilderVisualDesignReferenceFreezeCli(
    ["--source-dir", "reports/visual/page-builder-fixture"],
    {
      ...createRuntime(root),
      stdout: (line) => lines.push(line),
    },
  );

  assert.equal(code, 0);
  assert.match(lines.join("\n"), /Exported: 12/);
  assert.match(lines.join("\n"), /hero-banner\.desktop/);
});

function createConfig() {
  return {
    components: mvpPageBuilderComponents,
    outputDir: "docs/visual/page-builder-references",
    sourceDir: "reports/visual/page-builder-fixture",
    viewports: pageBuilderVisualAcceptanceViewports,
  };
}

function createRuntime(cwd) {
  return {
    cwd,
    height: 16,
    viewportWidths: {
      desktop: 20,
      mobile: 20,
    },
  };
}

function createRoot() {
  return mkdtempSync(path.join(tmpdir(), "visual-design-reference-freeze-"));
}

function writeFixtureScreenshots(root, createPng) {
  const sourceDir = path.join(root, "reports/visual/page-builder-fixture");
  mkdirSync(sourceDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      writeFileSync(
        path.join(
          sourceDir,
          createPageBuilderVisualFixtureScreenshotFileName(component, viewport),
        ),
        createPng(),
      );
    }
  }

  mkdirSync(path.join(root, "docs/visual/page-builder-references"), {
    recursive: true,
  });
}

function createSectionDesignPng() {
  return createRgbaTestPng(20, 16, (x, y) => {
    if (y > 4 && y < 8 && x > 3 && x < 14) {
      return [17, 24, 39, 255];
    }

    return [255, 255, 255, 255];
  });
}

function createPlaceholderPng() {
  return createRgbaTestPng(100, 100, (x, y) => {
    if (x < 15 && y < 5) {
      return [255, 255, 255, 255];
    }

    if (x >= 35 && x < 65 && y >= 35 && y < 65) {
      return [0, 180, 255, 255];
    }

    return [0, 0, 0, 255];
  });
}
