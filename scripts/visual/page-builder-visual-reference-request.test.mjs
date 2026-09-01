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
  assert.match(markdown, /Export real PNGs from the approved design source/);
  assert.match(
    markdown,
    /hero-banner\.desktop; missing; preview `reports\/visual\/page-builder-fixture\/page-builder-visual-fixture-hero-banner-desktop\.png` \(1440x1000\)/,
  );
  assert.match(markdown, /faq\.mobile; ready/);
  assert.match(markdown, /pnpm visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete/);
  assert.match(markdown, /pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete/);
  assert.match(markdown, /pnpm visual:acceptance -- --require-accepted reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/);
});

test("visual reference request CLI writes a Markdown handoff", async () => {
  const root = `reports/visual/reference-request-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const sourceDir = `${root}/references`;
  const outputPath = `${root}/page-builder-reference-request.md`;
  const missingOutputPath = `${root}/page-builder-missing-references.txt`;
  const stdout = [];

  try {
    writeReferenceFiles(sourceDir, { skip: "spec-table-mobile.png" });
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
        stdout: (line) => stdout.push(line),
      },
    );
    const markdown = readFileSync(outputPath, "utf8");
    const missingPaths = readFileSync(missingOutputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /Visual reference request written:/);
    assert.match(
      stdout.join("\n"),
      /Visual missing reference paths written:/,
    );
    assert.match(stdout.join("\n"), /Missing references: 1\/12/);
    assert.match(
      stdout.join("\n"),
      /First missing reference: reports\/visual\/reference-request-.+\/references\/spec-table-mobile\.png/,
    );
    assert.match(markdown, /spec-table\.mobile; missing/);
    assert.equal(missingPaths, `${sourceDir}/spec-table-mobile.png\n`);
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
    ]),
    {
      manifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      missingOutputPath: "artifacts/visual/page-builder-missing-references.txt",
      outputPath: "artifacts/visual/page-builder-reference-request.md",
      sourceDir: "docs/visual/page-builder-references",
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

test("visual reference request command is exposed in package and docs", () => {
  const packageJson = readFileSync("package.json", "utf8");
  const requestCli = readFileSync(
    "scripts/page-builder-visual-reference-request.mjs",
    "utf8",
  );
  const readme = readFileSync("README.md", "utf8");
  const acceptanceDoc = readFileSync(
    "docs/development/page-builder-visual-acceptance.md",
    "utf8",
  );
  const releaseChecklist = readFileSync(
    "docs/development/release-checklist.md",
    "utf8",
  );
  const setupDoc = readFileSync("docs/development/setup.md", "utf8");
  const referenceReadme = readFileSync(
    "docs/visual/page-builder-references/README.md",
    "utf8",
  );

  assert.match(packageJson, /"visual:references:request"/);
  assert.match(
    packageJson,
    /--missing-output artifacts\/visual\/page-builder-missing-references\.txt/,
  );
  assert.match(requestCli, /pnpm visual:references:request/);
  assert.match(requestCli, /--missing-output <path>/);
  assert.match(readme, /pnpm visual:references:request/);
  assert.match(readme, /page-builder-missing-references\.txt/);
  assert.match(readme, /终端摘要和 Markdown 状态行.*First missing reference/);
  assert.match(acceptanceDoc, /terminal\s+and Markdown `First missing reference`/);
  assert.match(acceptanceDoc, /page-builder-missing-references\.txt/);
  assert.match(releaseChecklist, /first missing reference path/);
  assert.match(releaseChecklist, /page-builder-missing-references\.txt/);
  assert.match(setupDoc, /terminal summary and Markdown status.*First missing reference/s);
  assert.match(setupDoc, /page-builder-missing-references\.txt/);
  assert.match(referenceReadme, /pnpm visual:references:request/);
  assert.match(referenceReadme, /page-builder-missing-references\.txt/);
  assert.match(referenceReadme, /--output <path>/);
  assert.match(referenceReadme, /--missing-output <path>/);
  assert.match(referenceReadme, /first missing reference path/);
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

function createManifest() {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "needs-evidence",
      viewports: Object.fromEntries(
        pageBuilderVisualAcceptanceViewports.map((viewport) => [
          viewport,
          createViewport(component, viewport),
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

function createViewport(component, viewport) {
  return {
    designReference: null,
    maxColorDeltaE: null,
    maxLayoutDeltaPx: null,
    previewScreenshot: `artifacts/visual/${component}-${viewport}.png`,
    status: "needs-evidence",
    visualMatchPercent: null,
  };
}
