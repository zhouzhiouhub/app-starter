import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
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
      "--write",
      "--require-complete",
    ]),
    {
      manifestPath: "reports/visual/manifest.json",
      requireComplete: true,
      sourceDir: "docs/visual/page-builder-references",
      write: true,
    },
  );
  assert.equal(
    normalizeVisualReferenceSourceDir("./artifacts/visual/references"),
    "artifacts/visual/references",
  );
  assert.throws(
    () => normalizeVisualReferenceSourceDir("../visual"),
    /safe relative directory/,
  );
  assert.throws(
    () => normalizeVisualReferenceSourceDir("tmp/visual"),
    /safe relative directory/,
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

test("visual reference import command is exposed in docs", () => {
  const packageJson = readFileSync("package.json", "utf8");
  const readme = readFileSync("README.md", "utf8");
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
  assert.match(readme, /pnpm visual:references -- --source-dir/);
  assert.match(acceptanceDoc, /pnpm visual:references -- --source-dir/);
  assert.match(releaseChecklist, /pnpm visual:references -- --source-dir/);
});

test("visual reference intake directory documents every required file", () => {
  const readmePath = "docs/visual/page-builder-references/README.md";

  assert.equal(existsSync(readmePath), true);

  const referenceReadme = readFileSync(readmePath, "utf8");

  assert.match(referenceReadme, /real Page Builder design\s+reference PNGs/);
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
