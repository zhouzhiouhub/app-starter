import assert from "node:assert/strict";
import test from "node:test";
import {
  createProductionSmokeWorkflowArtifactsSummary,
  validateProductionSmokeWorkflowArtifacts,
} from "./production-smoke-release-artifacts.mjs";
import { validateProductionSmokeReleaseInputs } from "./production-smoke-release-inputs.mjs";

test("production smoke workflow artifact summary normalizes paths", () => {
  const env = {
    PROJECT_STATUS_ARTIFACT_PATH: "reports/release/project-status.json",
    PROJECT_STATUS_MARKDOWN_PATH: "reports/release/project-status.md",
    RELEASE_CHECK_ARTIFACT_PATH: "reports/release/release-check.json",
    RELEASE_CHECK_MARKDOWN_PATH: "reports/release/release-check.md",
    RELEASE_NOTES_PATH: "reports/release/release-notes.md",
    SMOKE_REPORT_MARKDOWN_PATH: "reports/production-smoke/smoke-report.md",
    SMOKE_REPORT_PATH: "reports/production-smoke/smoke-report.json",
  };
  const result = validateProductionSmokeReleaseInputs(env);

  assert.deepEqual(
    result.workflowArtifacts,
    createProductionSmokeWorkflowArtifactsSummary(env),
  );
  assert.equal(
    result.workflowArtifacts.paths.smokeReportJson,
    "reports/production-smoke/smoke-report.json",
  );
});

test("production smoke workflow artifact validation rejects unsafe paths", () => {
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        SMOKE_REPORT_PATH: "README.md",
      }),
    /SMOKE_REPORT_PATH must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        SMOKE_REPORT_MARKDOWN_PATH:
          "artifacts/production-smoke/smoke-report.json",
      }),
    /Smoke report Markdown must end with \.md/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        RELEASE_CHECK_ARTIFACT_PATH: "release-check.json",
      }),
    /Release check artifact must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        RELEASE_CHECK_MARKDOWN_PATH: "artifacts/release/release-check.json",
      }),
    /Release check Markdown must end with \.md/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        PROJECT_STATUS_ARTIFACT_PATH: "reports/release/project-status.txt",
      }),
    /Project status artifact must end with \.json/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        PROJECT_STATUS_MARKDOWN_PATH: "README.md",
      }),
    /Project status Markdown must use safe path segments/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        PROJECT_STATUS_MARKDOWN_PATH: "artifacts/release/project-status.txt",
      }),
    /Project status Markdown must end with \.md/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        RELEASE_NOTES_PATH: "README.md",
      }),
    /Release notes output must use safe path segments/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        RELEASE_NOTES_PATH: "artifacts/release/release-notes.txt",
      }),
    /Release notes output must end with \.md/,
  );
});

test("production smoke workflow artifact summary normalizes names", () => {
  const env = {
    PROJECT_STATUS_ARTIFACT_NAME: "project-status-123",
    RELEASE_CHECK_ARTIFACT_NAME: "release-evidence-check-123",
    RELEASE_NOTES_ARTIFACT_NAME: "release-notes-123",
    RELEASE_PREFLIGHT_ARTIFACT_NAME: "release-preflight-123",
    SMOKE_REPORT_ARTIFACT_NAME: "production-smoke-report-123",
  };
  const result = validateProductionSmokeReleaseInputs(env);

  assert.deepEqual(
    result.workflowArtifacts,
    createProductionSmokeWorkflowArtifactsSummary(env),
  );
  assert.equal(
    result.workflowArtifacts.artifactNames.releasePreflight,
    "release-preflight-123",
  );
});

test("production smoke workflow artifact validation rejects unsafe names", () => {
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        SMOKE_REPORT_ARTIFACT_NAME: "smoke report",
      }),
    /Smoke report artifact must use 1-160 safe characters/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        RELEASE_CHECK_ARTIFACT_NAME: "release/evidence",
      }),
    /Release check artifact must use 1-160 safe characters/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        PROJECT_STATUS_ARTIFACT_NAME: "",
      }),
    /Project status artifact is required/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        RELEASE_NOTES_ARTIFACT_NAME: "release-notes?",
      }),
    /Release notes artifact must use 1-160 safe characters/,
  );
  assert.throws(
    () =>
      validateProductionSmokeWorkflowArtifacts({
        RELEASE_PREFLIGHT_ARTIFACT_NAME: "release preflight",
      }),
    /Release preflight artifact must use 1-160 safe characters/,
  );
});
