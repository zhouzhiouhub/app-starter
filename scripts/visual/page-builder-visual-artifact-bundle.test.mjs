import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import {
  formatPageBuilderVisualArtifactBundleReport,
  formatPageBuilderVisualArtifactBundleUsage,
  readPageBuilderVisualArtifactBundleCliConfig,
  readPageBuilderVisualArtifactBundleExitCode,
  runPageBuilderVisualArtifactBundle,
} from "./page-builder-visual-artifact-bundle.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";

test("visual artifact bundle config derives fixed artifact paths", () => {
  const config = readPageBuilderVisualArtifactBundleCliConfig(
    [
      "--",
      "--artifact-dir",
      "reports/visual/page-builder-fixture",
      "--source-manifest",
      "docs/development/page-builder-visual-acceptance.json",
      "--skip-build",
      "--base-url",
      "http://127.0.0.1:3010",
      "--timeout-ms",
      "45000",
    ],
    { PAGE_BUILDER_VISUAL_BROWSER: "chrome" },
  );

  assert.equal(config.artifactDir, "reports/visual/page-builder-fixture");
  assert.equal(
    config.paths.manifest,
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  );
  assert.equal(
    config.paths.captureReport,
    "reports/visual/page-builder-fixture/visual-capture-report.json",
  );
  assert.equal(
    config.paths.acceptanceReport,
    "reports/visual/page-builder-fixture/visual-acceptance-report.json",
  );
  assert.equal(
    config.paths.artifactCheckMarkdown,
    "reports/visual/page-builder-fixture/visual-artifact-check-report.md",
  );
  assert.equal(
    config.paths.acceptanceMarkdown,
    "reports/visual/page-builder-fixture/visual-acceptance-report.md",
  );
  assert.equal(
    config.paths.referenceImportMarkdown,
    "reports/visual/page-builder-fixture/visual-reference-import-report.md",
  );
  assert.deepEqual(config.referenceImport, {
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    markdownOutputPath:
      "reports/visual/page-builder-fixture/visual-reference-import-report.md",
    requireComplete: true,
    sourceDir: "docs/visual/page-builder-references",
    write: false,
  });
  assert.equal(config.fixtureCapture.skipBuild, true);
  assert.equal(config.fixtureCapture.webPort, 3010);
  assert.equal(config.fixtureCapture.capture.browserPath, "chrome");
  assert.equal(config.fixtureCapture.capture.timeoutMs, 45000);
  assert.equal(config.fixtureCapture.capture.writeManifest, true);
});

test("visual artifact bundle rejects partial capture options", () => {
  assert.throws(
    () =>
      readPageBuilderVisualArtifactBundleCliConfig([
        "--component",
        "hero-banner",
      ]),
    /managed by visual:artifact-bundle/,
  );
  assert.throws(
    () =>
      readPageBuilderVisualArtifactBundleCliConfig([
        "--artifact-dir",
        "tmp/page-builder-fixture",
      ]),
    /must live under artifacts\/visual or reports\/visual/,
  );
});

