import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  createPageBuilderVisualAcceptanceArtifact,
  createPageBuilderVisualAcceptanceChecklist,
  createPageBuilderVisualAcceptanceMarkdown,
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
  validatePageBuilderVisualAcceptanceManifest,
} from "./page-builder-visual-acceptance.mjs";
import {
  createPageBuilderVisualCaptureArtifact,
  pageBuilderVisualCaptureDefaultHeight,
  pageBuilderVisualCaptureViewportWidths,
} from "./page-builder-visual-capture.mjs";
import {
  createPageBuilderVisualReferenceImportArtifact,
  createPageBuilderVisualReferenceImportMarkdown,
} from "./page-builder-visual-reference-import.mjs";
export { corruptPngBytes, createTestPng } from "./png-test-fixtures.mjs";
import { createTestPng } from "./png-test-fixtures.mjs";

export function createArtifactDir(label) {
  const artifactDir = `reports/visual/artifact-check-${label}-${process.pid}-${Date.now()}`;

  rmSync(artifactDir, { force: true, recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  return artifactDir;
}

export function writeVisualArtifact(artifactDir, input = {}) {
  const manifest = createVisualManifest(artifactDir, input);
  const screenshotFiles = createScreenshotEntries(artifactDir, input);
  const screenshots = screenshotFiles.map(createCaptureScreenshotEntry);
  const manifestPath = `${artifactDir}/page-builder-visual-acceptance.json`;
  const acceptanceChecklist = createPageBuilderVisualAcceptanceChecklist(
    manifest,
    { manifestPath },
  );

  for (const screenshot of screenshotFiles) {
    writePng(screenshot.evidencePath, screenshot.body);
  }

  const acceptanceReport =
    validatePageBuilderVisualAcceptanceManifest(manifest);
  const acceptanceArtifact = createPageBuilderVisualAcceptanceArtifact(
    acceptanceReport,
    { checklist: acceptanceChecklist },
  );
  const referenceImportReport = createReferenceImportReport(artifactDir);
  const referenceImportArtifact =
    createPageBuilderVisualReferenceImportArtifact(referenceImportReport);
  const captureArtifact = createPageBuilderVisualCaptureArtifact({
    baseUrl: "http://localhost:3000",
    browserPath: "google-chrome",
    buildSkipped: false,
    manifestUpdate: createManifestUpdate(artifactDir, screenshots),
    outputDir: artifactDir,
    screenshots,
    webPort: 3000,
  });

  writeJson(manifestPath, manifest);
  writeJson(`${artifactDir}/visual-acceptance-report.json`, acceptanceArtifact);
  writeJson(`${artifactDir}/visual-capture-report.json`, captureArtifact);
  writeJson(
    `${artifactDir}/visual-reference-import-report.json`,
    input.referenceImportReport ?? referenceImportArtifact,
  );
  writeText(
    `${artifactDir}/visual-acceptance-report.md`,
    input.acceptanceMarkdown ??
      createPageBuilderVisualAcceptanceMarkdown(
        acceptanceReport,
        acceptanceChecklist,
        { manifestPath },
      ),
  );
  writeText(
    `${artifactDir}/visual-reference-import-report.md`,
    input.referenceImportMarkdown ??
      createPageBuilderVisualReferenceImportMarkdown(referenceImportReport),
  );
}

export function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

export function hasIssue(report, code) {
  return report.issues.some((issue) => issue.code === code);
}

export function createReferenceImportSummary(artifactDir) {
  return {
    complete: false,
    manifestPath: `${artifactDir}/page-builder-visual-acceptance.json`,
    missingCount: 12,
    missingReferences: createReferenceMissingReferencePaths(),
    requiredReferenceCount: 12,
    requiredReferenceEntryCount: 12,
    requiredReferenceStatusCounts: {
      invalid: 0,
      missing: 12,
      ready: 0,
      updated: 0,
      wouldUpdate: 0,
    },
    sourceDir: "docs/visual/page-builder-references",
    sourceDirStatus: "ready",
    status: "invalid",
    updated: false,
    updateCount: 0,
  };
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
    component === "hero-banner" &&
    viewport === "desktop" &&
    input.previewOverride
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

function createScreenshotEntries(artifactDir, input) {
  return mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map((viewport) =>
      createScreenshotEntry(artifactDir, component, viewport, input),
    ),
  );
}

function createScreenshotEntry(artifactDir, component, viewport, input) {
  const body = readScreenshotBody(component, viewport, input);

  return {
    body,
    bytes: body.length,
    component,
    evidencePath: `${artifactDir}/page-builder-visual-fixture-${component}-${viewport}.png`,
    viewport,
  };
}

function createCaptureScreenshotEntry(screenshot) {
  return {
    bytes: screenshot.bytes,
    component: screenshot.component,
    evidencePath: screenshot.evidencePath,
    viewport: screenshot.viewport,
  };
}

function readScreenshotBody(component, viewport, input) {
  const override = input.screenshotOverride;

  if (override?.component === component && override?.viewport === viewport) {
    return override.body;
  }

  return createScreenshotPng(viewport);
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

function writePng(filePath, body) {
  writeFileSync(filePath, body);
}

function writeText(filePath, value) {
  writeFileSync(filePath, value);
}

function createReferenceImportReport(artifactDir) {
  const missing = createReferenceMissingEntries();
  return {
    ...createReferenceImportSummary(artifactDir),
    missing,
    missingCount: missing.length,
    updates: [],
  };
}

function createReferenceMissingEntries() {
  return mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map((viewport) => ({
      component,
      expectedPath: `docs/visual/page-builder-references/${component}-${viewport}.png`,
      reason: `${component}-${viewport}.png is missing`,
      viewport,
    })),
  );
}

function createReferenceMissingReferencePaths() {
  return mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map(
      (viewport) =>
        `docs/visual/page-builder-references/${component}-${viewport}.png`,
    ),
  );
}

function createScreenshotPng(viewport) {
  return createTestPng(
    pageBuilderVisualCaptureViewportWidths[viewport],
    pageBuilderVisualCaptureDefaultHeight,
  );
}
