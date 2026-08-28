import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";
import {
  compareVisualImages,
  decodePngImage,
  formatPageBuilderVisualMeasureReport,
  measurePageBuilderVisualAcceptanceManifest,
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  readPageBuilderVisualMeasureCliConfig,
} from "./page-builder-visual-measure.mjs";

test("visual measure config parses selected write modes", () => {
  assert.deepEqual(
    readPageBuilderVisualMeasureCliConfig([
      "--",
      "--manifest",
      "docs/visual.json",
      "--component",
      "hero-banner,faq",
      "--viewport",
      "mobile",
      "--write",
      "--require-complete",
    ]),
    {
      acceptPassing: false,
      components: ["hero-banner", "faq"],
      manifestPath: "docs/visual.json",
      requireComplete: true,
      viewports: ["mobile"],
      write: true,
    },
  );

  assert.equal(
    readPageBuilderVisualMeasureCliConfig(["--accept-passing"]).write,
    true,
  );
  assert.throws(
    () => readPageBuilderVisualMeasureCliConfig(["--component", "product-card"]),
    /Unknown visual measure component/,
  );
});

test("PNG reader decodes 8-bit RGBA images", () => {
  const image = decodePngImage(
    createTestPng(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 255, 128],
    ]),
  );

  assert.equal(image.width, 2);
  assert.equal(image.height, 1);
  assert.deepEqual([...image.pixels], [
    255, 0, 0, 255, 0, 0, 255, 128,
  ]);
});

test("PNG reader rejects incomplete image data", () => {
  assert.throws(
    () => decodePngImage(createIncompleteTestPng()),
    /incomplete PNG image data/,
  );
});

test("visual metrics compare identical and changed pixels", () => {
  const reference = decodePngImage(
    createTestPng(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ]),
  );
  const same = compareVisualImages(reference, reference);
  const changed = compareVisualImages(
    reference,
    decodePngImage(
      createTestPng(2, 1, [
        [255, 0, 0, 255],
        [0, 255, 0, 255],
      ]),
    ),
  );

  assert.equal(same.visualMatchPercent, 100);
  assert.equal(same.maxColorDeltaE, 0);
  assert.equal(same.maxLayoutDeltaPx, 0);
  assert.equal(changed.visualMatchPercent, 50);
  assert.ok(changed.maxColorDeltaE > 100);
});

test("visual metrics record canvas dimension deltas", () => {
  const reference = decodePngImage(createTestPng(2, 1, [[0, 0, 0, 255]]));
  const preview = decodePngImage(createTestPng(1, 1, [[0, 0, 0, 255]]));
  const metrics = compareVisualImages(reference, preview);

  assert.equal(metrics.maxLayoutDeltaPx, 1);
  assert.equal(metrics.changedPixels, 1);
  assert.equal(metrics.visualMatchPercent, 50);
});

test("visual measure reports missing references without failing collection", () => {
  const manifest = createMeasureManifest();
  const config = readPageBuilderVisualMeasureCliConfig([
    "--component",
    "hero-banner",
    "--viewport",
    "desktop",
  ]);
  const result = measurePageBuilderVisualAcceptanceManifest(manifest, config);

  assert.equal(result.status, "needs-evidence");
  assert.equal(result.measuredViewportCount, 0);
  assert.equal(result.missingViewportCount, 1);
  assert.equal(result.issues.length, 0);
});

test("visual measure can require complete selected evidence", () => {
  const manifest = createMeasureManifest();
  const config = readPageBuilderVisualMeasureCliConfig([
    "--component",
    "hero-banner",
    "--viewport",
    "desktop",
    "--require-complete",
  ]);
  const result = measurePageBuilderVisualAcceptanceManifest(manifest, config);

  assert.equal(result.status, "invalid");
  assert.equal(result.issues[0].code, "visual_measure_incomplete");
});

