import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  formatPageBuilderVisualReferenceImportReport,
  createPageBuilderVisualReferenceImportMarkdown,
  importPageBuilderVisualReferences,
  normalizeVisualReferenceSourceDir,
  readPageBuilderVisualReferenceImportCliConfig,
} from "./page-builder-visual-reference-import.mjs";
import { runPageBuilderVisualReferenceImportCli } from "../page-builder-visual-import-references.mjs";
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
      "--write",
      "--require-complete",
    ]),
    {
      manifestPath: "reports/visual/manifest.json",
      markdownOutputPath:
        "reports/visual/page-builder-fixture/visual-reference-import-report.md",
      requireComplete: true,
      sourceDir: "docs/visual/page-builder-references",
      write: true,
    },
  );
  assert.equal(
    normalizeVisualReferenceSourceDir("./artifacts/visual/references"),
    "artifacts/visual/references",
  );
  assert.equal(
    normalizeVisualReferenceSourceDir(String.raw`docs\\visual\\page-builder-references\\`),
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
});

test("visual reference import previews complete manifest updates", () => {
  const root = createFixtureRoot();
  const manifest = createManifest({ accepted: true });
  writeReferenceFiles(root);
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
  assert.equal(
    manifest.records[0].viewports.desktop.designReference,
    "docs/old/hero-banner-desktop.png",
  );
  assert.match(lines, /References updated: 12/);
  assert.match(lines, /Next: rerun with --write/);
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
  const report = importPageBuilderVisualReferences(
    {
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      requireComplete: true,
      sourceDir: "docs/visual/page-builder-references",
      write: false,
    },
    { cwd: root, manifest },
  );

  assert.equal(report.status, "invalid");
  assert.equal(report.missing.length, 1);
  assert.deepEqual(report.missing[0], {
    component: "faq",
    reason: "faq-mobile.png is missing",
    viewport: "mobile",
  });
});

test("visual reference import Markdown lists missing references", () => {
  const root = createFixtureRoot();
  const manifest = createManifest({ accepted: false });
  writeReferenceFiles(root, { skip: "faq-mobile.png" });
  const report = importPageBuilderVisualReferences(
    {
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      markdownOutputPath:
        "reports/visual/page-builder-fixture/visual-reference-import-report.md",
      requireComplete: true,
      sourceDir: "docs/visual/page-builder-references",
      write: false,
    },
    { cwd: root, manifest },
  );
  const markdown = createPageBuilderVisualReferenceImportMarkdown(report);

  assert.match(markdown, /^# Page Builder Visual Reference Import/m);
  assert.match(markdown, /Status: `invalid`/);
  assert.match(markdown, /References updated: 11/);
  assert.match(markdown, /Missing references: 1/);
  assert.match(markdown, /## Missing References/);
  assert.match(
    markdown,
    /faq\.mobile: faq-mobile\.png is missing; expected `docs\/visual\/page-builder-references\/faq-mobile\.png`/,
  );
  assert.match(
    markdown,
    /pnpm visual:references -- --source-dir docs\/visual\/page-builder-references --write --require-complete/,
  );
});

test("visual reference import CLI writes Markdown output", async () => {
  const sourceDir = `reports/visual/reference-import-${process.pid}-${Date.now()}`;
  const outputPath = `${sourceDir}/visual-reference-import-report.md`;
  const stdout = [];
  const originalConsoleLog = console.log;

  console.log = (line) => stdout.push(line);

  try {
    writeReferenceFilesToDir(sourceDir);

    const exitCode = await runPageBuilderVisualReferenceImportCli([
      "--source-dir",
      sourceDir,
      "--markdown-output",
      outputPath,
    ]);
    const markdown = readFileSync(outputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(markdown, /^# Page Builder Visual Reference Import/m);
    assert.match(markdown, /Status: `would-update`/);
    assert.match(markdown, /hero-banner\.desktop/);
    assert.match(
      stdout.join("\n"),
      new RegExp(
        `Visual reference import Markdown written: ${escapeRegExp(outputPath)}`,
      ),
    );
  } finally {
    console.log = originalConsoleLog;
    rmSync(sourceDir, { force: true, recursive: true });
  }
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
  assert.match(cli, /--markdown-output <path>/);
  assert.match(readme, /pnpm visual:references -- --source-dir/);
  assert.match(readme, /visual-reference-import-report\.md/);
  assert.match(acceptanceDoc, /pnpm visual:references -- --source-dir/);
  assert.match(acceptanceDoc, /visual-reference-import-report\.md/);
  assert.match(releaseChecklist, /pnpm visual:references -- --source-dir/);
  assert.match(releaseChecklist, /visual-reference-import-report\.md/);
});

test("visual reference intake directory documents every required file", () => {
  const readmePath = "docs/visual/page-builder-references/README.md";

  assert.equal(existsSync(readmePath), true);

  const referenceReadme = readFileSync(readmePath, "utf8");

  assert.match(referenceReadme, /real Page Builder design\s+reference PNGs/);
  assert.match(
    referenceReadme,
    /visual:references -- --source-dir docs\/visual\/page-builder-references --markdown-output reports\/visual\/page-builder-fixture\/visual-reference-import-report\.md/,
  );
  assert.match(
    referenceReadme,
    /visual:references -- --source-dir docs\/visual\/page-builder-references --write --require-complete/,
  );

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      assert.match(
        referenceReadme,
        new RegExp(`${component}-${viewport}\\.png`, "u"),
      );
    }
  }
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

function writeReferenceFilesToDir(sourceDir, options = {}) {
  mkdirSync(sourceDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of ["desktop", "mobile"]) {
      const fileName = `${component}-${viewport}.png`;

      if (fileName !== options.skip) {
        writeFileSync(path.join(sourceDir, fileName), Buffer.from("png"));
      }
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
