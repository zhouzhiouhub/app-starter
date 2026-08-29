import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseNotesMarkdown,
  readReleaseNotesCliConfig,
} from "./release-notes.mjs";
import { createReadySmokeSource } from "./release-notes-test-fixtures.mjs";

test("release notes reject mismatched smoke source workflow run", () => {
  assert.throws(
    () =>
      createReleaseNotesMarkdown(createReleaseNotesConfig(), {
        releaseReady: true,
        smoke: {
          source: {
            ...createReadySmokeSource(),
            workflowRunUrl:
              "https://github.com/zhouzhiouhub/app-starter/actions/runs/987654321",
          },
        },
      }),
    /workflow run URL must match smoke\.source\.workflowRunUrl/,
  );
});

test("release notes reject mismatched smoke artifact run number", () => {
  assert.throws(
    () =>
      createReleaseNotesMarkdown(
        {
          ...createReleaseNotesConfig(),
          smokeArtifact: "production-smoke-report-999",
        },
        createReadyReleaseArtifact(),
      ),
    /smoke artifact must match smoke\.source\.runNumber/,
  );
});

test("release notes reject mismatched project status artifact run number", () => {
  assert.throws(
    () =>
      createReleaseNotesMarkdown(
        {
          ...createReleaseNotesConfig(),
          projectStatusArtifact: "project-status-999",
        },
        createReadyReleaseArtifact(),
      ),
    /project status artifact must match smoke\.source\.runNumber/,
  );
});

test("release notes reject mismatched preflight artifact run number", () => {
  assert.throws(
    () =>
      createReleaseNotesMarkdown(
        {
          ...createReleaseNotesConfig(),
          preflightArtifact: "release-preflight-999",
        },
        createReadyReleaseArtifact(),
      ),
    /preflight artifact must match smoke\.source\.runNumber/,
  );
});

function createReadyReleaseArtifact() {
  return {
    releaseReady: true,
    smoke: {
      source: createReadySmokeSource(),
    },
  };
}

function createReleaseNotesConfig() {
  return readReleaseNotesCliConfig([
    "--release-tag",
    "v0.1.0",
    "--workflow-run-url",
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
    "--smoke-artifact",
    "production-smoke-report-123",
    "--preflight-artifact",
    "release-preflight-123",
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
  ]);
}
