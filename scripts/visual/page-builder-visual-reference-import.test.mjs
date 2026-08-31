import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createTestPng } from "./page-builder-visual-artifact-check-test-fixtures.mjs";
import {
  formatPageBuilderVisualReferenceImportReport,
  importPageBuilderVisualReferences,
  normalizeVisualReferenceSourceDir,
  readPageBuilderVisualReferenceImportCliConfig,
} from "./page-builder-visual-reference-import.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";

test("visual reference import config parses safe source dirs", () => {
  assert.deepEqual(
    readPageBuilderVisualReferenceImportCliConfig([
      "--",
      "--source-dir",
      "docs\\visual\\page-builder-references\\",
      "--manifest",
      "reports/visual/manifest.json",
      "--markdown-output",
      "reports/visual/page-builder-fixture/visual-reference-import-report.md",
      "--output",
      "reports/visual/page-builder-fixture/visual-reference-import-report.json",
      "--json",
      "--write",
      "--require-complete",
    ]),
    {
      json: true,
      manifestPath: "reports/visual/manifest.json",
      markdownOutputPath:
        "reports/visual/page-builder-fixture/visual-reference-import-report.md",
      outputPath:
        "reports/visual/page-builder-fixture/visual-reference-import-report.json",
      requireComplete: true,
      sourceDir: "docs/visual/page-builder-references",
      write: true,
    },
  );
  assert.equal(
    readPageBuilderVisualReferenceImportCliConfig([]).sourceDir,
    "docs/visual/page-builder-references",
  );
  assert.equal(
    readPageBuilderVisualReferenceImportCliConfig(["--require-complete"])
      .sourceDir,
    "docs/visual/page-builder-references",
  );
  assert.equal(
    normalizeVisualReferenceSourceDir("./artifacts/visual/references"),
    "artifacts/visual/references",
  );
  assert.equal(
    normalizeVisualReferenceSourceDir(
      String.raw`docs\\visual\\page-builder-references\\`,
    ),
    "docs/visual/page-builder-references",
  );
  assert.throws(
    () => normalizeVisualReferenceSourceDir("../visual"),
    /safe relative directory/,
  );
  assert.throws(
    () => normalizeVisualReferenceSourceDir("tmp/visual"),
    /safe relative directory/,
  );
  assert.throws(
    () =>
      readPageBuilderVisualReferenceImportCliConfig([
        "--source-dir",
        "docs/visual/page-builder-references",
        "--markdown-output",
        "reports/visual/reference-import.json",
      ]),
    /Visual reference import Markdown must end with \.md/,
  );
  assert.throws(
    () =>
      readPageBuilderVisualReferenceImportCliConfig([
        "--source-dir",
        "docs/visual/page-builder-references",
        "--output",
        "docs/visual/reference-import.json",
      ]),
    /Visual reference import output must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
});

test("visual reference import previews complete manifest updates", () => {
  const root = createFixtureRoot();
  const manifest = createManifest({ accepted: true });
  writeReferenceFiles(root);
  writePreviewScreenshotFiles(root);
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

  assert.equal(report.status, "would-update");
  assert.equal(report.updates.length, 12);
  assert.equal(report.missing.length, 0);
  assert.deepEqual(report.updates[0].previewScreenshot, {
    height: 2,
    path: "artifacts/visual/hero-banner-desktop.png",
    width: 3,
  });
  assert.equal(
    manifest.records[0].viewports.desktop.designReference,
    "docs/old/hero-banner-desktop.png",
  );
  assert.match(lines, /References updated: 12/);
  assert.match(
    lines,
    /hero-banner\.desktop: docs\/visual\/page-builder-references\/hero-banner-desktop\.png; preview artifacts\/visual\/hero-banner-desktop\.png \(3x2\)/,
  );
  assert.match(lines, /Next: rerun pnpm visual:references/);
  assert.match(lines, /--write --require-complete/);
});

test("visual reference import writes references and resets stale metrics", () => {
  const root = createFixtureRoot();
  const manifest = createManifest({ accepted: true });
  const manifestPath = path.join(
    root,
    "docs/development/page-builder-visual-acceptance.json",
  );
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeReferenceFiles(root);

  const report = importPageBuilderVisualReferences(
    {
      manifestPath,
      requireComplete: true,
      sourceDir: "docs/visual/page-builder-references",
      write: true,
    },
    { cwd: root },
  );
  const updated = JSON.parse(readFileSync(manifestPath, "utf8"));
  const viewport = updated.records[0].viewports.desktop;

  assert.equal(report.status, "updated");
  assert.equal(
    viewport.designReference,
    "docs/visual/page-builder-references/hero-banner-desktop.png",
  );
  assert.equal(viewport.status, "needs-evidence");
  assert.equal(viewport.visualMatchPercent, null);
  assert.equal(viewport.maxLayoutDeltaPx, null);
  assert.equal(viewport.maxColorDeltaE, null);
  assert.equal(updated.records[0].status, "needs-evidence");
});

test("visual reference import reports missing required files", () => {
  const root = createFixtureRoot();
  const manifest = createManifest({ accepted: false });
  writeReferenceFiles(root, { skip: "faq-mobile.png" });
  writePreviewScreenshotFiles(root);
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
    component: "faq",
    expectedPath: "docs/visual/page-builder-references/faq-mobile.png",
    previewScreenshot: {
      height: 2,
      path: "artifacts/visual/faq-mobile.png",
      width: 3,
    },
    reason: "faq-mobile.png is missing",
    viewport: "mobile",
  });
  assert.match(
    lines,
    /faq\.mobile: faq-mobile\.png is missing; expected docs\/visual\/page-builder-references\/faq-mobile\.png; preview artifacts\/visual\/faq-mobile\.png \(3x2\)/,
  );
  assert.match(lines, /Next: add the missing real design reference PNGs/);
  assert.match(lines, /Next: rerun pnpm visual:references/);
  assert.match(lines, /--write --require-complete/);
});

