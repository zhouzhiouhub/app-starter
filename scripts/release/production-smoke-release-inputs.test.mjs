import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionSmokeReleaseInputs } from "./production-smoke-release-inputs.mjs";

test("production smoke release input preflight accepts disabled optional evidence", () => {
  const result = validateProductionSmokeReleaseInputs({
    RELEASE_ROLLBACK_TARGET: "",
    RELEASE_TAG: "",
    RELEASE_VISUAL_ARTIFACT_NAME: "",
    RELEASE_VISUAL_ARTIFACT_RUN_ID: "",
  });

  assert.deepEqual(result, {
    releaseNotesEnabled: false,
    visualArtifactDownloadEnabled: false,
  });
});

test("production smoke release input preflight validates visual artifact pairs", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        RELEASE_VISUAL_ARTIFACT_NAME: "page-builder-visual-fixture-123",
        RELEASE_VISUAL_ARTIFACT_RUN_ID: "",
      }),
    /Provide both visual_artifact_name and visual_artifact_run_id/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        RELEASE_VISUAL_ARTIFACT_NAME: "",
        RELEASE_VISUAL_ARTIFACT_RUN_ID: "123",
      }),
    /Provide both visual_artifact_name and visual_artifact_run_id/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        RELEASE_VISUAL_ARTIFACT_NAME: "page-builder-visual-fixture-123",
        RELEASE_VISUAL_ARTIFACT_RUN_ID: "run-123",
      }),
    /GitHub workflow run id must contain only digits/,
  );
});

test("production smoke release input preflight requires release notes as a group", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        RELEASE_ROLLBACK_TARGET: "",
        RELEASE_TAG: "v0.1.0",
        RELEASE_VISUAL_ARTIFACT_NAME: "",
        RELEASE_VISUAL_ARTIFACT_RUN_ID: "",
      }),
    /Release notes require release_tag, rollback_target, and visual_artifact_name together/,
  );
});

test("production smoke release input preflight validates release notes config", () => {
  const result = validateProductionSmokeReleaseInputs(createReleaseNotesEnv());

  assert.deepEqual(result, {
    releaseNotesEnabled: true,
    visualArtifactDownloadEnabled: true,
  });
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        RELEASE_NOTES_PATH: "README.md",
      }),
    /Release notes output must use safe path segments/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        WEB_URL: "https://example.com",
      }),
    /Storefront URL must use a real production HTTPS host/,
  );
});

function createReleaseNotesEnv() {
  return {
    GITHUB_REPOSITORY: "zhouzhiouhub/app-starter",
    GITHUB_RUN_ID: "123456",
    RELEASE_CHECK_ARTIFACT_NAME: "release-evidence-check-123",
    RELEASE_CHECK_ARTIFACT_PATH: "artifacts/release/release-check.json",
    RELEASE_NOTES_PATH: "artifacts/release/release-notes.md",
    RELEASE_ROLLBACK_TARGET: "main@abcdef1",
    RELEASE_STOREFRONT_URL: "",
    RELEASE_TAG: "v0.1.0",
    RELEASE_VISUAL_ARTIFACT_NAME: "page-builder-visual-fixture-123",
    RELEASE_VISUAL_ARTIFACT_RUN_ID: "123",
    SMOKE_REPORT_ARTIFACT_NAME: "production-smoke-report-123",
    WEB_URL: "https://store.brand.com",
  };
}
