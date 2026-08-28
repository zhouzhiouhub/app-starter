import assert from "node:assert/strict";
import test from "node:test";
import { readReleaseCheckCliConfig } from "./release-check.mjs";

test("release check config parses defaults and evidence paths", () => {
  assert.deepEqual(readReleaseCheckCliConfig([]), {
    allVisualTasks: false,
    checklist: false,
    json: false,
    outputPath: null,
    smokeReportPath: null,
    visualArtifactDir: null,
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });
  assert.deepEqual(
    readReleaseCheckCliConfig([
      "--",
      "--all-visual-tasks",
      "--smoke-report",
      "artifacts/production-smoke/smoke-report.json",
      "--visual-manifest",
      "reports/visual/accepted.json",
      "--checklist",
    ]),
    {
      allVisualTasks: true,
      checklist: true,
      json: false,
      outputPath: null,
      smokeReportPath: "artifacts/production-smoke/smoke-report.json",
      visualArtifactDir: null,
      visualManifestPath: "reports/visual/accepted.json",
    },
  );
  assert.deepEqual(
    readReleaseCheckCliConfig([
      "--visual-artifact-dir",
      "reports/visual/page-builder-fixture",
    ]),
    {
      allVisualTasks: false,
      checklist: false,
      json: false,
      outputPath: null,
      smokeReportPath: null,
      visualArtifactDir: "reports/visual/page-builder-fixture",
      visualManifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    },
  );
  assert.deepEqual(
    readReleaseCheckCliConfig([
      "--visual-artifact-dir",
      "reports/visual/page-builder-fixture",
      "--visual-manifest",
      "reports/visual/accepted.json",
    ]),
    {
      allVisualTasks: false,
      checklist: false,
      json: false,
      outputPath: null,
      smokeReportPath: null,
      visualArtifactDir: "reports/visual/page-builder-fixture",
      visualManifestPath: "reports/visual/accepted.json",
    },
  );
  assert.deepEqual(
    readReleaseCheckCliConfig(["artifacts/production-smoke/smoke-report.json"]),
    {
      allVisualTasks: false,
      checklist: false,
      json: false,
      outputPath: null,
      smokeReportPath: "artifacts/production-smoke/smoke-report.json",
      visualArtifactDir: null,
      visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
    },
  );
  assert.throws(
    () => readReleaseCheckCliConfig(["--bad-option"]),
    /Unknown release check option/,
  );
  assert.throws(
    () =>
      readReleaseCheckCliConfig([
        "--visual-artifact-dir",
        "tmp/page-builder-fixture",
      ]),
    /must live under artifacts\/visual or reports\/visual/,
  );
});

test("release check config parses JSON artifact output", () => {
  assert.deepEqual(
    readReleaseCheckCliConfig([
      "--json",
      "--output",
      "artifacts/release/release-check.json",
    ]),
    {
      allVisualTasks: false,
      checklist: false,
      json: true,
      outputPath: "artifacts/release/release-check.json",
      smokeReportPath: null,
      visualArtifactDir: null,
      visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
    },
  );
  assert.throws(
    () => readReleaseCheckCliConfig(["--output", "release-check.json"]),
    /Release check output must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
});
