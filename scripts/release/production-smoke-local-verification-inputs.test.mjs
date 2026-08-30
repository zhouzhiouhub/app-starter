import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionSmokeReleaseInputs } from "./production-smoke-release-inputs.mjs";

test("production smoke preflight accepts omitted local verification inputs", () => {
  assert.deepEqual(
    validateProductionSmokeReleaseInputs({
      RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME: "",
      RELEASE_LOCAL_VERIFICATION_RUN_URL: "",
    }),
    {
      releaseNotesAllowBlocked: false,
      releaseNotesEnabled: false,
      visualArtifactDownloadEnabled: false,
    },
  );
});

test("production smoke preflight validates local verification release notes evidence", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME: "release-evidence-check-123",
      }),
    /Local verification artifact must use the local-verification-<run_number> naming pattern/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        RELEASE_LOCAL_VERIFICATION_RUN_URL:
          "https://github.com/zhouzhiouhub/app-starter/pulls/1",
      }),
    /Workflow run URL must be a GitHub Actions run URL/,
  );
});

function createReleaseNotesEnv() {
  return {
    GITHUB_REPOSITORY: "zhouzhiouhub/app-starter",
    GITHUB_RUN_ID: "123456",
    PROJECT_STATUS_ARTIFACT_NAME: "project-status-123",
    PROJECT_STATUS_ARTIFACT_PATH: "artifacts/release/project-status.json",
    RELEASE_CHECK_ARTIFACT_NAME: "release-evidence-check-123",
    RELEASE_CHECK_ARTIFACT_PATH: "artifacts/release/release-check.json",
    RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME: "local-verification-122",
    RELEASE_LOCAL_VERIFICATION_RUN_URL:
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123455",
    RELEASE_NOTES_PATH: "artifacts/release/release-notes.md",
    RELEASE_PREFLIGHT_ARTIFACT_NAME: "release-preflight-123",
    RELEASE_ROLLBACK_TARGET: "main@abcdef1",
    RELEASE_STOREFRONT_URL: "",
    RELEASE_TAG: "v0.1.0",
    RELEASE_VISUAL_ARTIFACT_NAME: "page-builder-visual-fixture-123",
    RELEASE_VISUAL_ARTIFACT_RUN_ID: "123",
    SMOKE_REPORT_ARTIFACT_NAME: "production-smoke-report-123",
    WEB_URL: "https://store.brand.com",
  };
}
