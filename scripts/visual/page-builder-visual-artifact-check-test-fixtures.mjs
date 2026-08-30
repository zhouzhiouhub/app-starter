import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
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
import { createPageBuilderVisualReferenceImportArtifact } from "./page-builder-visual-reference-import.mjs";

export const corruptPngBytes = Buffer.concat([
  createPngSignature(),
  Buffer.from([0x00]),
]);

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

  const acceptanceReport = validatePageBuilderVisualAcceptanceManifest(manifest);
  const acceptanceArtifact = createPageBuilderVisualAcceptanceArtifact(
    acceptanceReport,
    { checklist: acceptanceChecklist },
  );
  const referenceImportArtifact = createPageBuilderVisualReferenceImportArtifact(
    createReferenceImportReport(artifactDir),
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
      createReferenceImportMarkdown(artifactDir),
  );
}

export function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

export function hasIssue(report, code) {
  return report.issues.some((issue) => issue.code === code);
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
    complete: false,
    manifestPath: `${artifactDir}/page-builder-visual-acceptance.json`,
    missing, missingCount: missing.length,
    sourceDir: "docs/visual/page-builder-references",
    sourceDirStatus: "ready",
    status: "invalid",
    updated: false, updateCount: 0,
    updates: [],
  };
}

function createReferenceImportMarkdown(artifactDir) {
  return [
    "# Page Builder Visual Reference Import",
    "",
    "Status: `invalid`",
    `Manifest: \`${artifactDir}/page-builder-visual-acceptance.json\``,
    "Source dir: `docs/visual/page-builder-references`",
    "Source dir status: `ready`",
    "References updated: 0",
    "Missing references: 12",
    "",
  ].join("\n");
}

function createReferenceMissingEntries() {
  return mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map((viewport) => ({
      component, reason: `${component}-${viewport}.png is missing`, viewport,
    })),
  );
}

function createScreenshotPng(viewport) {
  return createTestPng(
    pageBuilderVisualCaptureViewportWidths[viewport],
    pageBuilderVisualCaptureDefaultHeight,
  );
}

export function createTestPng(width, height) {
  return Buffer.concat([
    createPngSignature(),
    createPngChunk(
      "IHDR",
      Buffer.from([...uint32be(width), ...uint32be(height), 8, 6, 0, 0, 0]),
    ),
    createPngChunk("IDAT", deflateSync(createRawRgbaRows(width, height))),
    createPngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createRawRgbaRows(width, height) {
  return Buffer.alloc((width * 4 + 1) * height);
}

function createPngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");

  return Buffer.concat([
    Buffer.from(uint32be(data.length)),
    typeBuffer,
    data,
    Buffer.from(uint32be(calculateCrc32(Buffer.concat([typeBuffer, data])))),
  ]);
}

function uint32be(value) {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function calculateCrc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createPngSignature() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});
