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
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";

test("visual reference request Markdown is design-facing", () => {
  const markdown = createPageBuilderVisualReferenceRequestMarkdown({
    complete: false,
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
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
  const sourceDir = `${root}/references`;
  const outputPath = `${root}/page-builder-reference-request.md`;
  const stdout = [];

  try {
    writeReferenceFiles(sourceDir, { skip: "spec-table-mobile.png" });

    const exitCode = await runPageBuilderVisualReferenceRequestCli(
      [
        "--source-dir",
        sourceDir,
        "--manifest",
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
        "--output",
        outputPath,
      ],
      {
        stdout: (line) => stdout.push(line),
      },
    );
    const markdown = readFileSync(outputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /Visual reference request written:/);
    assert.match(stdout.join("\n"), /Missing references: 1\/12/);
    assert.match(markdown, /spec-table\.mobile; missing/);
    assert.match(markdown, /## After Delivery/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
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
    ]),
    {
      manifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
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
});

test("visual reference request command is exposed in package and docs", () => {
  const packageJson = readFileSync("package.json", "utf8");
  const requestCli = readFileSync(
    "scripts/page-builder-visual-reference-request.mjs",
    "utf8",
  );
  const readme = readFileSync("README.md", "utf8");
  const referenceReadme = readFileSync(
    "docs/visual/page-builder-references/README.md",
    "utf8",
  );

  assert.match(packageJson, /"visual:references:request"/);
  assert.match(requestCli, /pnpm visual:references:request/);
  assert.match(readme, /pnpm visual:references:request/);
  assert.match(referenceReadme, /pnpm visual:references:request/);
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
