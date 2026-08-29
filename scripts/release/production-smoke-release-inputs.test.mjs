import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  runProductionSmokeReleaseInputsCli,
  validateProductionSmokeReleaseInputs,
} from "./production-smoke-release-inputs.mjs";

test("production smoke release input preflight accepts disabled optional evidence", () => {
  const result = validateProductionSmokeReleaseInputs({
    RELEASE_ROLLBACK_TARGET: "",
    RELEASE_TAG: "",
    RELEASE_VISUAL_ARTIFACT_NAME: "",
    RELEASE_VISUAL_ARTIFACT_RUN_ID: "",
  });

  assert.deepEqual(result, {
    releaseNotesAllowBlocked: false,
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
    releaseNotesAllowBlocked: false,
    releaseNotesEnabled: true,
    visualArtifactDownloadEnabled: true,
  });
  assert.deepEqual(
    validateProductionSmokeReleaseInputs({
      ...createReleaseNotesEnv(),
      RELEASE_NOTES_ALLOW_BLOCKED: "true",
    }),
    {
      releaseNotesAllowBlocked: true,
      releaseNotesEnabled: true,
      visualArtifactDownloadEnabled: true,
    },
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        PROJECT_STATUS_ARTIFACT_NAME: "",
      }),
    /--project-status-artifact requires a value/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        PROJECT_STATUS_ARTIFACT_NAME: "project status",
      }),
    /Project status artifact must use 1-160 safe characters/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        PROJECT_STATUS_ARTIFACT_PATH: "artifacts/release/project-status.md",
      }),
    /Project status artifact must end with \.json/,
  );
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

test("production smoke release input preflight validates blocked release note drafts", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        RELEASE_NOTES_ALLOW_BLOCKED: "true",
        RELEASE_ROLLBACK_TARGET: "",
        RELEASE_TAG: "",
        RELEASE_VISUAL_ARTIFACT_NAME: "",
        RELEASE_VISUAL_ARTIFACT_RUN_ID: "",
      }),
    /allow_blocked_release_notes requires release_tag, rollback_target, and visual_artifact_name together/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        RELEASE_NOTES_ALLOW_BLOCKED: "yes",
      }),
    /allow_blocked_release_notes must be true or false/,
  );
});

test("production smoke release input preflight CLI prints help", async () => {
  const stdout = [];
  const exitCode = await runProductionSmokeReleaseInputsCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.join("\n"), /pnpm release:preflight/);
  assert.match(stdout.join("\n"), /RELEASE_VISUAL_ARTIFACT_NAME/);
  assert.match(stdout.join("\n"), /PROJECT_STATUS_ARTIFACT_PATH/);
  assert.match(stdout.join("\n"), /PROJECT_STATUS_ARTIFACT_NAME/);
  assert.match(stdout.join("\n"), /RELEASE_NOTES_ALLOW_BLOCKED/);
});

test("production smoke release input preflight CLI rejects unknown options", async () => {
  const stderr = [];
  const exitCode = await runProductionSmokeReleaseInputsCli(["--bad"], {
    env: {},
    stderr: (line) => stderr.push(line),
  });

  assert.equal(exitCode, 1);
  assert.match(
    stderr.join("\n"),
    /Unknown production smoke release input option: --bad/,
  );
});

test("production smoke release input preflight is exposed to package and CI", async () => {
  const [packageJson, ciWorkflow, readme, setupGuide, releaseChecklist] =
    await Promise.all([
      readFile("package.json", "utf8"),
      readFile(".github/workflows/ci.yml", "utf8"),
      readFile("README.md", "utf8"),
      readFile("docs/development/setup.md", "utf8"),
      readFile("docs/development/release-checklist.md", "utf8"),
    ]);

  assert.match(
    packageJson,
    /"release:preflight": "node scripts\/release\/production-smoke-release-inputs\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm release:preflight -- --help/);
  assert.match(readme, /pnpm release:preflight/);
  assert.match(setupGuide, /pnpm release:preflight/);
  assert.match(releaseChecklist, /pnpm release:preflight/);
});

function createReleaseNotesEnv() {
  return {
    GITHUB_REPOSITORY: "zhouzhiouhub/app-starter",
    GITHUB_RUN_ID: "123456",
    PROJECT_STATUS_ARTIFACT_NAME: "project-status-123",
    PROJECT_STATUS_ARTIFACT_PATH: "artifacts/release/project-status.json",
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
