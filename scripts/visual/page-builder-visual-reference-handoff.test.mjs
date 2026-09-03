import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { runPageBuilderVisualReferenceHandoffCli } from "../page-builder-visual-reference-handoff.mjs";
import {
  corruptPngBytes,
  createTestPng,
} from "./page-builder-visual-artifact-check-test-fixtures.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";
import {
  createPageBuilderVisualReferenceHandoffCommand,
  defaultPageBuilderVisualReferenceHandoffOutputDir,
  normalizeVisualReferenceHandoffOutputDir,
  pageBuilderVisualReferenceHandoffSchemaVersion,
  readPageBuilderVisualReferenceHandoffCliConfig,
} from "./page-builder-visual-reference-handoff.mjs";

test("visual reference handoff CLI writes request files and previews", async () => {
  const root = `reports/visual/reference-handoff-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const sourceDir = `${root}/references`;
  const outputDir = `${root}/handoff`;
  const stdout = [];

  try {
    writeReferenceFiles(sourceDir, { skip: "spec-table-mobile.png" });
    writePreviewScreenshotFiles(root);
    writeFileSync(
      manifestPath,
      `${JSON.stringify(createManifest({ previewRoot: root }), null, 2)}\n`,
    );

    const exitCode = await runPageBuilderVisualReferenceHandoffCli(
      [
        "--source-dir",
        sourceDir,
        "--manifest",
        manifestPath,
        "--output-dir",
        outputDir,
      ],
      {
        stdout: (line) => stdout.push(line),
      },
    );
    const handoffManifest = JSON.parse(
      readFileSync(`${outputDir}/page-builder-reference-handoff.json`, "utf8"),
    );
    const exportManifest = JSON.parse(
      readFileSync(
        `${outputDir}/page-builder-reference-export-manifest.json`,
        "utf8",
      ),
    );
    const missingPaths = readFileSync(
      `${outputDir}/page-builder-missing-references.txt`,
      "utf8",
    );
    const request = readFileSync(
      `${outputDir}/page-builder-reference-request.md`,
      "utf8",
    );
    const readme = readFileSync(`${outputDir}/README.md`, "utf8");
    const table = readFileSync(
      `${outputDir}/page-builder-reference-export-table.tsv`,
      "utf8",
    );
    const expectedPreview = createTestPng(3, 2);
    const expectedPreviewSha256 = createHash("sha256")
      .update(expectedPreview)
      .digest("hex");

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /Visual reference handoff package written:/);
    assert.match(stdout.join("\n"), /Visual reference handoff README written:/);
    assert.match(stdout.join("\n"), /Preview screenshots copied: 12\/12/);
    assert.match(stdout.join("\n"), /Missing references: 1\/12/);
    assert.match(
      stdout.join("\n"),
      /First missing reference: reports\/visual\/reference-handoff-.+\/references\/spec-table-mobile\.png/,
    );
    assert.match(
      stdout.join("\n"),
      /First missing preview: reports\/visual\/reference-handoff-.+\/artifacts\/visual\/spec-table-mobile\.png \(3x2\)/,
    );
    assert.equal(
      existsSync(
        `${outputDir}/preview-screenshots/hero-banner-desktop.png`,
      ),
      true,
    );
    assert.equal(
      handoffManifest.schemaVersion,
      pageBuilderVisualReferenceHandoffSchemaVersion,
    );
    assert.equal(handoffManifest.status, "would-update");
    assert.equal(handoffManifest.complete, false);
    assert.equal(handoffManifest.handoffComplete, true);
    assert.equal(handoffManifest.previewCount, 12);
    assert.equal(handoffManifest.missingPreviewCount, 0);
    assert.equal(handoffManifest.missingCount, 1);
    assert.equal(handoffManifest.requiredReferenceCount, 12);
    assert.equal(
      handoffManifest.files.requestMarkdown,
      `${outputDir}/page-builder-reference-request.md`,
    );
    assert.equal(handoffManifest.files.readme, `${outputDir}/README.md`);
    assert.equal(
      handoffManifest.files.previewDir,
      `${outputDir}/preview-screenshots`,
    );
    assert.deepEqual(handoffManifest.previewScreenshots[0], {
      byteSize: expectedPreview.length,
      component: "hero-banner",
      handoffPath:
        `${outputDir}/preview-screenshots/hero-banner-desktop.png`,
      height: 2,
      sha256: expectedPreviewSha256,
      sourcePath: `${root}/artifacts/visual/hero-banner-desktop.png`,
      status: "copied",
      viewport: "desktop",
      width: 3,
    });
    assert.equal(
      exportManifest.schemaVersion,
      "page-builder-visual-reference-export.v1",
    );
    assert.equal(missingPaths, `${sourceDir}/spec-table-mobile.png\n`);
    assert.match(request, /# Page Builder Design Reference Request/);
    assert.match(request, /Do not use fixture screenshots/);
    assert.match(readme, /# Page Builder Visual Reference Handoff/);
    assert.match(readme, /Missing references: `1\/12`/);
    assert.match(
      readme,
      /First missing reference: `reports\/visual\/reference-handoff-.+\/references\/spec-table-mobile\.png`/,
    );
    assert.match(
      readme,
      /First missing preview: `reports\/visual\/reference-handoff-.+\/handoff\/preview-screenshots\/spec-table-mobile\.png \(3x2\)`/,
    );
    assert.match(readme, new RegExp(`sha256 \`${expectedPreviewSha256}\``));
    assert.match(readme, /After Design Delivery/);
    assert.match(table, /^component\tviewport\tfile_name\tstatus/m);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("visual reference handoff marks corrupt copied previews incomplete", async () => {
  const root = `reports/visual/reference-handoff-corrupt-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const sourceDir = `${root}/references`;
  const outputDir = `${root}/handoff`;
  const stdout = [];

  try {
    writeReferenceFiles(sourceDir);
    writePreviewScreenshotFiles(root);
    writeFileSync(
      path.join(root, "artifacts/visual/hero-banner-desktop.png"),
      corruptPngBytes,
    );
    writeFileSync(
      manifestPath,
      `${JSON.stringify(createManifest({ previewRoot: root }), null, 2)}\n`,
    );

    const exitCode = await runPageBuilderVisualReferenceHandoffCli(
      [
        "--source-dir",
        sourceDir,
        "--manifest",
        manifestPath,
        "--output-dir",
        outputDir,
      ],
      {
        stdout: (line) => stdout.push(line),
      },
    );
    const handoffManifest = JSON.parse(
      readFileSync(`${outputDir}/page-builder-reference-handoff.json`, "utf8"),
    );
    const corruptPreview = handoffManifest.previewScreenshots.find(
      (preview) =>
        preview.component === "hero-banner" &&
        preview.viewport === "desktop",
    );

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /Preview screenshots copied: 11\/12/);
    assert.equal(handoffManifest.complete, true);
    assert.equal(handoffManifest.handoffComplete, false);
    assert.equal(handoffManifest.missingPreviewCount, 1);
    assert.equal(handoffManifest.missingCount, 0);
    assert.equal(corruptPreview.status, "missing");
    assert.equal(typeof corruptPreview.reason, "string");
    assert.notEqual(corruptPreview.reason.length, 0);
    assert.equal(corruptPreview.byteSize, undefined);
    assert.equal(corruptPreview.sha256, undefined);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("visual reference handoff command and config normalize safe inputs", () => {
  assert.equal(
    createPageBuilderVisualReferenceHandoffCommand(),
    "pnpm visual:references:handoff",
  );
  assert.equal(
    createPageBuilderVisualReferenceHandoffCommand({
      manifestPath:
        "reports/visual/custom/page-builder-visual-acceptance.json",
      outputDir: "tmp/visual-handoff",
      sourceDir: "artifacts/visual/design-references",
    }),
    "pnpm visual:references:handoff -- --source-dir artifacts/visual/design-references --manifest reports/visual/custom/page-builder-visual-acceptance.json --output-dir tmp/visual-handoff",
  );
  assert.deepEqual(
    readPageBuilderVisualReferenceHandoffCliConfig([
      "--",
      "--source-dir",
      "docs\\visual\\page-builder-references\\",
      "--manifest",
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      "--output-dir",
      "artifacts\\visual\\page-builder-reference-handoff\\",
    ]),
    {
      manifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      outputDir: defaultPageBuilderVisualReferenceHandoffOutputDir,
      sourceDir: "docs/visual/page-builder-references",
    },
  );
  assert.equal(
    normalizeVisualReferenceHandoffOutputDir("./tmp/visual-handoff/"),
    "tmp/visual-handoff",
  );
  assert.throws(
    () => normalizeVisualReferenceHandoffOutputDir("docs/visual/handoff"),
    /must be under artifacts\/, reports\/, tmp\/, or \.tmp\//,
  );
  assert.throws(
    () => normalizeVisualReferenceHandoffOutputDir("artifacts/visual/../x"),
    /safe path segments/,
  );
});

test("visual reference handoff help and docs expose the command", async () => {
  const stdout = [];

  const exitCode = await runPageBuilderVisualReferenceHandoffCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });
  const help = stdout.join("\n");
  const packageJson = readFileSync("package.json", "utf8");
  const readme = readFileSync("README.md", "utf8");
  const setupDoc = readFileSync("docs/development/setup.md", "utf8");
  const releaseChecklist = readFileSync(
    "docs/development/release-checklist.md",
    "utf8",
  );
  const referenceReadme = readFileSync(
    "docs/visual/page-builder-references/README.md",
    "utf8",
  );

  assert.equal(exitCode, 0);
  assert.match(help, /pnpm visual:references:handoff/);
  assert.match(help, /copied preview screenshots/);
  assert.match(help, /matching\s+preview\s+screenshot/i);
  assert.match(help, /handoff README/);
  assert.match(help, /sha256 checksums/);
  assert.match(help, /does not\s+create\s+reference PNGs/i);
  assert.match(packageJson, /"visual:references:handoff"/);
  assert.match(packageJson, /page-builder-reference-handoff/);
  assert.match(readme, /pnpm visual:references:handoff/);
  assert.match(readme, /page-builder-reference-handoff/);
  assert.match(setupDoc, /pnpm visual:references:handoff/);
  assert.match(setupDoc, /handoff README/);
  assert.match(setupDoc, /sha256/);
  assert.match(releaseChecklist, /pnpm visual:references:handoff/);
  assert.match(releaseChecklist, /handoff README/);
  assert.match(releaseChecklist, /sha256/);
  assert.match(referenceReadme, /pnpm visual:references:handoff/);
  assert.match(referenceReadme, /handoff README/);
  assert.match(referenceReadme, /sha256/);
});

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
        createTestPng(3, 2),
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
