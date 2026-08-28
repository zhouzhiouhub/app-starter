import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import {
  createPageBuilderVisualAcceptanceArtifact,
  createPageBuilderVisualAcceptanceChecklist,
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
  validatePageBuilderVisualAcceptanceManifest,
} from "./page-builder-visual-acceptance.mjs";
import {
  checkPageBuilderVisualArtifact,
  formatPageBuilderVisualArtifactCheckReport,
  readPageBuilderVisualArtifactCheckCliConfig,
} from "./page-builder-visual-artifact-check.mjs";
import { createPageBuilderVisualCaptureArtifact } from "./page-builder-visual-capture.mjs";

test("visual artifact check config parses safe artifact directories", () => {
  assert.deepEqual(readPageBuilderVisualArtifactCheckCliConfig([]), {
    artifactDir: "reports/visual/page-builder-fixture",
    json: false,
  });
  assert.deepEqual(
    readPageBuilderVisualArtifactCheckCliConfig([
      "--",
      "--artifact-dir",
      "artifacts/visual/page-builder-fixture",
      "--json",
    ]),
    {
      artifactDir: "artifacts/visual/page-builder-fixture",
      json: true,
    },
  );
  assert.throws(
    () =>
      readPageBuilderVisualArtifactCheckCliConfig([
        "--artifact-dir",
        "tmp/page-builder-fixture",
      ]),
    /must live under artifacts\/visual or reports\/visual/,
  );
});

test("visual artifact check accepts a complete fixture artifact", () => {
  const artifactDir = createArtifactDir("complete");

  try {
    writeVisualArtifact(artifactDir);
    const report = checkPageBuilderVisualArtifact({ artifactDir });

    assert.equal(report.status, "complete");
    assert.equal(report.presentRequiredFileCount, 3);
    assert.equal(report.presentScreenshotCount, 12);
    assert.deepEqual(report.issues, []);
    assert.match(
      formatPageBuilderVisualArtifactCheckReport(report).join("\n"),
      /Artifact is complete/,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects missing screenshots", () => {
  const artifactDir = createArtifactDir("missing");
  const missingScreenshot =
    `${artifactDir}/page-builder-visual-fixture-hero-banner-desktop.png`;

  try {
    writeVisualArtifact(artifactDir);
    rmSync(missingScreenshot);

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(
      report.issues.some((issue) => issue.code === "invalid_screenshot_file"),
      true,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects manifest screenshot drift", () => {
  const artifactDir = createArtifactDir("drift");

  try {
    writeVisualArtifact(artifactDir, {
      previewOverride:
        `${artifactDir}/page-builder-visual-fixture-hero-banner-wrong.png`,
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(
      report.issues.some(
        (issue) => issue.code === "manifest_screenshot_mismatch",
      ),
      true,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check command is exposed in package and workflows", () => {
  const packageJson = readText("package.json");
  const ciWorkflow = readText(".github/workflows/ci.yml");
  const pageBuilderWorkflow = readText(".github/workflows/page-builder-visual.yml");
  const productionSmokeWorkflow = readText(".github/workflows/production-smoke.yml");
  const visualDoc = readText("docs/development/page-builder-visual-acceptance.md");
  const releaseChecklist = readText("docs/development/release-checklist.md");

  assert.match(
    packageJson,
    /"visual:artifact-check": "node scripts\/page-builder-visual-artifact-check\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm visual:artifact-check -- --help/);
  assert.match(
    pageBuilderWorkflow,
    /pnpm visual:artifact-check -- --artifact-dir reports\/visual\/page-builder-fixture/,
  );
  assert.match(
    productionSmokeWorkflow,
    /pnpm visual:artifact-check -- --artifact-dir reports\/visual\/page-builder-fixture/,
  );
  assert.match(visualDoc, /pnpm visual:artifact-check/);
  assert.match(releaseChecklist, /pnpm visual:artifact-check/);
});

function createArtifactDir(label) {
  const artifactDir = `reports/visual/artifact-check-${label}-${process.pid}-${Date.now()}`;

  rmSync(artifactDir, { force: true, recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  return artifactDir;
}

function writeVisualArtifact(artifactDir, input = {}) {
  const manifest = createVisualManifest(artifactDir, input);
  const screenshots = createScreenshotEntries(artifactDir);

  for (const screenshot of screenshots) {
    writePng(screenshot.evidencePath);
  }

  const acceptanceReport = validatePageBuilderVisualAcceptanceManifest(manifest);
  const acceptanceArtifact = createPageBuilderVisualAcceptanceArtifact(
    acceptanceReport,
    { checklist: createPageBuilderVisualAcceptanceChecklist(manifest) },
  );
  const captureArtifact = createPageBuilderVisualCaptureArtifact({
    baseUrl: "http://localhost:3000",
    browserPath: "google-chrome",
    buildSkipped: false,
    manifestUpdate: createManifestUpdate(artifactDir, screenshots),
    outputDir: artifactDir,
    screenshots,
    webPort: 3000,
  });

  writeJson(`${artifactDir}/page-builder-visual-acceptance.json`, manifest);
  writeJson(`${artifactDir}/visual-acceptance-report.json`, acceptanceArtifact);
  writeJson(`${artifactDir}/visual-capture-report.json`, captureArtifact);
}

function createVisualManifest(artifactDir, input) {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "needs-evidence",
      viewports: Object.fromEntries(
        pageBuilderVisualAcceptanceViewports.map((viewport) => [
          viewport,
          createViewportEvidence(artifactDir, component, viewport, input),
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

function createViewportEvidence(artifactDir, component, viewport, input) {
  const previewScreenshot =
    component === "hero-banner" && viewport === "desktop" && input.previewOverride
      ? input.previewOverride
      : `${artifactDir}/page-builder-visual-fixture-${component}-${viewport}.png`;

  return {
    designReference: null,
    maxColorDeltaE: null,
    maxLayoutDeltaPx: null,
    previewScreenshot,
    status: "needs-evidence",
    visualMatchPercent: null,
  };
}

function createScreenshotEntries(artifactDir) {
  return mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map((viewport) => ({
      bytes: pngBytes.length,
      component,
      evidencePath: `${artifactDir}/page-builder-visual-fixture-${component}-${viewport}.png`,
      viewport,
    })),
  );
}

function createManifestUpdate(artifactDir, screenshots) {
  return {
    manifestPath: `${artifactDir}/page-builder-visual-acceptance.json`,
    updated: true,
    updates: screenshots.map((screenshot) => ({
      component: screenshot.component,
      previewScreenshot: screenshot.evidencePath,
      viewport: screenshot.viewport,
    })),
  };
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writePng(filePath) {
  writeFileSync(filePath, pngBytes);
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
