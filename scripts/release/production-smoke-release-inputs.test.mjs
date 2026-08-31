import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  runProductionSmokeReleaseInputsCli,
  validateProductionSmokeReleaseInputs,
} from "./production-smoke-release-inputs.mjs";
import {
  createProductionSmokeWorkflowArtifactsSummary,
} from "./production-smoke-release-artifacts.mjs";

function createDisabledEvidenceResult(env = {}) {
  return {
    releaseNotesAllowBlocked: false,
    releaseNotesEnabled: false,
    visualArtifactDownloadEnabled: false,
    workflowArtifacts: createProductionSmokeWorkflowArtifactsSummary(env),
  };
}

test("production smoke release input preflight accepts disabled optional evidence", () => {
  const env = {
    RELEASE_ROLLBACK_TARGET: "",
    RELEASE_TAG: "",
    RELEASE_VISUAL_ARTIFACT_NAME: "",
    RELEASE_VISUAL_ARTIFACT_RUN_ID: "",
  };
  const result = validateProductionSmokeReleaseInputs(env);

  assert.deepEqual(result, createDisabledEvidenceResult(env));
});

test("production smoke release input preflight validates smoke runtime inputs", () => {
  const env = {
    SMOKE_REQUIRE_ADMIN_APP: "true",
    SMOKE_REQUIRE_R2_UPLOAD: "false",
    SMOKE_REQUIRE_REVALIDATION: "yes",
    SMOKE_STOREFRONT_HOST: " Store.Brand-Platform.com:443 ",
  };

  assert.deepEqual(
    validateProductionSmokeReleaseInputs(env),
    createDisabledEvidenceResult(env),
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_STOREFRONT_HOST: "https://store.brand-platform.com",
      }),
    /SMOKE_STOREFRONT_HOST must be a safe storefront host/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_REQUIRE_ADMIN_APP: "enabled",
      }),
    /SMOKE_REQUIRE_ADMIN_APP must be true or false/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_REQUIRE_R2_UPLOAD: "maybe",
      }),
    /SMOKE_REQUIRE_R2_UPLOAD must be true or false/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_REQUIRE_REVALIDATION: "treu",
      }),
    /SMOKE_REQUIRE_REVALIDATION must be true or false/,
  );
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
        RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME: "",
        RELEASE_LOCAL_VERIFICATION_RUN_URL: "",
        RELEASE_VISUAL_ARTIFACT_NAME: "",
        RELEASE_VISUAL_ARTIFACT_RUN_ID: "",
      }),
    /Release notes require release_tag, rollback_target, visual_artifact_name, visual_artifact_run_id, local_verification_run_url, and local_verification_artifact_name together/,
  );
});

test("production smoke release input preflight validates release notes config", () => {
  const env = createReleaseNotesEnv();
  const result = validateProductionSmokeReleaseInputs(env);

  assert.deepEqual(result, {
    releaseNotesAllowBlocked: false,
    releaseNotesEnabled: true,
    visualArtifactDownloadEnabled: true,
    workflowArtifacts: createProductionSmokeWorkflowArtifactsSummary(env),
  });
  assert.equal(
    result.workflowArtifacts.artifactNames.localVerification,
    "local-verification-122",
  );
  assert.deepEqual(
    validateProductionSmokeReleaseInputs({
      ...env,
      RELEASE_NOTES_ALLOW_BLOCKED: "true",
    }),
    {
      releaseNotesAllowBlocked: true,
      releaseNotesEnabled: true,
      visualArtifactDownloadEnabled: true,
      workflowArtifacts: createProductionSmokeWorkflowArtifactsSummary({
        ...env,
        RELEASE_NOTES_ALLOW_BLOCKED: "true",
      }),
    },
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createReleaseNotesEnv(),
        PROJECT_STATUS_ARTIFACT_NAME: "",
      }),
    /Project status artifact is required/,
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
        RELEASE_PREFLIGHT_ARTIFACT_NAME: "",
      }),
    /Release preflight artifact is required/,
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
    /allow_blocked_release_notes requires release_tag, rollback_target, visual_artifact_name, visual_artifact_run_id, local_verification_run_url, and local_verification_artifact_name together/,
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
  const help = stdout.join("\n");
  const expectedVariables =
    "SMOKE_REPORT_PATH SMOKE_REPORT_MARKDOWN_PATH RELEASE_CHECK_ARTIFACT_PATH RELEASE_CHECK_MARKDOWN_PATH RELEASE_NOTES_PATH SMOKE_REPORT_ARTIFACT_NAME RELEASE_CHECK_ARTIFACT_NAME RELEASE_PREFLIGHT_ARTIFACT_NAME RELEASE_VISUAL_ARTIFACT_NAME RELEASE_VISUAL_ARTIFACT_RUN_ID RELEASE_LOCAL_VERIFICATION_RUN_URL RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME PROJECT_STATUS_ARTIFACT_PATH PROJECT_STATUS_ARTIFACT_NAME PROJECT_STATUS_MARKDOWN_PATH RELEASE_NOTES_ARTIFACT_NAME SMOKE_STOREFRONT_HOST SMOKE_REQUIRE_ADMIN_APP SMOKE_REQUIRE_R2_UPLOAD SMOKE_REQUIRE_REVALIDATION RELEASE_NOTES_ALLOW_BLOCKED".split(
      " ",
    );

  assert.match(help, /pnpm release:preflight/);
  for (const variable of expectedVariables) {
    assert.match(help, new RegExp(variable));
  }
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
    RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME: "local-verification-122",
    RELEASE_LOCAL_VERIFICATION_RUN_URL:
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123455",
    RELEASE_CHECK_ARTIFACT_NAME: "release-evidence-check-123",
    RELEASE_CHECK_ARTIFACT_PATH: "artifacts/release/release-check.json",
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
