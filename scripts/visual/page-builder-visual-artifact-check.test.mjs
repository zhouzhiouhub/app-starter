import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { deflateSync } from "node:zlib";
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
} from "./page-builder-visual-artifact-check.mjs";
import {
  createPageBuilderVisualCaptureArtifact,
  pageBuilderVisualCaptureDefaultHeight,
  pageBuilderVisualCaptureViewportWidths,
} from "./page-builder-visual-capture.mjs";

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

test("visual artifact check rejects corrupt screenshot PNGs", () => {
  const artifactDir = createArtifactDir("corrupt");

  try {
    writeVisualArtifact(artifactDir, {
      screenshotOverride: {
        body: corruptPngBytes,
        component: "hero-banner",
        viewport: "desktop",
      },
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(report.presentScreenshotCount, 11);
    assert.equal(hasIssue(report, "invalid_screenshot_file"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects screenshot dimension drift", () => {
  const artifactDir = createArtifactDir("dimensions");

  try {
    writeVisualArtifact(artifactDir, {
      screenshotOverride: {
        body: createTestPng(800, 600),
        component: "hero-banner",
        viewport: "desktop",
      },
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(report.presentScreenshotCount, 11);
    assert.equal(hasIssue(report, "screenshot_dimensions_mismatch"), true);
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
  assert.match(ciWorkflow, /pnpm visual:artifact-bundle -- --help/);
  assert.match(
    pageBuilderWorkflow,
    /pnpm visual:artifact-bundle -- --artifact-dir reports\/visual\/page-builder-fixture/,
  );
  assert.match(
    productionSmokeWorkflow,
    /pnpm visual:artifact-check -- --artifact-dir reports\/visual\/page-builder-fixture --markdown-output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.md/,
  );
  assert.match(
    pageBuilderWorkflow,
    /visual-artifact-check-report\.md/,
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
  const screenshotFiles = createScreenshotEntries(artifactDir, input);
  const screenshots = screenshotFiles.map(createCaptureScreenshotEntry);

  for (const screenshot of screenshotFiles) {
    writePng(screenshot.evidencePath, screenshot.body);
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

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function hasIssue(report, code) {
  return report.issues.some((issue) => issue.code === code);
}

function createScreenshotPng(viewport) {
  return createTestPng(
    pageBuilderVisualCaptureViewportWidths[viewport],
    pageBuilderVisualCaptureDefaultHeight,
  );
}

function createTestPng(width, height) {
  return Buffer.concat([
    pngSignature,
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

const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const corruptPngBytes = Buffer.concat([pngSignature, Buffer.from([0x00])]);
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});
