import assert from "node:assert/strict";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { runPageBuilderVisualReferenceRequestCli } from "../page-builder-visual-reference-request.mjs";
import { createTestPng } from "./page-builder-visual-artifact-check-test-fixtures.mjs";
import {
  createPageBuilderVisualReferenceRequestMarkdown,
  readPageBuilderVisualReferenceRequestCliConfig,
} from "./page-builder-visual-reference-request.mjs";
import {
  pageBuilderVisualCaptureDefaultHeight,
  pageBuilderVisualCaptureViewportWidths,
} from "./page-builder-visual-capture-constants.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";

test("visual reference request Markdown is design-facing", () => {
  const markdown = createPageBuilderVisualReferenceRequestMarkdown({
    complete: false,
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    missingOutputPath: "artifacts/visual/page-builder-missing-references.txt",
    tableOutputPath: "artifacts/visual/page-builder-reference-export-table.tsv",
    requiredReferences: [
      {
        component: "hero-banner",
        expectedPath: "docs/visual/page-builder-references/hero-banner-desktop.png",
        previewScreenshot: {
          height: 1000,
          path: "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png",
          width: 1440,
        },
        status: "missing",
        viewport: "desktop",
      },
      {
        component: "faq",
        expectedPath: "docs/visual/page-builder-references/faq-mobile.png",
        status: "ready",
        viewport: "mobile",
      },
    ],
    sourceDir: "docs/visual/page-builder-references",
    status: "needs-evidence",
  });

  assert.match(markdown, /^# Page Builder Design Reference Request/m);
  assert.match(markdown, /Missing references: 1\/2/);
  assert.match(
    markdown,
    /First missing reference: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    markdown,
    /Missing path output: `artifacts\/visual\/page-builder-missing-references\.txt`/,
  );
  assert.match(
    markdown,
    /Export table output: `artifacts\/visual\/page-builder-reference-export-table\.tsv`/,
  );
  assert.match(markdown, /Export real PNGs from the approved design source/);
  assert.match(markdown, /matching preview viewport size shown as reference size/);
  assert.match(markdown, /## Reference PNG Dimensions/);
  assert.match(
    markdown,
    /hero-banner\.desktop: reference size 1440x1000; `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    markdown,
    /faq\.mobile: reference size unknown; `docs\/visual\/page-builder-references\/faq-mobile\.png`/,
  );
  assert.match(
    markdown,
    /hero-banner\.desktop; missing; reference size 1440x1000; preview `reports\/visual\/page-builder-fixture\/page-builder-visual-fixture-hero-banner-desktop\.png` \(1440x1000\)/,
  );
  assert.match(markdown, /faq\.mobile; ready; reference size unknown/);
  assert.match(markdown, /pnpm visual:references:check/);
  assert.match(markdown, /pnpm visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete/);
  assert.match(markdown, /pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete/);
  assert.match(markdown, /pnpm visual:acceptance -- --require-accepted reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/);
  assert(
    markdown.indexOf("pnpm visual:references:check") <
      markdown.indexOf(
        "pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete",
      ),
    "reference request should run the read-only intake check before writing the manifest",
  );
});

test("visual reference request CLI writes a Markdown handoff", async () => {
  const root = `reports/visual/reference-request-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const sourceDir = `${root}/references`;
  const outputPath = `${root}/page-builder-reference-request.md`;
  const missingOutputPath = `${root}/page-builder-missing-references.txt`;
  const tableOutputPath = `${root}/page-builder-reference-export-table.tsv`;
  const stdout = [];

  try {
    writeReferenceFiles(sourceDir, { skip: "spec-table-mobile.png" });
    writePreviewScreenshotFiles(root);
    writeFileSync(
      manifestPath,
      `${JSON.stringify(createManifest({ previewRoot: root }), null, 2)}\n`,
    );

    const exitCode = await runPageBuilderVisualReferenceRequestCli(
      [
        "--source-dir",
        sourceDir,
        "--manifest",
        manifestPath,
        "--output",
        outputPath,
        "--missing-output",
        missingOutputPath,
        "--table-output",
        tableOutputPath,
      ],
      {
        stdout: (line) => stdout.push(line),
      },
    );
    const markdown = readFileSync(outputPath, "utf8");
    const missingPaths = readFileSync(missingOutputPath, "utf8");
    const exportTable = readFileSync(tableOutputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /Visual reference request written:/);
    assert.match(
      stdout.join("\n"),
      /Visual missing reference paths written:/,
    );
    assert.match(
      stdout.join("\n"),
      /Visual reference export table written:/,
    );
    assert.match(stdout.join("\n"), /Missing references: 1\/12/);
    assert.match(
      stdout.join("\n"),
      /First missing reference: reports\/visual\/reference-request-.+\/references\/spec-table-mobile\.png/,
    );
    assert.match(markdown, /spec-table\.mobile; missing/);
    assert.match(markdown, /spec-table\.mobile: reference size 390x1000/);
    assert.equal(missingPaths, `${sourceDir}/spec-table-mobile.png\n`);
    assert.match(
      exportTable,
      /^component\tviewport\tstatus\treference_width\treference_height\texpected_path\tpreview_width\tpreview_height\tpreview_path/m,
    );
    assert.match(
      exportTable,
      new RegExp(
        `spec-table\tmobile\tmissing\t390\t1000\t${escapeRegExp(
          `${sourceDir}/spec-table-mobile.png`,
        )}\t390\t1000\t${escapeRegExp(
          `${root}/artifacts/visual/spec-table-mobile.png`,
        )}`,
      ),
    );
    assert.match(
      markdown,
      new RegExp(`Export table output: \`${escapeRegExp(tableOutputPath)}\``),
    );
    assert.match(
      markdown,
      /First missing reference: `reports\/visual\/reference-request-.+\/references\/spec-table-mobile\.png`/,
    );
    assert.match(markdown, /## After Delivery/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("visual reference request help documents terminal summary fields", async () => {
  const stdout = [];

  const exitCode = await runPageBuilderVisualReferenceRequestCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });
  const help = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.match(
    help,
    /terminal summary and Markdown status\s+report the missing\/required count/i,
  );
  assert.match(help, /first missing reference path/i);
});

test("visual reference request config validates paths", () => {
  assert.deepEqual(
    readPageBuilderVisualReferenceRequestCliConfig([
      "--",
      "--source-dir",
      "docs\\visual\\page-builder-references\\",
      "--manifest",
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      "--output",
      "artifacts/visual/page-builder-reference-request.md",
      "--missing-output",
      "artifacts\\visual\\page-builder-missing-references.txt",
      "--table-output",
      "artifacts\\visual\\page-builder-reference-export-table.tsv",
    ]),
    {
      manifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      missingOutputPath: "artifacts/visual/page-builder-missing-references.txt",
      outputPath: "artifacts/visual/page-builder-reference-request.md",
      sourceDir: "docs/visual/page-builder-references",
      tableOutputPath: "artifacts/visual/page-builder-reference-export-table.tsv",
    },
  );
  assert.throws(
    () =>
      readPageBuilderVisualReferenceRequestCliConfig([
        "--output",
        "request.md",
      ]),
    /Visual reference import Markdown must be under docs\/visual, artifacts\/visual, reports\/visual, tmp\/, or \.tmp\//,
  );
  assert.throws(
    () =>
      readPageBuilderVisualReferenceRequestCliConfig([
        "--missing-output",
        "artifacts/visual/page-builder-missing-references.md",
      ]),
    /Visual reference missing paths output must end with \.txt/,
  );
  assert.throws(
    () =>
      readPageBuilderVisualReferenceRequestCliConfig([
        "--table-output",
        "artifacts/visual/page-builder-reference-export-table.txt",
      ]),
    /Visual reference export table output must end with \.tsv/,
  );
});

test("visual reference request writes an empty missing path list when complete", async () => {
  const root = `reports/visual/reference-request-ready-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const sourceDir = `${root}/references`;
  const outputPath = `${root}/page-builder-reference-request.md`;
  const missingOutputPath = `${root}/page-builder-missing-references.txt`;

  try {
    writeReferenceFiles(sourceDir);
    writeFileSync(manifestPath, `${JSON.stringify(createManifest(), null, 2)}\n`);

    const exitCode = await runPageBuilderVisualReferenceRequestCli(
      [
        "--source-dir",
        sourceDir,
        "--manifest",
        manifestPath,
        "--output",
        outputPath,
        "--missing-output",
        missingOutputPath,
      ],
      {
        stdout: () => {},
      },
    );

    assert.equal(exitCode, 0);
    assert.equal(readFileSync(missingOutputPath, "utf8"), "");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function writeReferenceFiles(sourceDir, options = {}) {
  mkdirSync(sourceDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      const fileName = `${component}-${viewport}.png`;

      if (fileName !== options.skip) {
        writeFileSync(path.join(sourceDir, fileName), createTestPng(2, 1));
      }
    }
  }
}

function writePreviewScreenshotFiles(root) {
  const outputDir = path.join(root, "artifacts/visual");
  mkdirSync(outputDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      writeFileSync(
        path.join(outputDir, `${component}-${viewport}.png`),
        createTestPng(
          pageBuilderVisualCaptureViewportWidths[viewport],
          pageBuilderVisualCaptureDefaultHeight,
        ),
      );
    }
  }
}

function createManifest(input = {}) {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "needs-evidence",
      viewports: Object.fromEntries(
        pageBuilderVisualAcceptanceViewports.map((viewport) => [
          viewport,
          createViewport(component, viewport, input),
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

function createViewport(component, viewport, input) {
  const previewPrefix = input.previewRoot
    ? `${input.previewRoot}/artifacts/visual`
    : "artifacts/visual";

  return {
    designReference: null,
    maxColorDeltaE: null,
    maxLayoutDeltaPx: null,
    previewScreenshot: `${previewPrefix}/${component}-${viewport}.png`,
    status: "needs-evidence",
    visualMatchPercent: null,
  };
}
