import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import test from "node:test";
import {
  checkPageBuilderVisualArtifact,
  formatPageBuilderVisualArtifactCheckReport,
} from "./page-builder-visual-artifact-check.mjs";
import {
  corruptPngBytes,
  createArtifactDir,
  createReferenceImportSummary,
  createTestPng,
  hasIssue,
  readText,
  writeVisualArtifact,
} from "./page-builder-visual-artifact-check-test-fixtures.mjs";

test("visual artifact check accepts a complete fixture artifact", () => {
  const artifactDir = createArtifactDir("complete");

  try {
    writeVisualArtifact(artifactDir);
    const report = checkPageBuilderVisualArtifact({ artifactDir });

    assert.equal(report.status, "complete");
    assert.equal(report.issueCount, 0);
    assert.deepEqual(
      report.referenceImport,
      createReferenceImportSummary(artifactDir),
    );
    assert.equal(report.presentRequiredFileCount, 6);
    assert.equal(report.presentScreenshotCount, 12);
    assert.deepEqual(report.issues, []);
    assert.match(
      formatPageBuilderVisualArtifactCheckReport(report).join("\n"),
      /Issues: 0[\s\S]*Reference import: invalid \(ready source, 12 missing, 0 updates, 12\/12 required\)[\s\S]*Missing reference files: docs\/visual\/page-builder-references\/hero-banner-desktop\.png[\s\S]*Artifact is complete/,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects missing acceptance Markdown", () => {
  const artifactDir = createArtifactDir("missing-acceptance-report");

  try {
    writeVisualArtifact(artifactDir);
    rmSync(`${artifactDir}/visual-acceptance-report.md`);

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(report.presentRequiredFileCount, 5);
    assert.equal(
      report.issues.some(
        (issue) =>
          issue.code === "missing_artifact_file" &&
          issue.message.includes("acceptance Markdown"),
      ),
      true,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects stale acceptance Markdown", () => {
  const artifactDir = createArtifactDir("stale-acceptance-report");

  try {
    writeVisualArtifact(artifactDir, {
      acceptanceMarkdown: [
        "# Page Builder Visual Acceptance",
        "",
        "Manifest: `docs/development/page-builder-visual-acceptance.json`",
        "Status: `accepted`",
        "Components accepted: 6/6",
        "Viewport evidence accepted: 12/12",
        "",
      ].join("\n"),
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "invalid_artifact_markdown"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects missing screenshots", () => {
  const artifactDir = createArtifactDir("missing");
  const missingScreenshot = `${artifactDir}/page-builder-visual-fixture-hero-banner-desktop.png`;

  try {
    writeVisualArtifact(artifactDir);
    rmSync(missingScreenshot);

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "invalid_screenshot_file"), true);
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
      previewOverride: `${artifactDir}/page-builder-visual-fixture-hero-banner-wrong.png`,
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "manifest_screenshot_mismatch"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check command is exposed in package and workflows", () => {
  const packageJson = readText("package.json");
  const ciWorkflow = readText(".github/workflows/ci.yml");
  const pageBuilderWorkflow = readText(
    ".github/workflows/page-builder-visual.yml",
  );
  const productionSmokeWorkflow = readText(
    ".github/workflows/production-smoke.yml",
  );
  const visualDoc = readText(
    "docs/development/page-builder-visual-acceptance.md",
  );
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
    /pnpm visual:artifact-check -- --artifact-dir reports\/visual\/page-builder-fixture --output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.json --markdown-output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.md/,
  );
  assert.match(pageBuilderWorkflow, /visual-artifact-check-report\.json/);
  assert.match(pageBuilderWorkflow, /visual-artifact-check-report\.md/);
  assert.match(pageBuilderWorkflow, /visual-reference-import-report\.json/);
  assert.match(pageBuilderWorkflow, /visual-reference-import-report\.md/);
  assert.match(visualDoc, /pnpm visual:artifact-check/);
  assert.match(releaseChecklist, /pnpm visual:artifact-check/);
});
