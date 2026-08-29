import assert from "node:assert/strict";
import test from "node:test";
import { readReleaseNotesCliConfig } from "./release-notes.mjs";

test("release notes config parses required release evidence fields", () => {
  assert.deepEqual(
    readReleaseNotesCliConfig([
      "--",
      "--release-tag",
      "v0.1.0",
      "--workflow-run-url",
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123",
      "--smoke-artifact",
      "production-smoke-report-123",
      "--release-artifact",
      "release-evidence-check-123",
      "--project-status",
      "artifacts/release/project-status.json",
      "--project-status-artifact",
      "project-status-123",
      "--visual-artifact",
      "page-builder-visual-fixture-123",
      "--storefront-url",
      "https://store.brand.com",
      "--rollback-target",
      "main@abcdef1",
      "--release-check",
      "artifacts/release/release-check.json",
      "--output",
      "docs/releases/v0.1.0.md",
    ]),
    {
      allowBlocked: false,
      outputPath: "docs/releases/v0.1.0.md",
      projectStatusArtifact: "project-status-123",
      projectStatusPath: "artifacts/release/project-status.json",
      releaseArtifact: "release-evidence-check-123",
      releaseCheckPath: "artifacts/release/release-check.json",
      releaseTag: "v0.1.0",
      rollbackTarget: "main@abcdef1",
      smokeArtifact: "production-smoke-report-123",
      storefrontUrl: "https://store.brand.com/",
      visualArtifact: "page-builder-visual-fixture-123",
      workflowRunUrl:
        "https://github.com/zhouzhiouhub/app-starter/actions/runs/123",
    },
  );
});

test("release notes config rejects unsafe release record values", () => {
  assert.throws(
    () => readReleaseNotesCliConfig(["--release-tag", "v0.1.0"]),
    /Release artifact is required/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--workflow-run-url",
        "https://example.com/actions/runs/123",
      ]),
    /Workflow run URL must be a GitHub Actions run URL/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--storefront-url",
        "https://example.com",
      ]),
    /Storefront URL must use a real production HTTPS host/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--smoke-artifact",
        "production smoke",
      ]),
    /Smoke artifact must use 1-160 safe characters/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--project-status-artifact",
        "project status",
      ]),
    /Project status artifact must use 1-160 safe characters/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--project-status",
        "artifacts/release/project-status.md",
      ]),
    /Project status artifact must end with \.json/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--output",
        "README.md",
      ]),
    /Release notes output must use safe path segments/,
  );
});

function createRequiredArgs() {
  return [
    "--release-tag",
    "v0.1.0",
    "--workflow-run-url",
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
    "--smoke-artifact",
    "production-smoke-report-123",
    "--release-artifact",
    "release-evidence-check-123",
    "--project-status-artifact",
    "project-status-123",
    "--visual-artifact",
    "page-builder-visual-fixture-123",
    "--storefront-url",
    "https://store.brand.com",
    "--rollback-target",
    "main@abcdef1",
  ];
}