test("visual artifact bundle writes capture and acceptance reports", async () => {
  const root = `reports/visual/artifact-bundle-${process.pid}-${Date.now()}`;
  const sourceManifestPath = `${root}/source/page-builder-visual-acceptance.json`;
  const artifactDir = `${root}/bundle`;

  rmSync(root, { force: true, recursive: true });
  mkdirSync(`${root}/source`, { recursive: true });
  writeJson(sourceManifestPath, createVisualManifest());

  try {
    const config = readPageBuilderVisualArtifactBundleCliConfig([
      "--artifact-dir",
      artifactDir,
      "--source-manifest",
      sourceManifestPath,
      "--skip-build",
    ]);
    const result = await runPageBuilderVisualArtifactBundle(config, {
      capture: async (captureConfig) =>
        createCaptureResult(captureConfig, config.paths.manifest),
      checkArtifact: () => createCompleteArtifactCheck(artifactDir),
      importReferences: (referenceConfig) =>
        createReferenceImportReport(referenceConfig),
      generatedAt: "2026-08-29T00:00:00.000Z",
    });

    const captureReport = readJson(config.paths.captureReport);
    const acceptanceReport = readJson(config.paths.acceptanceReport);
    const acceptanceMarkdown = readFileSync(
      config.paths.acceptanceMarkdown,
      "utf8",
    );
    const artifactCheckMarkdown = readFileSync(
      config.paths.artifactCheckMarkdown,
      "utf8",
    );
    const referenceImportMarkdown = readFileSync(
      config.paths.referenceImportMarkdown,
      "utf8",
    );

    assert.equal(result.capture.screenshots.length, 12);
    assert.equal(result.referenceImport.status, "invalid");
    assert.equal(result.referenceImport.missing.length, 12);
    assert.equal(result.measure.status, "needs-evidence");
    assert.equal(result.acceptance.status, "needs-evidence");
    assert.equal(result.artifactCheck.status, "complete");
    assert.equal(readPageBuilderVisualArtifactBundleExitCode(result), 0);
    assert.equal(captureReport.schemaVersion, "page-builder-visual-capture.v1");
    assert.equal(captureReport.screenshotCount, 12);
    assert.equal(acceptanceReport.schemaVersion, pageBuilderVisualAcceptanceSchemaVersion);
    assert.equal(acceptanceReport.checklist.pendingViewportCount, 12);
    assert.match(acceptanceMarkdown, /^# Page Builder Visual Acceptance/m);
    assert.match(acceptanceMarkdown, /hero-banner/);
    assert.match(
      referenceImportMarkdown,
      /^# Page Builder Visual Reference Import/m,
    );
    assert.match(referenceImportMarkdown, /Missing references: 12/);
    assert.match(
      artifactCheckMarkdown,
      /^# Page Builder Visual Artifact Check/m,
    );
    assert.match(artifactCheckMarkdown, /Status: `complete`/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("visual artifact bundle report and usage describe the generated bundle", () => {
  const report = formatPageBuilderVisualArtifactBundleReport({
    acceptance: {
      acceptedComponentCount: 0,
      acceptedViewportCount: 0,
      componentCount: 6,
      issues: [],
      status: "needs-evidence",
      viewportCount: 12,
    },
    artifactCheck: createCompleteArtifactCheck("reports/visual/page-builder"),
    artifactDir: "reports/visual/page-builder",
    capture: { screenshots: new Array(12).fill({}) },
    measure: {
      issues: [],
      measuredViewportCount: 0,
      missingViewportCount: 12,
      status: "needs-evidence",
      targetViewportCount: 12,
    },
    paths: {
      artifactCheckMarkdown:
        "reports/visual/page-builder/visual-artifact-check-report.md",
      acceptanceReport: "reports/visual/page-builder/visual-acceptance-report.json",
      captureReport: "reports/visual/page-builder/visual-capture-report.json",
      acceptanceMarkdown: "reports/visual/page-builder/visual-acceptance-report.md",
      manifest: "reports/visual/page-builder/page-builder-visual-acceptance.json",
      referenceImportMarkdown:
        "reports/visual/page-builder/visual-reference-import-report.md",
    },
    referenceImport: {
      manifestPath: "reports/visual/page-builder/page-builder-visual-acceptance.json",
      missing: new Array(12).fill({}),
      sourceDir: "docs/visual/page-builder-references",
      status: "invalid",
      updated: false,
      updates: [],
    },
    sourceManifestPath: "docs/development/page-builder-visual-acceptance.json",
  }).join("\n");
  const usage = formatPageBuilderVisualArtifactBundleUsage().join("\n");

  assert.match(report, /Page Builder visual artifact bundle/);
  assert.match(report, /Artifact check: complete/);
  assert.match(report, /Reference import Markdown: reports\/visual\/page-builder\/visual-reference-import-report\.md/);
  assert.match(report, /Reference import: invalid \(0 updates, 12 missing\)/);
  assert.match(report, /Acceptance Markdown: reports\/visual\/page-builder\/visual-acceptance-report\.md/);
  assert.match(report, /Artifact check Markdown: reports\/visual\/page-builder\/visual-artifact-check-report\.md/);
  assert.match(report, /Next:/);
  assert.match(report, /Attach real design references under docs\/visual\/page-builder-references/);
  assert.match(report, /visual:references -- --source-dir docs\/visual\/page-builder-references --manifest reports\/visual\/page-builder\/page-builder-visual-acceptance\.json --write --require-complete/);
  assert.match(report, /visual:capture:fixture -- --manifest reports\/visual\/page-builder\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder --report reports\/visual\/page-builder\/visual-capture-report\.json --write-manifest/);
  assert.match(report, /visual:measure -- --manifest reports\/visual\/page-builder\/page-builder-visual-acceptance\.json --write --require-complete/);
  assert.match(report, /visual:measure -- --manifest reports\/visual\/page-builder\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete/);
  assert.match(report, /visual:acceptance -- --require-accepted reports\/visual\/page-builder\/page-builder-visual-acceptance\.json/);
  assert.match(usage, /pnpm visual:artifact-bundle/);
  assert.match(usage, /--source-manifest/);
});

function createCaptureResult(captureConfig, manifestPath) {
  const manifest = readJson(manifestPath);
  const screenshots = [];

  for (const record of manifest.records) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      const evidencePath =
        `${captureConfig.capture.outputDir}/page-builder-visual-fixture-${record.component}-${viewport}.png`;

      record.viewports[viewport].previewScreenshot = evidencePath;
      writeFileSync(evidencePath, "screenshot");
      screenshots.push({
        bytes: 10,
        component: record.component,
        evidencePath,
        viewport,
      });
    }
  }

  writeJson(manifestPath, manifest);

  return {
    baseUrl: captureConfig.capture.baseUrl,
    browserPath: "chrome",
    buildSkipped: captureConfig.skipBuild,
    manifestUpdate: {
      manifestPath,
      updateCount: screenshots.length,
      updated: true,
      updates: screenshots.map((screenshot) => ({
        component: screenshot.component,
        previewScreenshot: screenshot.evidencePath,
        viewport: screenshot.viewport,
      })),
    },
    outputDir: captureConfig.capture.outputDir,
    screenshots,
    webPort: captureConfig.webPort,
  };
}

function createCompleteArtifactCheck(artifactDir) {
  return {
    artifactDir,
    expectedScreenshotCount: 12,
    issues: [],
    presentRequiredFileCount: 5,
    presentScreenshotCount: 12,
    requiredFileCount: 5,
    status: "complete",
  };
}

function createReferenceImportReport(config) {
  return {
    complete: false,
    manifestPath: config.manifestPath,
    missing: mvpPageBuilderComponents.flatMap((component) =>
      pageBuilderVisualAcceptanceViewports.map((viewport) => ({
        component,
        reason: `${component}-${viewport}.png is missing`,
        viewport,
      })),
    ),
    sourceDir: config.sourceDir,
    status: "invalid",
    updated: false,
    updates: [],
  };
}

function createVisualManifest() {
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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
