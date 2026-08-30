import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeVisualArtifactCheckOutputPath,
  normalizeVisualArtifactCheckMarkdownOutputPath,
  readPageBuilderVisualArtifactCheckCliConfig,
} from "./page-builder-visual-artifact-check.mjs";

test("visual artifact check config parses safe artifact directories", () => {
  assert.deepEqual(readPageBuilderVisualArtifactCheckCliConfig([]), {
    artifactDir: "reports/visual/page-builder-fixture",
    json: false,
    markdownOutputPath: null,
    outputPath: null,
  });
  assert.deepEqual(
    readPageBuilderVisualArtifactCheckCliConfig([
      "--",
      "--artifact-dir",
      "artifacts/visual/page-builder-fixture",
      "--output",
      "artifacts/visual/page-builder-fixture/visual-artifact-check-report.json",
      "--markdown-output",
      "artifacts/visual/page-builder-fixture/visual-artifact-check-report.md",
      "--json",
    ]),
    {
      artifactDir: "artifacts/visual/page-builder-fixture",
      json: true,
      markdownOutputPath:
        "artifacts/visual/page-builder-fixture/visual-artifact-check-report.md",
      outputPath:
        "artifacts/visual/page-builder-fixture/visual-artifact-check-report.json",
    },
  );
  assert.deepEqual(
    readPageBuilderVisualArtifactCheckCliConfig([
      "--artifact-dir",
      String.raw`reports\\visual\\page-builder-fixture`,
      "--markdown-output",
      String.raw`reports\\visual\\page-builder-fixture\\visual-artifact-check-report.md`,
    ]),
    {
      artifactDir: "reports/visual/page-builder-fixture",
      json: false,
      markdownOutputPath:
        "reports/visual/page-builder-fixture/visual-artifact-check-report.md",
      outputPath: null,
    },
  );
});

test("visual artifact check config rejects unsafe Markdown paths", () => {
  assert.equal(
    normalizeVisualArtifactCheckOutputPath(
      "reports\\visual\\page-builder-fixture\\visual-artifact-check-report.json",
    ),
    "reports/visual/page-builder-fixture/visual-artifact-check-report.json",
  );
  assert.equal(
    normalizeVisualArtifactCheckMarkdownOutputPath(
      "reports\\visual\\page-builder-fixture\\visual-artifact-check-report.md",
    ),
    "reports/visual/page-builder-fixture/visual-artifact-check-report.md",
  );
  assert.throws(
    () =>
      readPageBuilderVisualArtifactCheckCliConfig([
        "--artifact-dir",
        "tmp/page-builder-fixture",
      ]),
    /must live under artifacts\/visual or reports\/visual/,
  );
  assert.throws(
    () =>
      readPageBuilderVisualArtifactCheckCliConfig([
        "--output",
        "docs/visual/page-builder-fixture/visual-artifact-check-report.json",
      ]),
    /Visual artifact check output must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
  assert.throws(
    () =>
      readPageBuilderVisualArtifactCheckCliConfig([
        "--markdown-output",
        "reports/visual/page-builder-fixture/visual-artifact-check-report.json",
      ]),
    /Visual artifact check Markdown must end with \.md/,
  );
});