test("visual reference import reports missing source directory", () => {
  const root = createFixtureRoot();
  const manifest = createManifest({ accepted: false });
  writePreviewScreenshotFiles(root);
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
  assert.equal(report.sourceDirStatus, "missing");
  assert.equal(report.missing.length, 12);
  assert.deepEqual(report.missing[0], {
    component: "hero-banner",
    expectedPath: "docs/visual/page-builder-references/hero-banner-desktop.png",
    previewScreenshot: {
      height: 2,
      path: "artifacts/visual/hero-banner-desktop.png",
      width: 3,
    },
    reason: "source dir is missing",
    viewport: "desktop",
  });
  assert.match(lines, /Source dir status: missing/);
  assert.match(
    lines,
    /hero-banner\.desktop: source dir is missing; expected docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
  );
  assert.match(lines, /preview artifacts\/visual\/hero-banner-desktop\.png \(3x2\)/);
});

test("visual reference import command is exposed in docs", () => {
  const packageJson = readFileSync("package.json", "utf8");
  const readme = readFileSync("README.md", "utf8");
  const cli = readFileSync(
    "scripts/page-builder-visual-import-references.mjs",
    "utf8",
  );
  const acceptanceDoc = readFileSync(
    "docs/development/page-builder-visual-acceptance.md",
    "utf8",
  );
  const releaseChecklist = readFileSync(
    "docs/development/release-checklist.md",
    "utf8",
  );

  assert.match(
    packageJson,
    /"visual:references": "node scripts\/page-builder-visual-import-references\.mjs"/,
  );
  assert.match(
    packageJson,
    /"visual:references:check": "node scripts\/page-builder-visual-import-references\.mjs --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output reports\/visual\/page-builder-fixture\/visual-reference-import-report\.json --markdown-output reports\/visual\/page-builder-fixture\/visual-reference-import-report\.md --require-complete"/,
  );
  assert.match(cli, /pnpm visual:references:check/);
  assert.match(cli, /--markdown-output <path>/);
  assert.match(cli, /--json/);
  assert.match(cli, /--output <path>/);
  assert.match(cli, /defaults to docs\/visual\/page-builder-references/);
  assert.match(
    cli,
    /visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output/,
  );
  assert.match(readme, /pnpm visual:references -- --manifest/);
  assert.match(readme, /pnpm visual:references` 会读取该目录/);
  assert.match(readme, /visual-reference-import-report\.json/);
  assert.match(readme, /visual-reference-import-report\.md/);
  assert.match(readme, /missing\[\]\.expectedPath/);
  assert.match(readme, /previewScreenshot/);
  assert.match(readme, /PNG 尺寸/);
  assert.match(
    readme,
    /--manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/,
  );
  assert.match(acceptanceDoc, /pnpm visual:references -- --manifest/);
  assert.match(acceptanceDoc, /visual-reference-import-report\.json/);
  assert.match(acceptanceDoc, /visual-reference-import-report\.md/);
  assert.match(acceptanceDoc, /expectedPath/);
  assert.match(acceptanceDoc, /previewScreenshot\.width/);
  assert.match(acceptanceDoc, /default\s+source directory is/);
  assert.match(
    acceptanceDoc,
    /--manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/,
  );
  assert.match(releaseChecklist, /pnpm visual:references -- --manifest/);
  assert.match(releaseChecklist, /visual-reference-import-report\.json/);
  assert.match(releaseChecklist, /visual-reference-import-report\.md/);
  assert.match(
    releaseChecklist,
    /--manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/,
  );
});

function createManifest({ accepted }) {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: accepted ? "accepted" : "needs-evidence",
      viewports: {
        desktop: createViewport(component, "desktop", accepted),
        mobile: createViewport(component, "mobile", accepted),
      },
    })),
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

function createViewport(component, viewport, accepted) {
  return {
    designReference: `docs/old/${component}-${viewport}.png`,
    maxColorDeltaE: accepted ? 2 : null,
    maxLayoutDeltaPx: accepted ? 4 : null,
    previewScreenshot: `artifacts/visual/${component}-${viewport}.png`,
    status: accepted ? "accepted" : "needs-evidence",
    visualMatchPercent: accepted ? 98 : null,
  };
}

function createFixtureRoot() {
  return mkdtempSync(path.join(tmpdir(), "visual-reference-import-"));
}

function writeReferenceFiles(root, options = {}) {
  const sourceDir = path.join(root, "docs/visual/page-builder-references");
  writeReferenceFilesToDir(sourceDir, options);
}

function writePreviewScreenshotFiles(root) {
  const outputDir = path.join(root, "artifacts/visual");
  mkdirSync(outputDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      writeFileSync(
        path.join(outputDir, `${component}-${viewport}.png`),
        createTestPng(3, 2),
      );
    }
  }
}

function writeReferenceFilesToDir(sourceDir, options = {}) {
  mkdirSync(sourceDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of ["desktop", "mobile"]) {
      const fileName = `${component}-${viewport}.png`;

      if (fileName !== options.skip) {
        const body =
          options.override?.fileName === fileName
            ? options.override.body
            : createTestPng(2, 1);
        writeFileSync(path.join(sourceDir, fileName), body);
      }
    }
  }
}
