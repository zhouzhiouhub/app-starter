import assert from "node:assert/strict";
import test from "node:test";
import { readReleaseCheckCliConfig } from "./release-check.mjs";

test("release check config parses defaults and evidence paths", () => {
  assert.deepEqual(readReleaseCheckCliConfig([]), {
    checklist: false,
    json: false,
    outputPath: null,
    smokeReportPath: null,
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });
  assert.deepEqual(
    readReleaseCheckCliConfig([
      "--",
      "--smoke-report",
      "artifacts/production-smoke/smoke-report.json",
      "--visual-manifest",
      "reports/visual/accepted.json",
      "--checklist",
    ]),
    {
      checklist: true,
      json: false,
      outputPath: null,
      smokeReportPath: "artifacts/production-smoke/smoke-report.json",
      visualManifestPath: "reports/visual/accepted.json",
    },
  );
  assert.deepEqual(
    readReleaseCheckCliConfig(["artifacts/production-smoke/smoke-report.json"]),
    {
      checklist: false,
      json: false,
      outputPath: null,
      smokeReportPath: "artifacts/production-smoke/smoke-report.json",
      visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
    },
  );
  assert.throws(
    () => readReleaseCheckCliConfig(["--bad-option"]),
    /Unknown release check option/,
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
      checklist: false,
      json: true,
      outputPath: "artifacts/release/release-check.json",
      smokeReportPath: null,
      visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
    },
  );
  assert.throws(
    () => readReleaseCheckCliConfig(["--output", "release-check.json"]),
    /Release check output must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
});