test("visual measure computes and writes passing manifest metrics", () => {
  const evidenceRoot = mkdtempSync(path.join(tmpdir(), "visual-measure-"));
  const manifest = createMeasureManifest({
    designReference: "docs/design/hero-desktop.png",
    previewScreenshot: "artifacts/visual/hero-desktop.png",
  });
  writeTestPng(evidenceRoot, manifest.records[0].viewports.desktop.designReference);
  writeTestPng(evidenceRoot, manifest.records[0].viewports.desktop.previewScreenshot);

  const config = readPageBuilderVisualMeasureCliConfig([
    "--component",
    "hero-banner",
    "--viewport",
    "desktop",
    "--accept-passing",
  ]);
  const result = measurePageBuilderVisualAcceptanceManifest(manifest, config, {
    evidenceRoot,
  });

  assert.equal(result.status, "measured");
  assert.equal(result.measuredViewportCount, 1);
  assert.equal(result.measurements[0].passing, true);
  assert.equal(manifest.records[0].viewports.desktop.visualMatchPercent, 100);
  assert.equal(manifest.records[0].viewports.desktop.maxLayoutDeltaPx, 0);
  assert.equal(manifest.records[0].viewports.desktop.maxColorDeltaE, 0);
  assert.equal(manifest.records[0].viewports.desktop.status, "accepted");
  assert.equal(manifest.records[0].status, "needs-evidence");
});

test("visual measure reports unreadable PNG evidence as invalid", () => {
  const evidenceRoot = mkdtempSync(path.join(tmpdir(), "visual-measure-bad-"));
  const manifest = createMeasureManifest({
    designReference: "docs/design/hero-desktop.png",
    previewScreenshot: "artifacts/visual/hero-desktop.png",
  });
  writeTestPng(evidenceRoot, manifest.records[0].viewports.desktop.designReference);
  writeFixtureFile(
    evidenceRoot,
    manifest.records[0].viewports.desktop.previewScreenshot,
    Buffer.from("not-png"),
  );

  const result = measurePageBuilderVisualAcceptanceManifest(
    manifest,
    readPageBuilderVisualMeasureCliConfig([
      "--component",
      "hero-banner",
      "--viewport",
      "desktop",
    ]),
    { evidenceRoot },
  );

  assert.equal(result.status, "invalid");
  assert.equal(result.issues[0].code, "visual_measure_failed");
  assert.match(result.issues[0].message, /not a PNG image/);
});

test("visual measure report summarizes measured and missing evidence", () => {
  const lines = formatPageBuilderVisualMeasureReport({
    failedViewportCount: 0,
    issues: [],
    measuredViewportCount: 1,
    measurements: [
      {
        component: "hero-banner",
        maxColorDeltaE: 0,
        maxLayoutDeltaPx: 0,
        visualMatchPercent: 100,
        viewport: "desktop",
      },
    ],
    missingViewportCount: 11,
    status: "needs-evidence",
    targetViewportCount: 12,
  });

  assert.match(lines.join("\n"), /Measured viewport evidence: 1\/12/);
  assert.match(lines.join("\n"), /hero-banner\.desktop: 100% match/);
});

function createMeasureManifest(input = {}) {
  return {
    records: [
      {
        component: "hero-banner",
        status: "needs-evidence",
        viewports: {
          desktop: {
            designReference: input.designReference ?? null,
            maxColorDeltaE: null,
            maxLayoutDeltaPx: null,
            previewScreenshot: input.previewScreenshot ?? null,
            status: "needs-evidence",
            visualMatchPercent: null,
          },
        },
      },
    ],
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

function writeTestPng(root, relativePath) {
  writeFixtureFile(root, relativePath, createTestPng(1, 1, [[20, 40, 60, 255]]));
}

function writeFixtureFile(root, relativePath, body) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, body);
}

function createTestPng(width, height, pixels) {
  return createPngFromRawRows(width, height, createRawRgbaRows(width, height, pixels));
}

function createIncompleteTestPng() {
  return createPngFromRawRows(2, 1, Buffer.from([0, 255, 0, 0, 255]));
}

function createPngFromRawRows(width, height, rawRows) {
  return Buffer.concat([
    pngSignature,
    createPngChunk(
      "IHDR",
      Buffer.from([
        ...uint32be(width),
        ...uint32be(height),
        8,
        6,
        0,
        0,
        0,
      ]),
    ),
    createPngChunk("IDAT", deflateSync(rawRows)),
    createPngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createRawRgbaRows(width, height, pixels) {
  const rows = [];
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]));

    for (let x = 0; x < width; x += 1) {
      rows.push(Buffer.from(pixels[offset] ?? [0, 0, 0, 255]));
      offset += 1;
    }
  }

  return Buffer.concat(rows);
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
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});
